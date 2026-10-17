import { NextResponse } from "next/server";
import { withStaff, getStaffTenant } from "@/lib/auth/staff";
import { prisma } from "@/lib/prisma";
import { bookingTime } from "@/lib/booking/rules";
import { localDay, weekDays, addDays, parseDay } from "@/lib/calendar/dates";

async function handleGET(request: Request) {
  const tenant = await getStaffTenant();
  if (!tenant) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  const now = new Date();
  const today = localDay(now, tenant.timezone);
  const requested = new URL(request.url).searchParams.get("date") || today;
  try { parseDay(requested); if (requested < "2000-01-01" || requested > "2100-12-31") throw new Error("Choose a date between 2000 and 2100."); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid date." }, { status: 400 }); }
  const days = weekDays(requested);
  const start = bookingTime(days[0].key, "00:00", tenant.timezone, 60).startTime;
  const end = bookingTime(addDays(days[6].key, 1), "00:00", tenant.timezone, 60).startTime;
  const activeWhere = { tenantId: tenant.id, status: { not: "CANCELLED" as const }, OR: [{ status: { not: "PENDING" as const } }, { confirmationExpiresAt: null }, { confirmationExpiresAt: { gt: now } }] };
  const select = { id: true, title: true, eventNumber: true, startTime: true, endTime: true, status: true, packageName: true, depositStatus: true, balanceDue: true, eventType: { select: { name: true, color: true } } } as const;
  const [events, upcoming, eventTypes] = await Promise.all([
    prisma.party.findMany({ where: { ...activeWhere, startTime: { lt: end }, endTime: { gt: start } }, select, orderBy: [{ startTime: "asc" }, { id: "asc" }] }),
    prisma.party.findMany({ where: { ...activeWhere, status: { notIn: ["CANCELLED", "COMPLETED"] }, startTime: { gte: now } }, select, orderBy: [{ startTime: "asc" }, { id: "asc" }], take: 5 }),
    prisma.eventType.findMany({ where: { tenantId: tenant.id, active: true }, select: { id: true, name: true, color: true }, orderBy: { name: "asc" } }),
  ]);
  const serialize = (event: typeof events[number]) => ({ id: event.id, title: event.title, eventNumber: event.eventNumber, startTime: event.startTime, endTime: event.endTime, status: event.status, packageName: event.packageName, depositStatus: event.depositStatus, balanceDue: Number(event.balanceDue ?? 0), eventTypeName: event.eventType?.name ?? "Event", color: event.eventType?.color ?? "#B99AFF" });
  return NextResponse.json({ timezone: tenant.timezone, today, weekStart: days[0].key, events: events.map(serialize), upcoming: upcoming.map(serialize), eventTypes });
}
export const GET = withStaff("read", handleGET);
