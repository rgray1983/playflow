import {createStaffBookingResponse} from "@/lib/booking/staff";
import { withStaff, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export const POST = withStaff("parties.write",createStaffBookingResponse);
export const GET = withStaff("read", handleGET);
