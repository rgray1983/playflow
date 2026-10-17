/** Calendar keys represent venue-local dates, never browser-local instants. */
export function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid calendar date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 2200) throw new Error("Choose a valid calendar date.");
  return date;
}
export function addDays(value: string, days: number) {
  const date = parseDay(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function weekDays(value: string) {
  const date = parseDay(value);
  const start = addDays(value, -date.getUTCDay());
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    return { key, label: parseDay(key).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }).toUpperCase(), date: parseDay(key).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }) };
  });
}
export function localDay(instant: Date | string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function clockMinutes(instant: Date | string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(instant));
  return Number(parts.find(p => p.type === "hour")!.value) * 60 + Number(parts.find(p => p.type === "minute")!.value);
}
export function formatClock(instant: Date | string, timezone: string) {
  return new Date(instant).toLocaleTimeString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
}
export type CalendarBooking = { setupStartsAt?: string | null; id: string; startTime: string; endTime: string; title: string; eventTypeName: string; color: string; eventNumber: string | null; status: string; packageName: string | null; depositStatus: string; balanceDue: number };
export function visibleBooking(event: {status: string; confirmationExpiresAt?: Date | string | null}, now = new Date()) {
  return event.status !== "CANCELLED" && !(event.status === "PENDING" && event.confirmationExpiresAt && new Date(event.confirmationExpiresAt).getTime() <= now.getTime());
}
/** Split overnight bookings into daily segments; use wall-clock minutes for grid placement. */
export function segmentsForWeek(events: CalendarBooking[], week: string, timezone: string) {
  const days = weekDays(week);
  const ranges = events.flatMap(event => event.setupStartsAt && new Date(event.setupStartsAt) < new Date(event.startTime) ? [{...event, title: `${event.title} — setup`, endTime: event.startTime, startTime: event.setupStartsAt, phase: "SETUP"}, {...event, phase: "PARTY"}] : [{...event, phase: "PARTY"}]);
  return ranges.flatMap(event => {
    const start = new Date(event.startTime), end = new Date(event.endTime);
    if (!(end > start)) return [];
    const startDay = localDay(start, timezone), endDay = localDay(end, timezone);
    return days.flatMap(day => {
      if (day.key < startDay || day.key > endDay) return [];
      const startMinute = day.key === startDay ? clockMinutes(start, timezone) : 0;
      const endMinute = day.key === endDay ? clockMinutes(end, timezone) : 1440;
      if (endMinute <= startMinute) return [];
      return [{ ...event, segmentId: `${event.id}-${day.key}-${event.phase}`, day: day.key, start: formatClock(start, timezone), end: formatClock(end, timezone), startMinute, endMinute }];
    });
  });
}

export function layoutSegments<T extends { day: string; startMinute: number; endMinute: number }>(segments: T[]) {
  const result: (T & { lane: number; laneCount: number })[] = [];
  for (const day of new Set(segments.map(segment => segment.day))) {
    const sorted = segments.filter(segment => segment.day === day).sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
    let cluster: (T & { lane: number })[] = [], ends: number[] = [], clusterEnd = -1;
    const flush = () => { result.push(...cluster.map(segment => ({ ...segment, laneCount: ends.length }))); cluster = []; ends = []; clusterEnd = -1; };
    for (const segment of sorted) {
      if (segment.startMinute >= clusterEnd && cluster.length) flush();
      let lane = ends.findIndex(end => end <= segment.startMinute);
      if (lane === -1) lane = ends.length;
      ends[lane] = segment.endMinute;
      cluster.push({ ...segment, lane });
      clusterEnd = Math.max(clusterEnd, segment.endMinute);
    }
    flush();
  }
  return result;
}
