import { Temporal } from "@js-temporal/polyfill";
import { normalizeCommerceSettings } from "@/lib/commerce-settings";

export class BookingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type Schedule = { setupMinutes: number; startTimes: string[]; bufferMinutes: number; daysOfWeek: number[] };
export function scheduleFrom(value: unknown): Schedule {
  const input = (value && typeof value === "object" ? value : {}) as Partial<Schedule>;
  return {
    setupMinutes: input.setupMinutes ?? 30,
    startTimes: input.startTimes ?? ["09:00", "12:00", "15:00", "18:00"],
    bufferMinutes: input.bufferMinutes ?? 0,
    daysOfWeek: input.daysOfWeek ?? [1, 2, 3, 4, 5, 6, 7],
  };
}
export function bookingTime(date: string, time: string, timezone: string, duration: number) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error();
    if (!Number.isInteger(duration) || duration <= 0 || duration > 1440) throw new Error();
    const day = Temporal.PlainDate.from(date, { overflow: "reject" });
    const clock = Temporal.PlainTime.from(time, { overflow: "reject" });
    const start = Temporal.ZonedDateTime.from({ timeZone: timezone, year: day.year, month: day.month, day: day.day, hour: clock.hour, minute: clock.minute }, { overflow: "reject", disambiguation: "reject" });
    return { startTime: new Date(Number(start.epochMilliseconds)), endTime: new Date(Number(start.add({ minutes: duration }).epochMilliseconds)), eventDate: new Date(`${date}T00:00:00Z`), dayOfWeek: day.dayOfWeek };
  } catch { throw new BookingError("Choose a valid date and time in the business timezone."); }
}
function cents(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 99999999) throw new BookingError("A saved price is invalid. Update Company Settings before booking.");
  return Math.round(number * 100);
}
export function quoteBooking(pkg: { price: unknown; depositAmount: unknown; name: string }, addOns: { id: string; name: string; price: unknown }[], settings: unknown, waived = false) {
  const rules = normalizeCommerceSettings(settings ?? {});
  const lines = [{ name: pkg.name, amount: cents(pkg.price), profile: "party_packages" }, ...addOns.map(a => ({ id: a.id, name: a.name, amount: cents(a.price), profile: "add_ons" }))];
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const taxFor = (amount: number, key?: string) => {
    if (!rules.taxRules.enabled) return 0;
    const profile = rules.taxRules.profiles.find(p => p.key === key);
    if (profile && !profile.taxable) return 0;
    const rate = profile?.rate ?? rules.taxRules.defaultRate;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new BookingError("The saved tax rate is invalid.");
    return Math.round(rules.taxRules.pricesIncludeTax ? amount - amount / (1 + rate / 100) : amount * rate / 100);
  };
  const percent = (amount: number, rate: number) => { if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new BookingError("A saved percentage is invalid."); return Math.round(amount * rate / 100); };
  const fees = rules.feeRules.enabled ? rules.feeRules.fees.filter(f => f.enabled).map(f => ({ name: f.label, amount: f.type === "percent" ? percent(subtotal, f.amount) : cents(f.amount), taxable: f.taxable })) : [];
  const tax = lines.reduce((sum, line) => sum + taxFor(line.amount, line.profile), 0) + fees.reduce((sum, fee) => sum + (fee.taxable ? taxFor(fee.amount) : 0), 0);
  const total = subtotal + fees.reduce((sum, fee) => sum + fee.amount, 0) + (rules.taxRules.pricesIncludeTax ? 0 : tax);
  if (total > 9999999900) throw new BookingError("The booking total exceeds the supported amount.");
  let deposit = 0;
  if (!waived && rules.depositRules.enabled && rules.depositRules.requiredByDefault) deposit = pkg.depositAmount != null ? cents(pkg.depositAmount) : rules.depositRules.defaultType === "percent" ? percent(total, rules.depositRules.percentAmount) : cents(rules.depositRules.flatAmount);
  return { subtotal: subtotal / 100, tax: tax / 100, fees: fees.map(f => ({ name: f.name, amount: f.amount / 100 })), total: total / 100, depositDue: Math.min(deposit, total) / 100, balanceDue: total / 100, lines: lines.map(l => ({ ...l, amount: l.amount / 100 })) };
}
export function normalizePhone(value: string) { const digits = value.replace(/\D/g, ""); return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits; }
