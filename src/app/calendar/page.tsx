"use client";

import StaffName from "@/components/StaffName";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { addDays, weekDays, localDay, parseDay, formatClock, segmentsForWeek, layoutSegments, type CalendarBooking } from "@/lib/calendar/dates";

type EventTypeOption = { id: string; name: string; color: string | null };
type CalendarData = { timezone: string; today: string; weekStart: string; events: CalendarBooking[]; upcoming: CalendarBooking[]; eventTypes: EventTypeOption[] };


function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function makeSoftColor(hexColor: string) {
  if (!hexColor.startsWith("#") || hexColor.length !== 7) return "#F6F0E6";
  return `${hexColor}18`;
}

function getEventIcon(eventTypeName: string) {
  const name = normalizeName(eventTypeName);
  if (name.includes("party")) return "🎂";
  if (name.includes("field")) return "🚌";
  if (name.includes("camp")) return "🏕️";
  if (name.includes("class")) return "●";
  if (name.includes("closed")) return "🧹";
  if (name.includes("open")) return "👥";
  if (name.includes("private")) return "🔒";
  return "★";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getDepositBadge(depositStatus: string) {
  if (depositStatus === "CASH_COLLECTED") return "Cash Paid";
  if (depositStatus === "CARD_COLLECTED") return "Card Paid";
  if (depositStatus === "OTHER_COLLECTED") return "Deposit Paid";
  if (depositStatus === "WAIVED") return "Waived";
  return "Deposit Pending";
}

function getDepositBadgeStyles(depositStatus: string) {
  if (depositStatus.endsWith("COLLECTED")) {
    return "bg-[#D7F1EC] text-[#155E75]";
  }

  if (depositStatus === "WAIVED") {
    return "bg-[#F1F1F1] text-[#4B5563]";
  }

  return "bg-[#FFF0C4] text-[#92400E]";
}

export default function CalendarPage() {
  const [requestedDay, setRequestedDay] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [data, setData] = useState<CalendarData | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let fetching = false;
    async function loadCalendarData() {
      if (fetching) return;
      fetching = true;
      try {
        const response = await fetch(`/api/calendar${requestedDay ? `?date=${encodeURIComponent(requestedDay)}` : ""}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load calendar.");
        if (!controller.signal.aborted) { setData(payload); setError(""); }
      } catch (error) {
        if (!controller.signal.aborted) { setData(null); setError(error instanceof Error ? error.message : "Unable to load calendar."); }
      } finally {
        fetching = false;
        if (!controller.signal.aborted) setLoadingEvents(false);
      }
    }
    loadCalendarData();
    const refreshTimer = window.setInterval(loadCalendarData, 30000);
    return () => { controller.abort(); window.clearInterval(refreshTimer); };
  }, [requestedDay, refreshKey]);

  const days = data ? weekDays(data.weekStart) : [];
  const activeDay = days.some(day => day.key === selectedDay) ? selectedDay : days.some(day => day.key === data?.today) ? data!.today : days[0]?.key ?? "";
  const selectedDayInfo = days.find(day => day.key === activeDay);
  const calendarEvents = useMemo(() => data ? layoutSegments(segmentsForWeek(data.events, data.weekStart, data.timezone)) : [], [data]);
  const selectedDayEvents = calendarEvents.filter(event => event.day === activeDay);
  const upcomingEvents = data?.upcoming ?? [];
  const eventTypes = data?.eventTypes ?? [];
  const visibleLegendItems = eventTypes.slice(0, 6);
  const gridStartHour = Math.min(8, ...calendarEvents.map(event => Math.floor(event.startMinute / 60)));
  const gridEndHour = Math.max(21, ...calendarEvents.map(event => Math.ceil(event.endMinute / 60)));
  const timeRows = Array.from({ length: gridEndHour - gridStartHour }, (_, i) => {
    const hour = gridStartHour + i;
    return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
  });
  function getEventType(name: string) { return eventTypes.find(type => type.name === name) ?? { name, color: "#B99AFF" }; }
  function navigateTo(day: string) {
    if (!day) return;
    try { parseDay(day); } catch { return; }
    setLoadingEvents(true); setSelectedDay(day); setRequestedDay(day); setError("");
    setRefreshKey(key => key + 1);
  }
  const rangeLabel = days.length ? `${days[0].date}${days[0].key.slice(0, 4) !== days[6].key.slice(0, 4) ? `, ${days[0].key.slice(0, 4)}` : ""} – ${days[6].date}, ${days[6].key.slice(0, 4)}` : "Calendar";

  return (
    <>


        <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-6 py-6">
          <header className="mb-5 flex shrink-0 items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">Scheduling</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Calendar
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/bookings"
                className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white"
              >
                + New Booking
              </Link>

              <button
                title="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-[#1E293B] shadow-sm transition hover:bg-[#FAFAFA]"
              >
                <span className="text-lg leading-none">🔔</span>
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD56B] text-md font-semibold text-[#1E293B]">
                  D
                </div>
                <span className="text-sm font-medium text-[#1E293B]"><StaffName /></span>
              </div>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-3">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-4">
                <div className="flex items-center gap-3">
                  <button aria-label="Previous week" disabled={!data || loadingEvents} onClick={() => navigateTo(addDays(activeDay, -7))} className="rounded-lg border border-black/10 px-3 py-2 disabled:opacity-40">←</button>
                  <button disabled={!data || loadingEvents} onClick={() => navigateTo(data!.today)} className="rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold disabled:opacity-40">Today</button>
                  <button aria-label="Next week" disabled={!data || loadingEvents} onClick={() => navigateTo(addDays(activeDay, 7))} className="rounded-lg border border-black/10 px-3 py-2 disabled:opacity-40">→</button>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">
                    {rangeLabel}
                  </h2>

                  <div className="flex max-w-[520px] flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#5B6270]">
                    {visibleLegendItems.map((eventType) => (
                      <span key={eventType.id} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full border"
                          style={{
                            backgroundColor: makeSoftColor(eventType.color || "#9CA3AF"),
                            borderColor: eventType.color || "#9CA3AF",
                          }}
                        />
                        {eventType.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="rounded-full bg-[#F6F0E6] px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
                    {loadingEvents ? "Loading..." : `${data?.events.length ?? 0} event${data?.events.length === 1 ? "" : "s"}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 text-xs text-[#6B7280]">
                <label className="flex items-center gap-2">Go to date<input aria-label="Go to calendar date" type="date" min="2000-01-02" max="2099-12-31" value={activeDay || requestedDay} onChange={event => navigateTo(event.target.value)} className="rounded-lg border border-black/15 bg-white p-2 text-[#1E293B]" /></label>
                <span>{data?.timezone ?? "Business timezone"} · Week view</span>
                <button onClick={() => { setLoadingEvents(true); setRefreshKey(key => key + 1); }} disabled={loadingEvents} className="font-semibold underline disabled:opacity-40">Refresh</button>
              </div>
              {error && <p role="alert" className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} Use Refresh to try again.</p>}
              {!loadingEvents && !error && data?.events.length === 0 && <p role="status" className="border-b border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm text-[#6B7280]">No bookings scheduled for this week.</p>}
              {loadingEvents && <p role="status" className="px-4 py-2 text-sm text-[#6B7280]">Loading calendar…</p>}
              <div className="min-h-0 flex-1 overflow-auto"><div className="grid min-w-[700px] grid-cols-[70px_1fr]">
                <div className="border-r border-black/10 pt-[56px]">
                  {timeRows.map((time) => (
                    <div
                      key={time}
                      className="h-[54px] px-3 text-right text-xs font-medium text-[#6B7280]"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden">
                  <div className="grid h-[56px] grid-cols-7 border-b border-black/10">
                    {days.map((day) => (
                      <button
                        key={day.key}
                        aria-current={day.key === data?.today ? "date" : undefined}
                        aria-pressed={activeDay === day.key}
                        aria-label={`${day.label} ${day.date}`}
                        onClick={() => setSelectedDay(day.key)}
                        className={`border-r border-black/10 text-center transition last:border-r-0 ${
                          activeDay === day.key ? "bg-[#F6F0E6]" : "bg-white"
                        }`}
                      >
                        <p className="mt-3 text-xs font-semibold text-[#1E293B]">{day.label}</p>
                        <p className="text-xs text-[#6B7280]">{day.date}</p>
                      </button>
                    ))}
                  </div>

                  <div className="relative grid grid-cols-7" style={{height: timeRows.length * 54}}>
                    {days.map((day) => (
                      <div
                        key={day.key}
                        className="relative border-r border-black/10 last:border-r-0"
                      >
                        {timeRows.map((time) => (
                          <div key={time} className="h-[54px] border-b border-black/5" />
                        ))}

                        {calendarEvents
                          .filter((event) => event.day === day.key)
                          .map((event) => {
                            const eventType = getEventType(event.eventTypeName);
                            const color = event.color || eventType.color || "#B99AFF";

                            return (
                              <Link
                                key={event.segmentId}
                                href={`/parties/${event.id}`}
                                onClick={() => setSelectedDay(event.day)}
                                title={`${event.title} · ${event.start} – ${event.end}`}
                                className="absolute overflow-hidden rounded-[8px] border p-2 text-left text-xs shadow-sm transition hover:scale-[1.01]"
                                style={{
                                  top: `${(event.startMinute / 60 - gridStartHour) * 54 + 2}px`,
                                  height: `${Math.max(18, (event.endMinute - event.startMinute) / 60 * 54 - 4)}px`,
                                  left: `calc(${event.lane / event.laneCount * 100}% + 2px)`,
                                  width: `calc(${100 / event.laneCount}% - 4px)`,
                                  borderColor: color,
                                  backgroundColor: makeSoftColor(color),
                                  color: "#1E293B",
                                }}
                              >
                                <p className="font-semibold">
                                  {event.start} – {event.end}
                                </p>
                                <p className="mt-1 font-bold">
                                  {getEventIcon(event.eventTypeName)} {event.title}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1"><span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold">{event.status.replace(/_/g, " ")}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDepositBadgeStyles(event.depositStatus)}`}>
                                    {getDepositBadge(event.depositStatus)}
                                  </span>
                                  {event.balanceDue > 0 && (
                                    <span className="rounded-full bg-[#FFE0E9] px-2 py-0.5 text-[10px] font-semibold text-[#9F1239]">
                                      {formatCurrency(event.balanceDue)} due
                                    </span>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            </section>

            <aside className="min-h-0 space-y-3 overflow-y-auto">
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#6B7280]">Selected Day</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#1E293B]">
                      {selectedDayInfo ? `${selectedDayInfo.label}, ${selectedDayInfo.date}` : "Choose a day"}
                    </h3>
                  </div>
                  <Link
                    href="/bookings"
                    className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Add Booking
                  </Link>
                </div>

                <div className="space-y-2">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map((event) => {
                      const eventType = getEventType(event.eventTypeName);
                      const color = event.color || eventType.color || "#B99AFF";

                      return (
                        <Link
                          href={`/parties/${event.id}`}
                          key={event.segmentId}
                          className="block rounded-[10px] border p-3 transition hover:scale-[1.01]"
                          style={{
                            borderColor: color,
                            backgroundColor: makeSoftColor(color),
                            color: "#1E293B",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold">
                                {event.start} – {event.end}
                              </p>
                              <p className="mt-1 font-semibold">
                                {getEventIcon(event.eventTypeName)} {event.title}
                              </p>
                              <p className="mt-1 text-xs text-[#6B7280]">
                                {event.eventNumber} • {event.packageName}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${getDepositBadgeStyles(event.depositStatus)}`}>
                              {getDepositBadge(event.depositStatus)}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-[10px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">
                      {loadingEvents ? "Loading…" : error ? "Calendar unavailable." : "No events scheduled."}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">Upcoming Events</h3>
                  <Link href="/parties" className="text-sm font-semibold text-[#0B55C6]">
                    View All
                  </Link>
                </div>

                <div className="space-y-3">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event) => {
                      const eventType = getEventType(event.eventTypeName);
                      const color = event.color || eventType.color || "#FFB768";

                      return (
                        <Link
                          href={`/parties/${event.id}`}
                          key={event.id}
                          className="flex gap-3 border-b border-black/10 pb-3 last:border-b-0 last:pb-0"
                        >
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-base"
                            style={{ backgroundColor: makeSoftColor(color) }}
                          >
                            {getEventIcon(event.eventTypeName)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1E293B]">{event.title}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              {event.eventNumber} • {data ? `${localDay(event.startTime, data.timezone)} · ${formatClock(event.startTime, data.timezone)}` : ""} • {event.packageName}
                            </p>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-[10px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">
                      {loadingEvents ? "Loading…" : error ? "Calendar unavailable." : "No upcoming events yet."}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Quick Actions</h3>

                <div className="mt-4 space-y-2">
                  <Link
                    href="/bookings"
                    className="block w-full rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-left"
                  >
                    <p className="text-sm font-semibold text-[#0B55C6]">Create New Booking</p>
                    <p className="mt-1 text-xs text-[#5B6270]">
                      Start the booking wizard
                    </p>
                  </Link>

                  <Link
                    href="/parties"
                    className="block w-full rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-left"
                  >
                    <p className="text-sm font-semibold text-[#0B55C6]">
                      Open Party Manager
                    </p>
                    <p className="mt-1 text-xs text-[#5B6270]">
                      Run check-ins, waivers, and balances
                    </p>
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </section>

    </>
  );
}
