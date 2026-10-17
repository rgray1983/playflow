import { withStaff, getStaffTenant } from "@/lib/auth/staff";
import { bookingOptions, saveCustomer } from "@/lib/booking/service";
import { BookingError, normalizePhone } from "@/lib/booking/rules";
import { createHash, randomUUID } from "crypto";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type CreateEventPayload = {
  bookingRequestId?: string;
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

async function getTenant() { return getStaffTenant(); }

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

function isMissingIncidentTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return message.includes("EventIncidentReport") && (message.includes("does not exist") || message.includes("TableDoesNotExist"));
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
    if (isMissingIncidentTableError(error)) return new Map<string, number>();
    throw error;
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
  familyId?: string | null;
  primaryParentId?: string | null;
  pricingSnapshot?: unknown;
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
  hostToken: string | null;
  inviteUrl: string | null;
  incidentCount?: number;
  timelineItems?: { id: string; title: string; body: string | null; icon: string | null; createdAt: Date }[];
  payments?: { staffName?: string | null; purpose?: string; status?: string; id: string; amount: unknown; method: string; notes: string | null; collectedAt: Date; createdAt: Date }[];
  guests?: {
    id: string;
    guestName: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    parentName?: string | null;
    status: string;
    rsvpStatus?: string | null;
    waiverStatus?: string | null;
    waiverChildId?: string | null;
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
    familyId: party.familyId ?? null,
    primaryParentId: party.primaryParentId ?? null,
    pricing: party.pricingSnapshot ?? null,
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
    hostToken: party.hostToken,
    inviteUrl,
    incidentCount: party.incidentCount ?? 0,
    timelineItems: party.timelineItems ?? [],
    payments: (party.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount ?? 0),
      method: payment.method,
      notes: payment.notes ?? "",
      staff: payment.staffName ?? "Staff (legacy)",
      purpose: payment.purpose ?? "BALANCE",
      status: payment.status ?? "PAID",
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
      waiverStatus: guest.waiverStatus === "SIGNED" && !guest.waiverChildId ? "NEEDED" : guest.waiverStatus ?? "NEEDED",
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

async function handleGET(request: Request) {
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

async function handlePOST(request: Request) {
  try {
    const tenant = await getTenant();
    if (!tenant) return NextResponse.json({ error: "No tenant found. Create a tenant before adding events." }, { status: 400 });

    let body: CreateEventPayload;
    try {
      const input = await request.json();
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new BookingError("Invalid event request body.");
      for (const key of ["eventTypeId", "packageId", "bookingRequestId", "title", "eventDate", "startTime", "guestOfHonor", "parentFirstName", "parentLastName", "email", "phone", "notes", "depositStatus"]) if (input[key] !== undefined && typeof input[key] !== "string") throw new BookingError("Invalid booking field.");
      if ((input.notes?.length ?? 0) > 10000 || (input.title?.length ?? 0) > 200 || (input.guestOfHonor?.length ?? 0) > 200) throw new BookingError("Booking text is too long.");
      body = input as CreateEventPayload;
    } catch (error) {
      return jsonError(error, "Invalid event request body.", 400);
    }

    if (!body.eventTypeId) return NextResponse.json({ error: "Event type is required." }, { status: 400 });
    if (!body.packageId) return NextResponse.json({ error: "Package is required." }, { status: 400 });

    const parentFirstName = body.parentFirstName?.trim() || "";
    const parentLastName = body.parentLastName?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || "";
    if (!parentFirstName || !parentLastName || parentFirstName.length > 100 || parentLastName.length > 100 || !/^[0-9]{7,15}$/.test(normalizePhone(phone)) || (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254))) throw new BookingError("Enter the customer's first name, last name, valid phone, and valid email if provided.");
    if (!body.bookingRequestId || !/^[a-zA-Z0-9-]{16,100}$/.test(body.bookingRequestId)) throw new BookingError("A booking request ID is required. Refresh the booking form and try again.");
    if (body.depositStatus && !["pending", "cash", "card", "waived"].includes(body.depositStatus)) throw new BookingError("Choose a valid deposit preference.");
    if (!Array.isArray(body.addOns ?? []) || (body.addOns ?? []).some(a => typeof a?.id !== "string")) throw new BookingError("Invalid add-ons.");
    const customerName = `${parentFirstName} ${parentLastName}`;
    const publicOrigin = getRequestOrigin(request);
    const requestFingerprint = createHash("sha256").update(JSON.stringify({ eventTypeId: body.eventTypeId, packageId: body.packageId, eventDate: body.eventDate, startTime: body.startTime, parentFirstName, parentLastName, email, phone, guestOfHonor: body.guestOfHonor, notes: body.notes, title: body.title, depositStatus: body.depositStatus, addOns: (body.addOns ?? []).map(a => a.id).sort() })).digest("hex");
    const eventNumber = `EVT-${randomUUID().toUpperCase()}`;
    const inviteToken = createToken();
    const hostToken = createToken();
    const inviteUrl = createUrl(publicOrigin, "rsvp", inviteToken);
    const confirmationToken = createToken();
    const confirmationUrl = createUrl(publicOrigin, "confirm-party", confirmationToken);
    const confirmationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const depositMethod = toPaymentMethod(body.depositStatus);
    const event = await prisma.$transaction(async (tx) => {
      // Serialize venue reservations and customer matching for this business.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenant.id} FOR UPDATE`);
      const existing = await tx.party.findFirst({ where: { tenantId: tenant.id, bookingRequestId: body.bookingRequestId }, include: { guests: true, timelineItems: true, payments: true } });
      if (existing) {
        if ((existing.pricingSnapshot as { requestFingerprint?: string } | null)?.requestFingerprint !== requestFingerprint) throw new BookingError("This booking was already saved. Start a new booking before changing the details.", 409);
        return existing;
      }
      const currentTenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
      const options = await bookingOptions(tx, currentTenant, { eventTypeId: body.eventTypeId!, packageId: body.packageId!, addOnIds: (body.addOns ?? []).map(a => a.id), eventDate: body.eventDate ?? "", waived: body.depositStatus === "waived" });
      const slot = options.slots.find(s => s.time === body.startTime);
      if (!slot?.available) throw new BookingError("That time is no longer available. Choose another time.", 409);
      const parent = await saveCustomer(tx, tenant.id, { firstName: parentFirstName, lastName: parentLastName, email, phone });
      const party = await tx.party.create({
        data: {
          tenantId: tenant.id,
          eventNumber,
          bookingRequestId: body.bookingRequestId,
          pricingSnapshot: { requestFingerprint, ...options.quote, customer: { firstName: parentFirstName, lastName: parentLastName, email, phone }, timezone: tenant.timezone },
          familyId: parent.familyId,
          primaryParentId: parent.id,
          inviteToken,
          hostToken,
          inviteUrl,
          confirmationToken,
          confirmationUrl,
          confirmationExpiresAt,
          eventTypeId: body.eventTypeId,
          packageId: body.packageId,
          title: body.title?.trim() || `${body.guestOfHonor || customerName} Booking`,
          eventDate: slot.eventDate,
          startTime: slot.startTime,
          setupStartsAt: slot.setupStartsAt,
          endTime: slot.endTime,
          status: "PENDING",
          workflowStep: "PENDING",
          packageName: options.pkg.name,
          guestOfHonor: body.guestOfHonor?.trim() || null,
          depositAmount: new Prisma.Decimal(options.quote.depositDue),
          depositStatus: body.depositStatus === "waived" ? "WAIVED" : "PENDING",
          depositMethod,
          balanceDue: new Prisma.Decimal(options.quote.balanceDue),
          notes: body.notes?.trim() || null,
        },
      });

      for (const addOn of options.addOns) {
        await tx.partyAddOnItem.create({
          data: {
            tenantId: tenant.id,
            partyId: party.id,
            partyAddOnId: addOn.id,
            quantity: 1,
            unitPrice: new Prisma.Decimal(addOn.price),
            totalPrice: new Prisma.Decimal(addOn.price),
          },
        });
      }

      await tx.eventTimelineItem.createMany({
        data: [
          { tenantId: tenant.id, partyId: party.id, icon: "…", title: "Pending Hold Created", body: `${customerName} created ${eventNumber}. Hold expires in 48 hours unless confirmed.` },
          { tenantId: tenant.id, partyId: party.id, icon: "✉", title: "Confirmation Link Created", body: body.email ? `Confirmation should be sent to ${body.email}: ${confirmationUrl}` : `No email address was entered. Confirmation link: ${confirmationUrl}` },
          { tenantId: tenant.id, partyId: party.id, icon: "🔗", title: "RSVP Link Generated", body: `Guest RSVP and waiver link created: ${inviteUrl}` },
          { tenantId: tenant.id, partyId: party.id, icon: "$", title: "Deposit Preference Saved", body: body.depositStatus === "waived" ? "Deposit was waived by staff." : "No payment has been collected or authorized. Record payment separately when received." },
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
    }, { maxWait: 10000, timeout: 15000 });

    return NextResponse.json({ event: serializeParty({ ...event, incidentCount: 0 }, publicOrigin) });
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return jsonError(error, "Unable to create event.");
  }
}

export const GET = withStaff("read", handleGET);

export const POST = withStaff("parties.write", handlePOST);
