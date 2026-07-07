"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventTypeOption = {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
};

type ApiEvent = {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: string;
  packageName: string | null;
  guestOfHonor: string | null;
  depositAmount: number;
  depositStatus: string;
  depositMethod: string | null;
  balanceDue: number;
  notes: string;
};

type CalendarEvent = {
  id: string;
  day: string;
  start: string;
  end: string;
  title: string;
  eventTypeName: string;
  eventNumber: string;
  status: string;
  packageName: string;
  depositStatus: string;
  balanceDue: number;
  rowStart: number;
  rowSpan: number;
};

const days = [
  { label: "SUN", date: "Jun 21", key: "sun" },
  { label: "MON", date: "Jun 22", key: "mon" },
  { label: "TUE", date: "Jun 23", key: "tue" },
  { label: "WED", date: "Jun 24", key: "wed" },
  { label: "THU", date: "Jun 25", key: "thu" },
  { label: "FRI", date: "Jun 26", key: "fri" },
  { label: "SAT", date: "Jun 27", key: "sat" },
];

const timeRows = [
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
];

const fallbackEventTypes: EventTypeOption[] = [
  { id: "open-play", name: "Open Play", description: "", color: "#7BAE7F", active: true },
  { id: "birthday-party", name: "Birthday Party", description: "", color: "#FFB768", active: true },
  { id: "private-event", name: "Private Event", description: "", color: "#3B82F6", active: true },
  { id: "field-trip", name: "Field Trip", description: "", color: "#7BAE7F", active: true },
  { id: "class", name: "Class", description: "", color: "#FF91AA", active: true },
  { id: "closed", name: "Closed", description: "", color: "#9CA3AF", active: true },
];

const fallbackCalendarEvents: CalendarEvent[] = [
  {
    id: "fallback-1",
    day: "wed",
    start: "6:00 PM",
    end: "8:00 PM",
    title: "Birthday Party - Emma R.",
    eventTypeName: "Birthday Party",
    eventNumber: "Sample",
    status: "CONFIRMED",
    packageName: "Birthday Party Package",
    depositStatus: "CASH_COLLECTED",
    balanceDue: 200,
    rowStart: 11,
    rowSpan: 2,
  },
  {
    id: "fallback-2",
    day: "fri",
    start: "6:00 PM",
    end: "8:00 PM",
    title: "Birthday Party - Mason T.",
    eventTypeName: "Birthday Party",
    eventNumber: "Sample",
    status: "CONFIRMED",
    packageName: "Birthday Party Package",
    depositStatus: "CARD_COLLECTED",
    balanceDue: 275,
    rowStart: 11,
    rowSpan: 2,
  },
  {
    id: "fallback-3",
    day: "sat",
    start: "9:00 AM",
    end: "11:00 AM",
    title: "Birthday Party - Sophia L.",
    eventTypeName: "Birthday Party",
    eventNumber: "Sample",
    status: "PENDING",
    packageName: "Birthday Party Package",
    depositStatus: "PENDING",
    balanceDue: 300,
    rowStart: 2,
    rowSpan: 2,
  },
];

const navItems = [
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Bookings", icon: "✎", href: "/bookings" },
  { label: "Party & Event Manager", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
];

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

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBD";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDayKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "sat";
  }

  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return keys[date.getDay()];
}

function getRowStart(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 2;
  }

  const hour = date.getHours() + date.getMinutes() / 60;
  const startHour = 8;
  return Math.max(1, Math.round(hour - startHour) + 1);
}

function getRowSpan(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 2;
  }

  const hours = Math.max(1, (end.getTime() - start.getTime()) / 1000 / 60 / 60);
  return Math.max(1, Math.round(hours));
}

function guessEventTypeName(event: ApiEvent) {
  const title = event.title || "";
  const packageName = event.packageName || "";

  if (title.toLowerCase().includes("field") || packageName.toLowerCase().includes("field")) {
    return "Field Trip";
  }

  if (title.toLowerCase().includes("private") || packageName.toLowerCase().includes("private")) {
    return "Private Event";
  }

  if (title.toLowerCase().includes("birthday") || packageName.toLowerCase().includes("birthday")) {
    return "Birthday Party";
  }

  return "Birthday Party";
}

function normalizeApiEvent(event: ApiEvent): CalendarEvent {
  return {
    id: event.id,
    day: getDayKey(event.eventDate),
    start: formatTime(event.startTime),
    end: formatTime(event.endTime),
    title: event.title,
    eventTypeName: guessEventTypeName(event),
    eventNumber: event.eventNumber ?? "EVT",
    status: event.status,
    packageName: event.packageName ?? "No package",
    depositStatus: event.depositStatus,
    balanceDue: event.balanceDue,
    rowStart: getRowStart(event.startTime),
    rowSpan: getRowSpan(event.startTime, event.endTime),
  };
}

function getDepositBadge(depositStatus: string) {
  if (depositStatus === "CASH_COLLECTED") return "Cash Paid";
  if (depositStatus === "CARD_COLLECTED") return "Card Paid";
  if (depositStatus === "WAIVED") return "Waived";
  return "Deposit Pending";
}

function getDepositBadgeStyles(depositStatus: string) {
  if (depositStatus === "CASH_COLLECTED" || depositStatus === "CARD_COLLECTED") {
    return "bg-[#D7F1EC] text-[#155E75]";
  }

  if (depositStatus === "WAIVED") {
    return "bg-[#F1F1F1] text-[#4B5563]";
  }

  return "bg-[#FFF0C4] text-[#92400E]";
}

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState("sun");
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(fallbackEventTypes);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(fallbackCalendarEvents);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    async function loadCalendarData() {
      try {
        const [eventTypesResponse, eventsResponse] = await Promise.all([
          fetch("/api/event-types"),
          fetch("/api/events"),
        ]);

        const [eventTypesData, eventsData] = await Promise.all([
          eventTypesResponse.json(),
          eventsResponse.json(),
        ]);

        if (eventTypesResponse.ok) {
          const activeEventTypes = (eventTypesData.eventTypes ?? []).filter(
            (eventType: EventTypeOption) => eventType.active
          );

          if (activeEventTypes.length > 0) {
            const merged = [...activeEventTypes];

            fallbackEventTypes.forEach((fallback) => {
              const exists = merged.some(
                (eventType) => normalizeName(eventType.name) === normalizeName(fallback.name)
              );

              if (!exists) merged.push(fallback);
            });

            setEventTypes(merged);
          }
        }

        if (eventsResponse.ok) {
          const realEvents = (eventsData.events ?? []).map(normalizeApiEvent);

          if (realEvents.length > 0) {
            setCalendarEvents(realEvents);
            setSelectedDay(realEvents[0].day);
          }
        }
      } catch {
        setCalendarEvents(fallbackCalendarEvents);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadCalendarData();
  }, []);

  const eventTypeMap = useMemo(() => {
    return eventTypes.reduce<Record<string, EventTypeOption>>((map, eventType) => {
      map[normalizeName(eventType.name)] = eventType;
      return map;
    }, {});
  }, [eventTypes]);

  function getEventType(eventTypeName: string) {
    return eventTypeMap[normalizeName(eventTypeName)] ??
      fallbackEventTypes.find((type) => normalizeName(type.name) === normalizeName(eventTypeName)) ?? {
        id: eventTypeName,
        name: eventTypeName,
        description: "",
        color: "#B99AFF",
        active: true,
      };
  }

  const selectedDayInfo = days.find((day) => day.key === selectedDay) ?? days[0];

  const selectedDayEvents = useMemo(() => {
    return calendarEvents.filter((event) => event.day === selectedDay);
  }, [calendarEvents, selectedDay]);

  const upcomingEvents = useMemo(() => {
    return [...calendarEvents].slice(0, 5);
  }, [calendarEvents]);

  const visibleLegendItems = eventTypes.slice(0, 6);

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">
                PF
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1>
                <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/calendar";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-7 left-6 right-6">
            <button className="flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-sm font-medium text-[#5B6270] hover:bg-white/70 hover:text-[#111827]">
              <span>↪</span>
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        <section className="h-full flex-1 overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
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
                <span className="text-sm font-medium text-[#1E293B]">Devin</span>
              </div>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[1fr_320px] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <div className="flex items-center gap-3">
                  <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
                    Week View ▾
                  </button>
                  <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
                    Today
                  </button>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">
                    Event Engine Calendar
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
                    {loadingEvents ? "Loading..." : `${calendarEvents.length} event${calendarEvents.length === 1 ? "" : "s"}`}
                  </span>
                </div>
              </div>

              <div className="grid h-full grid-cols-[70px_1fr]">
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
                        onClick={() => setSelectedDay(day.key)}
                        className={`border-r border-black/10 text-center transition last:border-r-0 ${
                          selectedDay === day.key ? "bg-[#F6F0E6]" : "bg-white"
                        }`}
                      >
                        <p className="mt-3 text-xs font-semibold text-[#1E293B]">{day.label}</p>
                        <p className="text-xs text-[#6B7280]">{day.date}</p>
                      </button>
                    ))}
                  </div>

                  <div className="relative grid h-[702px] grid-cols-7">
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
                            const color = eventType.color || "#B99AFF";

                            return (
                              <Link
                                key={event.id}
                                href="/parties"
                                onClick={() => setSelectedDay(event.day)}
                                className="absolute left-2 right-2 overflow-hidden rounded-[8px] border p-2 text-left text-xs shadow-sm transition hover:scale-[1.01]"
                                style={{
                                  top: `${(event.rowStart - 1) * 54 + 8}px`,
                                  height: `${event.rowSpan * 54 - 10}px`,
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
                                <div className="mt-1 flex flex-wrap gap-1">
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
            </section>

            <aside className="space-y-3 overflow-hidden">
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#6B7280]">Selected Day</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#1E293B]">
                      {selectedDayInfo.label}, {selectedDayInfo.date}
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
                      const color = eventType.color || "#B99AFF";

                      return (
                        <Link
                          href="/parties"
                          key={event.id}
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
                      No events scheduled.
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
                      const color = eventType.color || "#FFB768";

                      return (
                        <Link
                          href="/parties"
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
                              {event.eventNumber} • {event.start} • {event.packageName}
                            </p>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-[10px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">
                      No upcoming events yet.
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
      </div>
    </main>
  );
}
