import { Prisma } from "@/generated/prisma/client";
import { BookingError, bookingTime, quoteBooking, scheduleFrom } from "./rules";

type Database = Prisma.TransactionClient;
export async function bookingOptions(tx: Database, tenant: { id: string; timezone: string; bookingSettings: unknown }, input: { eventTypeId: string; packageId: string; addOnIds: string[]; eventDate: string; waived?: boolean }) {
  if (new Set(input.addOnIds).size !== input.addOnIds.length || input.addOnIds.length > 50) throw new BookingError("Choose each add-on only once.");
  const [eventType, pkg, addOns, commerce] = await Promise.all([
    tx.eventType.findFirst({ where: { id: input.eventTypeId, tenantId: tenant.id, active: true } }),
    tx.package.findFirst({ where: { id: input.packageId, tenantId: tenant.id, active: true } }),
    tx.partyAddOn.findMany({ where: { id: { in: input.addOnIds }, tenantId: tenant.id, active: true }, orderBy: { id: "asc" } }),
    tx.commerceSettings.findUnique({ where: { tenantId: tenant.id } }),
  ]);
  if (!eventType || !pkg || (pkg.eventTypeId && pkg.eventTypeId !== eventType.id) || addOns.length !== input.addOnIds.length) throw new BookingError("Choose an active event type, matching package, and add-ons from this business.");
  const schedule = scheduleFrom(tenant.bookingSettings);
  const duration = (pkg.durationMinutes ?? 120) + addOns.reduce((sum, addOn) => sum + addOn.durationMinutes, 0);
  // Every booking currently reserves the venue; multiple independently bookable rooms are a later feature.
  const range = bookingTime(input.eventDate, "00:00", tenant.timezone, 1440);
  const parties = await tx.party.findMany({ where: { tenantId: tenant.id, status: { not: "CANCELLED" }, startTime: { lt: new Date(range.endTime.getTime() + 86400000) }, endTime: { gt: new Date(range.startTime.getTime() - 86400000) } }, select: { setupStartsAt: true, startTime: true, endTime: true, status: true, confirmationExpiresAt: true } });
  const now = Date.now();
  const buffer = schedule.bufferMinutes * 60000;
  const slots = schedule.startTimes.map(time => {
    const interval = bookingTime(input.eventDate, time, tenant.timezone, duration);
    const setupStartsAt = new Date(interval.startTime.getTime() - schedule.setupMinutes * 60000);
    const available = schedule.daysOfWeek.includes(interval.dayOfWeek) && setupStartsAt.getTime() > now && !parties.some(p => !(p.status === "PENDING" && p.confirmationExpiresAt && p.confirmationExpiresAt.getTime() <= now) && (p.setupStartsAt ?? p.startTime).getTime() < interval.endTime.getTime() + buffer && p.endTime.getTime() > setupStartsAt.getTime() - buffer);
    const format = (date: Date) => date.toLocaleTimeString("en-US", { timeZone: tenant.timezone, hour: "numeric", minute: "2-digit" });
    return { time, setupStartsAt, label: `${format(interval.startTime)} - ${format(interval.endTime)}`, available, ...interval };
  });
  return { pkg, addOns, slots, quote: quoteBooking(pkg, addOns, commerce, input.waived), timezone: tenant.timezone };
}
export async function saveCustomer(tx: Database, tenantId: string, input: { firstName: string; lastName: string; email: string; phone: string }) {
  const candidates = await tx.parent.findMany({ where: { tenantId, firstName: { equals: input.firstName, mode: "insensitive" }, lastName: { equals: input.lastName, mode: "insensitive" } } });
  const { normalizePhone } = await import("./rules");
  const matches = candidates.filter(p => (input.email && p.email?.toLowerCase() === input.email) || (p.phone && normalizePhone(p.phone) === normalizePhone(input.phone)));
  if (matches.length > 1) throw new BookingError("Multiple matching customer records were found. Review the customer records before booking.", 409);
  if (matches.length === 1) return matches[0];
  const family = await tx.family.create({ data: { tenantId, name: `${input.lastName} Family` } });
  return tx.parent.create({ data: { tenantId, familyId: family.id, ...input, email: input.email || null } });
}

export async function lockReservation(tx: Database, tenantId: string, partyId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`);
  return tx.party.findUniqueOrThrow({ where: { id: partyId, tenantId } });
}
export async function assertReservation(tx: Database, party: { id: string; tenantId: string; setupStartsAt?: Date | null; startTime: Date; endTime: Date; confirmationExpiresAt: Date | null; confirmedAt: Date | null }) {
  if (!party.confirmedAt && party.confirmationExpiresAt && party.confirmationExpiresAt.getTime() <= Date.now()) throw new BookingError("This pending hold has expired. Create a new booking.", 410);
  const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: party.tenantId } });
  const buffer = scheduleFrom(tenant.bookingSettings).bufferMinutes * 60000;
  const other = await tx.party.findFirst({ where: { tenantId: party.tenantId, id: { not: party.id }, status: { not: "CANCELLED" }, AND: [{ OR: [{setupStartsAt: {lt: new Date(party.endTime.getTime() + buffer)}}, {setupStartsAt: null, startTime: {lt: new Date(party.endTime.getTime() + buffer)}}] }], endTime: { gt: new Date((party.setupStartsAt ?? party.startTime).getTime() - buffer) }, OR: [{ status: { not: "PENDING" } }, { confirmationExpiresAt: null }, { confirmationExpiresAt: { gt: new Date() } }] } });
  if (other) throw new BookingError("This time overlaps another booking. Choose a new time before restoring or confirming.", 409);
}
