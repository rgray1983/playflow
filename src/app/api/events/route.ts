import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type CreateEventPayload = {
  eventTypeId?: string;
  packageId?: string;
  packageName?: string;
  title?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  guestOfHonor?: string;
  parentFirstName?: string;
  parentLastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  packagePrice?: number;
  depositAmount?: number;
  balanceDue?: number;
  depositStatus?: "pending" | "cash" | "card" | "waived";
  addOns?: { id: string; name: string; price: number }[];
};

async function getTenant() {
  const palmettoTenant = await prisma.tenant.findUnique({ where: { slug: "palmetto-playhouse" } });
  if (palmettoTenant) return palmettoTenant;
  return prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
}

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

function toDecimal(value: unknown) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(0);
  const parsed = Number(value);
  return new Prisma.Decimal(Number.isFinite(parsed) ? parsed : 0);
}

function parseEventDate(value: string | undefined) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function combineDateAndTime(dateValue: string | undefined, timeValue: string | undefined) {
  const date = parseEventDate(dateValue);
  const cleanTime = timeValue?.trim() || "12:00 PM";
  const parsed = new Date(`${date.toDateString()} ${cleanTime}`);
  return Number.isNaN(parsed.getTime()) ? date : parsed;
}

function addDuration(startTime: Date, minutes = 120) {
  return new Date(startTime.getTime() + minutes * 60 * 1000);
}

function toPaymentMethod(value: CreateEventPayload["depositStatus"]) {
  if (value === "cash") return "CASH";
  if (value === "card") return "CARD";
  return null;
}

function normalizeCount(value: bigint | number | string | null | undefined) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function loadIncidentCounts(partyIds: string[]) {
  if (partyIds.length === 0) return new Map<string, number>();

  try {
    const rows = await prisma.$queryRawUnsafe<{ partyId: string; count: bigint | number | string }[]>(
      `SELECT "partyId", COUNT(*) AS count
       FROM "EventIncidentReport"
       WHERE "partyId" = ANY($1::text[])
       GROUP BY "partyId"`,
      partyIds,
    );

    return new Map(rows.map((row) => [row.partyId, normalizeCount(row.count)]));
  } catch (error) {
    console.warn("Incident reports table is not available yet.", error);
    return new Map<string, number>();
  }
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (host) return `${forwardedProto}://${host}`;

  try {
    return new URL(request.url).origin;
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }
}

function normalizePublicUrl(url: string | null | undefined, publicOrigin: string) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    return `${publicOrigin.replace(/\/$/, "")}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    if (url.startsWith("/")) return `${publicOrigin.replace(/\/$/, "")}${url}`;
    return url;
  }
}

function serializeParty(party: {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: Date;
  startTime: Date;
  endTime: Date;
  status: string;
  workflowStep?: string | null;
  confirmationToken?: string | null;
  confirmationUrl?: string | null;
  confirmationExpiresAt?: Date | null;
  confirmedAt?: Date | null;
  packageName: string | null;
  guestOfHonor: string | null;
  depositAmount: unknown;
  depositStatus: string;
  depositMethod: string | null;
  balanceDue: unknown;
  notes: string | null;
  inviteToken: string | null;
  inviteUrl: string | null;
  incidentCount?: number;
  timelineItems?: { id: string; title: string; body: string | null; icon: string | null; createdAt: Date }[];
  payments?: { id: string; amount: unknown; method: string; notes: string | null; collectedAt: Date; createdAt: Date }[];
  guests?: {
    id: string;
    guestName: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    parentName?: string | null;
    status: string;
    rsvpStatus?: string | null;
    waiverStatus?: string | null;
    waiverSignedAt?: Date | null;
    declinedAt?: Date | null;
    declineReason?: string | null;
    checkedInAt: Date | null;
    checkedOutAt?: Date | null;
  }[];
}, publicOrigin?: string) {
  const inviteUrl = publicOrigin ? normalizePublicUrl(party.inviteUrl, publicOrigin) : party.inviteUrl;
  const confirmationUrl = publicOrigin ? normalizePublicUrl(party.confirmationUrl, publicOrigin) : party.confirmationUrl;

  return {
    id: party.id,
    eventNumber: party.eventNumber,
    title: party.title,
    eventDate: party.eventDate,
    startTime: party.startTime,
    endTime: party.endTime,
    status: party.status,
    workflowStep: party.workflowStep ?? "PENDING",
    confirmationToken: party.confirmationToken ?? null,
    confirmationUrl: confirmationUrl ?? null,
    pendingExpiresAt: party.confirmationExpiresAt ?? null,
    confirmationExpiresAt: party.confirmationExpiresAt ?? null,
    confirmedAt: party.confirmedAt ?? null,
    packageName: party.packageName,
    guestOfHonor: party.guestOfHonor,
    depositAmount: Number(party.depositAmount ?? 0),
    depositStatus: party.depositStatus,
    depositMethod: party.depositMethod,
    balanceDue: Number(party.balanceDue ?? 0),
    notes: party.notes ?? "",
    inviteToken: party.inviteToken,
    inviteUrl,
    incidentCount: party.incidentCount ?? 0,
    timelineItems: party.timelineItems ?? [],
    payments: (party.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      method: payment.method,
      notes: payment.notes ?? "",
      staff: "Staff",
      collectedAt: payment.collectedAt,
      createdAt: payment.createdAt,
    })),
    guests: (party.guests ?? []).map((guest) => ({
      id: guest.id,
      guestName: guest.guestName,
      guestEmail: guest.guestEmail ?? null,
      guestPhone: guest.guestPhone ?? null,
      parentName: guest.parentName ?? null,
      status: guest.status,
      rsvpStatus: guest.rsvpStatus ?? "ATTENDING",
      waiverStatus: guest.waiverStatus ?? "NEEDED",
      waiverSignedAt: guest.waiverSignedAt ?? null,
      declinedAt: guest.declinedAt ?? null,
      declineReason: guest.declineReason ?? null,
      checkedInAt: guest.checkedInAt,
      checkedOutAt: guest.checkedOutAt ?? null,
    })),
  };
}

function createToken() {
  return randomBytes(18).toString("base64url");
}

function createUrl(publicOrigin: string, path: string, token: string) {
  return `${publicOrigin.replace(/\/$/, "")}/${path}/${token}`;
}

async function nextEventNumber(tenantId: string) {
  const count = await prisma.party.count({ where: { tenantId } });
  return `EVT-${String(count + 1).padStart(6, "0")}`;
}

export async function GET(request: Request) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ events: [] });

    const events = await prisma.party.findMany({
      where: { tenantId: tenant.id },
      include: {
        guests: { orderBy: { createdAt: "asc" } },
        timelineItems: { orderBy: { createdAt: "desc" }, take: 10 },
        payments: { orderBy: { collectedAt: "desc" } },
      },
      orderBy: { eventDate: "asc" },
    });

    const publicOrigin = getRequestOrigin(request);
    const incidentCounts = await loadIncidentCounts(events.map((event) => event.id));
    const eventsWithIncidentCounts = events.map((event) => ({
      ...event,
      incidentCount: incidentCounts.get(event.id) ?? 0,
    }));

    return NextResponse.json({ events: eventsWithIncidentCounts.map((event) => serializeParty(event, publicOrigin)) });
  } catch (error) {
    return jsonError(error, "Unable to load events.");
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: "No tenant found. Create a tenant before adding events." }, { status: 400 });

    let body: CreateEventPayload;
    try {
      body = (await request.json()) as CreateEventPayload;
    } catch (error) {
      return jsonError(error, "Invalid event request body.", 400);
    }

    if (!body.eventTypeId) return NextResponse.json({ error: "Event type is required." }, { status: 400 });
    if (!body.packageId) return NextResponse.json({ error: "Package is required." }, { status: 400 });

    const parentFirstName = body.parentFirstName?.trim() || "";
    const parentLastName = body.parentLastName?.trim() || "";
    const customerName = `${parentFirstName} ${parentLastName}`.trim();
    if (!customerName) return NextResponse.json({ error: "Customer name is required." }, { status: 400 });

    const publicOrigin = getRequestOrigin(request);
    const eventDate = parseEventDate(body.eventDate);
    const startTime = combineDateAndTime(body.eventDate, body.startTime);
    const endTime = body.endTime ? combineDateAndTime(body.eventDate, body.endTime) : addDuration(startTime);
    const eventNumber = await nextEventNumber(tenant.id);
    const inviteToken = createToken();
    const inviteUrl = createUrl(publicOrigin, "rsvp", inviteToken);
    const confirmationToken = createToken();
    const confirmationUrl = createUrl(publicOrigin, "confirm-party", confirmationToken);
    const confirmationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const depositMethod = toPaymentMethod(body.depositStatus);
    const depositAmount = body.depositStatus === "waived" ? new Prisma.Decimal(0) : toDecimal(body.depositAmount);
    const balanceDue = toDecimal(body.balanceDue);

    const event = await prisma.$transaction(async (tx) => {
      const party = await tx.party.create({
        data: {
          tenantId: tenant.id,
          eventNumber,
          inviteToken,
          inviteUrl,
          confirmationToken,
          confirmationUrl,
          confirmationExpiresAt,
          eventTypeId: body.eventTypeId,
          packageId: body.packageId,
          title: body.title?.trim() || `${body.guestOfHonor || customerName} Booking`,
          eventDate,
          startTime,
          endTime,
          status: "PENDING",
          workflowStep: "PENDING",
          packageName: body.packageName?.trim() || null,
          guestOfHonor: body.guestOfHonor?.trim() || null,
          depositAmount,
          depositStatus: "PENDING",
          depositMethod,
          balanceDue,
          notes: body.notes?.trim() || null,
        },
      });

      for (const addOn of body.addOns ?? []) {
        await tx.partyAddOnItem.create({
          data: {
            tenantId: tenant.id,
            partyId: party.id,
            partyAddOnId: addOn.id,
            quantity: 1,
            unitPrice: toDecimal(addOn.price),
            totalPrice: toDecimal(addOn.price),
          },
        });
      }

      await tx.eventTimelineItem.createMany({
        data: [
          { tenantId: tenant.id, partyId: party.id, icon: "…", title: "Pending Hold Created", body: `${customerName} created ${eventNumber}. Hold expires in 48 hours unless confirmed.` },
          { tenantId: tenant.id, partyId: party.id, icon: "✉", title: "Confirmation Link Created", body: body.email ? `Confirmation should be sent to ${body.email}: ${confirmationUrl}` : `No email address was entered. Confirmation link: ${confirmationUrl}` },
          { tenantId: tenant.id, partyId: party.id, icon: "🔗", title: "RSVP Link Generated", body: `Guest RSVP and waiver link created: ${inviteUrl}` },
          { tenantId: tenant.id, partyId: party.id, icon: "$", title: "Deposit Authorized Only", body: body.depositStatus === "waived" ? "Deposit was waived by staff." : "Deposit/card info may be saved, but the deposit should not be processed until confirmation." },
        ],
      });

      return tx.party.findUniqueOrThrow({
        where: { id: party.id },
        include: {
          guests: { orderBy: { createdAt: "asc" } },
          timelineItems: { orderBy: { createdAt: "desc" } },
          payments: { orderBy: { collectedAt: "desc" } },
        },
      });
    });

    return NextResponse.json({ event: serializeParty({ ...event, incidentCount: 0 }, publicOrigin) });
  } catch (error) {
    return jsonError(error, "Unable to create event.");
  }
}
