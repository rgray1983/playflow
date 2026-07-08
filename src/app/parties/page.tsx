"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type EventTypeOption = {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
};

type EventGuestRecord = {
  id: string;
  guestName: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  parentName?: string | null;
  status: string;
  waiverStatus?: string | null;
  checkedInAt: string | null;
  checkedOutAt?: string | null;
};

type EventRecord = {
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
  balanceDue: number;
  notes: string;
  inviteUrl: string | null;
  guests?: EventGuestRecord[];
};

type PartyCard = {
  id: string;
  title: string;
  eventNumber: string;
  eventTypeName: string;
  date: string;
  time: string;
  status: string;
  packageName: string;
  guestOfHonor: string;
  guestCount: number;
  checkedInCount: number;
  waiverNeededCount: number;
  balanceDue: string;
  balanceDueNumber: number;
};

const fallbackEventTypes: EventTypeOption[] = [
  { id: "birthday-party", name: "Birthday Party", description: "", color: "#FFB768", active: true },
  { id: "private-event", name: "Private Event", description: "", color: "#3B82F6", active: true },
  { id: "field-trip", name: "Field Trip", description: "", color: "#7BAE7F", active: true },
];

const partyFilters = ["All", "Today", "This Week", "Confirmed", "Pending", "Balance Due", "Waivers Needed", "Cancelled"];

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
  return `${hexColor}22`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getStatusLabel(status: string) {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PENDING") return "Pending";
  if (status === "IN_PROGRESS") return "In Progress";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function getStatusStyles(status: string) {
  if (status === "Cancelled" || status === "CANCELLED") return "bg-[#FFE0E9] text-[#9F1239]";
  if (status === "Confirmed" || status === "CONFIRMED") return "bg-[#D7F1EC] text-[#155E75]";
  if (status === "Pending" || status === "PENDING") return "bg-[#FFF0C4] text-[#92400E]";
  if (status === "In Progress" || status === "IN_PROGRESS") return "bg-[#EEF5FF] text-[#0B55C6]";
  return "bg-[#F1F1F1] text-[#4B5563]";
}

function getEventIcon(eventTypeName: string) {
  const name = normalizeName(eventTypeName);
  if (name.includes("party")) return "🎂";
  if (name.includes("field")) return "🚌";
  if (name.includes("private")) return "🔒";
  return "★";
}

function guessEventTypeName(event: EventRecord) {
  const title = event.title || "";
  const packageName = event.packageName || "";
  if (title.toLowerCase().includes("field") || packageName.toLowerCase().includes("field")) return "Field Trip";
  if (title.toLowerCase().includes("private") || packageName.toLowerCase().includes("private")) return "Private Event";
  return "Birthday Party";
}

function normalizeEventToParty(event: EventRecord): PartyCard {
  const guests = event.guests ?? [];
  return {
    id: event.id,
    title: event.title,
    eventNumber: event.eventNumber || "EVT",
    eventTypeName: guessEventTypeName(event),
    date: formatDate(event.eventDate),
    time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
    status: getStatusLabel(event.status),
    packageName: event.packageName || "No package",
    guestOfHonor: event.guestOfHonor || "Guest of Honor",
    guestCount: Math.max(guests.length, event.guestOfHonor ? 1 : 0),
    checkedInCount: guests.filter((guest) => guest.status === "CHECKED_IN").length,
    waiverNeededCount: guests.filter((guest) => guest.waiverStatus !== "SIGNED").length,
    balanceDue: formatCurrency(event.balanceDue),
    balanceDueNumber: event.balanceDue,
  };
}

function isToday(party: PartyCard) {
  return party.date === formatDate(new Date().toISOString());
}

export default function PartiesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeEventTypeFilter, setActiveEventTypeFilter] = useState("All Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(fallbackEventTypes);
  const [parties, setParties] = useState<PartyCard[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeCancelId, setActiveCancelId] = useState("");
  const [cancelError, setCancelError] = useState("");

  const loadEvents = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoadingEvents(true);
      const [eventTypesResponse, eventsResponse] = await Promise.all([
        fetch("/api/event-types", { cache: "no-store" }),
        fetch("/api/events", { cache: "no-store" }),
      ]);
      const [eventTypesData, eventsData] = await Promise.all([eventTypesResponse.json(), eventsResponse.json()]);

      if (eventTypesResponse.ok) {
        const activeEventTypes = (eventTypesData.eventTypes ?? []).filter((eventType: EventTypeOption) => eventType.active);
        if (activeEventTypes.length > 0) setEventTypes(activeEventTypes);
      }

      if (eventsResponse.ok) {
        setParties((eventsData.events ?? []).map(normalizeEventToParty));
      }
    } catch {
      if (!options?.silent) setParties([]);
    } finally {
      if (!options?.silent) setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const refreshTimer = window.setInterval(() => loadEvents({ silent: true }), 5000);
    return () => window.clearInterval(refreshTimer);
  }, [loadEvents]);

  const eventTypeMap = useMemo(() => {
    return eventTypes.reduce<Record<string, EventTypeOption>>((map, eventType) => {
      map[normalizeName(eventType.name)] = eventType;
      return map;
    }, {});
  }, [eventTypes]);

  function getEventType(eventTypeName: string) {
    return eventTypeMap[normalizeName(eventTypeName)] ?? fallbackEventTypes.find((eventType) => normalizeName(eventType.name) === normalizeName(eventTypeName)) ?? { id: eventTypeName, name: eventTypeName, description: "", color: "#B99AFF", active: true };
  }

  const filteredParties = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();

    return parties.filter((party) => {
      const matchesSearch =
        !cleanQuery ||
        party.title.toLowerCase().includes(cleanQuery) ||
        party.eventNumber.toLowerCase().includes(cleanQuery) ||
        party.guestOfHonor.toLowerCase().includes(cleanQuery) ||
        party.packageName.toLowerCase().includes(cleanQuery);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Today" && isToday(party)) ||
        activeFilter === "This Week" ||
        (activeFilter === "Confirmed" && party.status === "Confirmed") ||
        (activeFilter === "Pending" && party.status === "Pending") ||
        (activeFilter === "Balance Due" && party.balanceDueNumber > 0) ||
        (activeFilter === "Waivers Needed" && party.waiverNeededCount > 0) ||
        (activeFilter === "Cancelled" && party.status === "Cancelled");

      const matchesEventType = activeEventTypeFilter === "All Types" || normalizeName(party.eventTypeName) === normalizeName(activeEventTypeFilter);
      return matchesSearch && matchesFilter && matchesEventType;
    });
  }, [activeFilter, activeEventTypeFilter, parties, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: parties.length,
      today: parties.filter(isToday).length,
      balanceDue: parties.filter((party) => party.balanceDueNumber > 0 && party.status !== "Cancelled").length,
      waiversNeeded: parties.filter((party) => party.waiverNeededCount > 0 && party.status !== "Cancelled").length,
    };
  }, [parties]);

  async function cancelParty(partyId: string) {
    setActiveCancelId(partyId);
    setCancelError("");

    try {
      const response = await fetch(`/api/events/${partyId}/cancel`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Unable to cancel party.");
      await loadEvents({ silent: true });
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Unable to cancel party.");
    } finally {
      setActiveCancelId("");
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">PF</div>
            <div>
              <h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1>
              <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/parties";
              return (
                <Link key={item.label} href={item.href} className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"}`}>
                  <span className="flex h-5 w-5 items-center justify-center text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="h-full flex-1 overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">Operations</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">Party Control Center</h1>
              <p className="mt-2 text-sm text-[#6B7280]">Choose a party or event to open the focused manager.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/bookings" className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ New Booking</Link>
              <Link href="/calendar" className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">View Calendar</Link>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-rows-[auto_auto_1fr] gap-4 overflow-hidden">
            <section className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Events", value: stats.total },
                { label: "Today", value: stats.today },
                { label: "Balance Due", value: stats.balanceDue },
                { label: "Waivers Needed", value: stats.waiversNeeded },
              ].map((item) => (
                <div key={item.label} className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-[#6B7280]">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{item.value}</p>
                </div>
              ))}
            </section>

            <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Search event, guest of honor, package, event number..." />
                <span className="rounded-full bg-[#F6F0E6] px-4 py-3 text-xs font-semibold text-[#1E293B]">{loadingEvents ? "Loading..." : `${filteredParties.length} shown`}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {partyFilters.map((filter) => (
                  <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === filter ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270] hover:bg-[#EFE8DC]"}`}>{filter}</button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {["All Types", ...eventTypes.map((eventType) => eventType.name)].map((filter) => {
                  const eventType = filter === "All Types" ? null : getEventType(filter);
                  return (
                    <button key={filter} onClick={() => setActiveEventTypeFilter(filter)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeEventTypeFilter === filter ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-white text-[#5B6270] hover:bg-[#F6F0E6]"}`} style={eventType && activeEventTypeFilter !== filter ? { borderColor: eventType.color, backgroundColor: makeSoftColor(eventType.color) } : undefined}>{filter}</button>
                  );
                })}
              </div>

              {cancelError && <p className="mt-3 rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">{cancelError}</p>}
            </section>

            <section className="overflow-y-auto rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              {filteredParties.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredParties.map((party) => {
                    const eventType = getEventType(party.eventTypeName);
                    return (
                      <div key={party.id} className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#1E293B]" style={{ backgroundColor: makeSoftColor(eventType.color) }}>{getEventIcon(party.eventTypeName)} {party.eventTypeName}</span>
                            <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">{party.title}</h2>
                            <p className="mt-1 text-xs text-[#6B7280]">{party.eventNumber} • {party.date} • {party.time}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(party.status)}`}>{party.status}</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="rounded-[8px] bg-white p-3"><p className="font-semibold text-[#1E293B]">{party.guestCount}</p><p className="text-[#6B7280]">Guests</p></div>
                          <div className="rounded-[8px] bg-white p-3"><p className="font-semibold text-[#1E293B]">{party.checkedInCount}</p><p className="text-[#6B7280]">Checked In</p></div>
                          <div className="rounded-[8px] bg-white p-3"><p className="font-semibold text-[#9F1239]">{party.waiverNeededCount}</p><p className="text-[#6B7280]">Waivers</p></div>
                          <div className="rounded-[8px] bg-white p-3"><p className="font-semibold text-[#9F1239]">{party.balanceDue}</p><p className="text-[#6B7280]">Balance</p></div>
                        </div>

                        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                          <Link href={`/parties/${party.id}`} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-center text-sm font-semibold text-white">Open Manager</Link>
                          <button disabled={party.status === "Cancelled" || activeCancelId === party.id} onClick={() => cancelParty(party.id)} className="rounded-[10px] border border-[#FCA5A5] bg-white px-4 py-3 text-sm font-semibold text-[#9F1239] disabled:opacity-40">{activeCancelId === party.id ? "Cancelling..." : "Cancel"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-black/20 bg-[#F6F0E6] p-8 text-center">
                  <p className="font-semibold text-[#1E293B]">No events found</p>
                  <p className="mt-2 text-sm text-[#6B7280]">Try a different filter or create a new booking.</p>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
