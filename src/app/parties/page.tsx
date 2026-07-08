"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type EventTypeOption = { id: string; name: string; description: string; color: string; active: boolean };
type EventGuestRecord = { id: string; status: string; waiverStatus?: string | null };
type EventRecord = { id: string; eventNumber: string | null; title: string; eventDate: string; startTime: string; endTime: string; status: string; packageName: string | null; guestOfHonor: string | null; depositAmount: number; depositStatus: string; balanceDue: number; notes: string; inviteUrl: string | null; guests?: EventGuestRecord[] };
type DashboardFilter = "active" | "today" | "upcoming" | "needs-attention" | "balance-due" | "waivers-needed" | "pending" | "completed" | "cancelled";
type PartyCard = { id: string; title: string; eventNumber: string; eventTypeName: string; startsAt: Date; endsAt: Date; date: string; time: string; status: string; packageName: string; guestOfHonor: string; guestCount: number; checkedInCount: number; waiverNeededCount: number; balanceDue: string; balanceDueNumber: number };

type ConfirmModalState =
  | { type: "cancel"; party: PartyCard }
  | { type: "uncancel"; party: PartyCard }
  | null;

const fallbackEventTypes: EventTypeOption[] = [
  { id: "birthday-party", name: "Birthday Party", description: "", color: "#FFB768", active: true },
  { id: "private-event", name: "Private Event", description: "", color: "#3B82F6", active: true },
  { id: "field-trip", name: "Field Trip", description: "", color: "#7BAE7F", active: true },
];

const filterOptions: { value: DashboardFilter; label: string }[] = [
  { value: "active", label: "Active Parties" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "needs-attention", label: "Needs Attention" },
  { value: "balance-due", label: "Balance Due" },
  { value: "waivers-needed", label: "Waivers Needed" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
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

function normalizeName(value: string) { return value.trim().toLowerCase(); }
function makeSoftColor(hexColor: string) { if (!hexColor.startsWith("#") || hexColor.length !== 7) return "#F6F0E6"; return `${hexColor}22`; }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Date TBD"; return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }
function formatTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Time TBD"; return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function getStatusLabel(status: string) { if (status === "CONFIRMED") return "Confirmed"; if (status === "PENDING") return "Pending"; if (status === "READY") return "Ready"; if (status === "IN_PROGRESS") return "In Progress"; if (status === "CLEANING_UP") return "Cleaning Up"; if (status === "COMPLETED") return "Completed"; if (status === "CANCELLED") return "Cancelled"; return status; }
function getRawStatus(label: string) { if (label === "Confirmed") return "CONFIRMED"; if (label === "Pending") return "PENDING"; if (label === "Ready") return "READY"; if (label === "In Progress") return "IN_PROGRESS"; if (label === "Cleaning Up") return "CLEANING_UP"; if (label === "Completed") return "COMPLETED"; if (label === "Cancelled") return "CANCELLED"; return label; }
function getStatusStyles(status: string) { if (status === "Cancelled") return "bg-[#FFE0E9] text-[#9F1239]"; if (status === "Confirmed" || status === "Ready") return "bg-[#D7F1EC] text-[#155E75]"; if (status === "Pending") return "bg-[#FFF0C4] text-[#92400E]"; if (status === "In Progress") return "bg-[#EEF5FF] text-[#0B55C6]"; if (status === "Cleaning Up") return "bg-[#F6F0E6] text-[#8A6D3B]"; return "bg-[#F1F1F1] text-[#4B5563]"; }
function getEventIcon(eventTypeName: string) { const name = normalizeName(eventTypeName); if (name.includes("party")) return "🎂"; if (name.includes("field")) return "🚌"; if (name.includes("private")) return "🔒"; return "★"; }
function guessEventTypeName(event: EventRecord) { const title = event.title || ""; const packageName = event.packageName || ""; if (title.toLowerCase().includes("field") || packageName.toLowerCase().includes("field")) return "Field Trip"; if (title.toLowerCase().includes("private") || packageName.toLowerCase().includes("private")) return "Private Event"; return "Birthday Party"; }
function isSameDay(left: Date, right: Date) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
function normalizeEventToParty(event: EventRecord): PartyCard { const guests = event.guests ?? []; const startsAt = new Date(event.startTime || event.eventDate); const endsAt = new Date(event.endTime || event.eventDate); return { id: event.id, title: event.title, eventNumber: event.eventNumber || "EVT", eventTypeName: guessEventTypeName(event), startsAt, endsAt, date: formatDate(event.eventDate), time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`, status: getStatusLabel(event.status), packageName: event.packageName || "No package", guestOfHonor: event.guestOfHonor || "Guest of Honor", guestCount: Math.max(guests.length, event.guestOfHonor ? 1 : 0), checkedInCount: guests.filter((guest) => guest.status === "CHECKED_IN").length, waiverNeededCount: guests.filter((guest) => guest.waiverStatus !== "SIGNED").length, balanceDue: formatCurrency(event.balanceDue), balanceDueNumber: event.balanceDue }; }
function needsAttention(party: PartyCard) { return party.status !== "Cancelled" && party.status !== "Completed" && (party.balanceDueNumber > 0 || party.waiverNeededCount > 0 || party.status === "Pending"); }
function isOperationalParty(party: PartyCard) { return party.status !== "Cancelled" && party.status !== "Completed"; }

export default function PartiesPage() {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("active");
  const [activeEventTypeFilter, setActiveEventTypeFilter] = useState("All Event Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(fallbackEventTypes);
  const [parties, setParties] = useState<PartyCard[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeActionId, setActiveActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);

  const loadEvents = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoadingEvents(true);
      const [eventTypesResponse, eventsResponse] = await Promise.all([fetch("/api/event-types", { cache: "no-store" }), fetch("/api/events", { cache: "no-store" })]);
      const [eventTypesData, eventsData] = await Promise.all([eventTypesResponse.json(), eventsResponse.json()]);
      if (eventTypesResponse.ok) {
        const activeEventTypes = (eventTypesData.eventTypes ?? []).filter((eventType: EventTypeOption) => eventType.active);
        if (activeEventTypes.length > 0) setEventTypes(activeEventTypes);
      }
      if (eventsResponse.ok) setParties((eventsData.events ?? []).map(normalizeEventToParty));
    } catch {
      if (!options?.silent) setParties([]);
    } finally {
      if (!options?.silent) setLoadingEvents(false);
    }
  }, []);

  useEffect(() => { loadEvents(); const refreshTimer = window.setInterval(() => loadEvents({ silent: true }), 5000); return () => window.clearInterval(refreshTimer); }, [loadEvents]);

  const eventTypeMap = useMemo(() => eventTypes.reduce<Record<string, EventTypeOption>>((map, eventType) => { map[normalizeName(eventType.name)] = eventType; return map; }, {}), [eventTypes]);
  function getEventType(eventTypeName: string) { return eventTypeMap[normalizeName(eventTypeName)] ?? fallbackEventTypes.find((eventType) => normalizeName(eventType.name) === normalizeName(eventTypeName)) ?? { id: eventTypeName, name: eventTypeName, description: "", color: "#B99AFF", active: true }; }

  const now = new Date();
  const operationalParties = useMemo(() => parties.filter(isOperationalParty), [parties]);
  const todayParties = useMemo(() => operationalParties.filter((party) => isSameDay(party.startsAt, now)), [operationalParties, now]);
  const liveParties = useMemo(() => todayParties.filter((party) => party.startsAt <= now && party.endsAt >= now), [todayParties, now]);
  const upcomingParties = useMemo(() => operationalParties.filter((party) => party.startsAt >= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()), [operationalParties, now]);
  const nextParty = upcomingParties[0] ?? null;

  const filteredParties = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    return parties.filter((party) => {
      const matchesSearch = !cleanQuery || party.title.toLowerCase().includes(cleanQuery) || party.eventNumber.toLowerCase().includes(cleanQuery) || party.guestOfHonor.toLowerCase().includes(cleanQuery) || party.packageName.toLowerCase().includes(cleanQuery);
      const matchesFilter = (activeFilter === "active" && isOperationalParty(party)) || (activeFilter === "today" && isOperationalParty(party) && isSameDay(party.startsAt, now)) || (activeFilter === "upcoming" && isOperationalParty(party) && party.startsAt >= now) || (activeFilter === "needs-attention" && needsAttention(party)) || (activeFilter === "balance-due" && isOperationalParty(party) && party.balanceDueNumber > 0) || (activeFilter === "waivers-needed" && isOperationalParty(party) && party.waiverNeededCount > 0) || (activeFilter === "pending" && isOperationalParty(party) && party.status === "Pending") || (activeFilter === "completed" && party.status === "Completed") || (activeFilter === "cancelled" && party.status === "Cancelled");
      const matchesEventType = activeEventTypeFilter === "All Event Types" || normalizeName(party.eventTypeName) === normalizeName(activeEventTypeFilter);
      return matchesSearch && matchesFilter && matchesEventType;
    });
  }, [activeEventTypeFilter, activeFilter, now, parties, searchQuery]);

  const stats = useMemo(() => ({ today: todayParties.length, upcoming: upcomingParties.length, needsAttention: operationalParties.filter(needsAttention).length, guestsExpected: operationalParties.reduce((total, party) => total + party.guestCount, 0), waiversNeeded: operationalParties.reduce((total, party) => total + party.waiverNeededCount, 0), balancesDue: operationalParties.filter((party) => party.balanceDueNumber > 0).length }), [operationalParties, todayParties.length, upcomingParties.length]);

  async function runPartyAction(type: "cancel" | "uncancel", party: PartyCard) {
    setActiveActionId(`${type}:${party.id}`);
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/${type}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Unable to ${type} party.`);
      await loadEvents({ silent: true });
      setConfirmModal(null);
      if (type === "uncancel") setActiveFilter("active");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Unable to ${type} party.`);
    } finally {
      setActiveActionId("");
    }
  }

  const activeFilterLabel = filterOptions.find((filter) => filter.value === activeFilter)?.label ?? "Active Parties";

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">PF</div><div><h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1><p className="text-xs text-[#6B7280]">Palmetto Playhouse</p></div></div>
          <nav className="space-y-1">{navItems.map((item) => <Link key={item.label} href={item.href} className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${item.href === "/parties" ? "bg-white text-[#111827] shadow-sm" : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"}`}><span className="flex h-5 w-5 items-center justify-center text-base">{item.icon}</span><span>{item.label}</span></Link>)}</nav>
        </aside>

        <section className="h-full flex-1 overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5"><div><p className="text-sm font-semibold text-[#8A6D3B]">Operations</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">Party Control Center</h1><p className="mt-2 text-sm text-[#6B7280]">Today, upcoming events, and anything that needs attention.</p></div><div className="flex items-center gap-3"><Link href="/bookings" className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ New Booking</Link><Link href="/calendar" className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">View Calendar</Link></div></header>
          <div className="h-[calc(100vh-125px)] overflow-y-auto pr-1">
            <section className="mb-4 grid grid-cols-4 gap-3"><button onClick={() => setActiveFilter("today")} className="rounded-[14px] border border-black/10 bg-white p-4 text-left shadow-sm transition hover:bg-[#FAFAFA]"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Today's Parties</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{stats.today}</p></button><button onClick={() => setActiveFilter("upcoming")} className="rounded-[14px] border border-black/10 bg-white p-4 text-left shadow-sm transition hover:bg-[#FAFAFA]"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Upcoming</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{stats.upcoming}</p></button><button onClick={() => setActiveFilter("needs-attention")} className="rounded-[14px] border border-black/10 bg-white p-4 text-left shadow-sm transition hover:bg-[#FAFAFA]"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Needs Attention</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{stats.needsAttention}</p></button><div className="rounded-[14px] border border-black/10 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Guests Expected</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{stats.guestsExpected}</p></div></section>
            <section className="mb-4 grid grid-cols-[1.1fr_1fr] gap-3"><div className="rounded-[14px] border border-black/10 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-[#6B7280]">Next Up</p><span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">Live schedule</span></div>{nextParty ? <div className="flex items-center justify-between gap-4 rounded-[12px] bg-[#F6F0E6] p-4"><div><p className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">{nextParty.title}</p><p className="mt-1 text-sm text-[#6B7280]">{nextParty.date} • {nextParty.time}</p></div><Link href={`/parties/${nextParty.id}`} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">Open</Link></div> : <div className="rounded-[12px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">No upcoming active parties.</div>}</div><div className="rounded-[14px] border border-black/10 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-[#6B7280]">Live Now</p><span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">{liveParties.length}</span></div>{liveParties.length > 0 ? <div className="space-y-2">{liveParties.slice(0, 2).map((party) => <Link key={party.id} href={`/parties/${party.id}`} className="block rounded-[12px] bg-[#EEF5FF] p-3 transition hover:bg-[#E1EEFF]"><p className="text-sm font-semibold text-[#1E293B]">{party.title}</p><p className="mt-1 text-xs text-[#6B7280]">{party.checkedInCount}/{Math.max(party.guestCount, 1)} checked in</p></Link>)}</div> : <div className="rounded-[12px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">Nothing live right now.</div>}</div></section>
            <section className="mb-4 rounded-[14px] border border-black/10 bg-white p-4 shadow-sm"><div className="grid grid-cols-[1fr_180px_180px_auto] gap-3"><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Search event, guest of honor, package, event number..." /><select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as DashboardFilter)} className="rounded-[10px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm font-semibold text-[#1E293B] outline-none">{filterOptions.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select><select value={activeEventTypeFilter} onChange={(event) => setActiveEventTypeFilter(event.target.value)} className="rounded-[10px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm font-semibold text-[#1E293B] outline-none"><option>All Event Types</option>{eventTypes.map((eventType) => <option key={eventType.id}>{eventType.name}</option>)}</select><span className="rounded-[10px] bg-[#F6F0E6] px-4 py-3 text-sm font-semibold text-[#1E293B]">{filteredParties.length} shown</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6B7280]"><span className="rounded-full bg-[#F6F0E6] px-3 py-1 font-semibold">View: {activeFilterLabel}</span><span className="rounded-full bg-[#F6F0E6] px-3 py-1 font-semibold">Waivers Needed: {stats.waiversNeeded}</span><span className="rounded-full bg-[#F6F0E6] px-3 py-1 font-semibold">Balances Due: {stats.balancesDue}</span></div></section>
            {actionError && <div className="mb-4 rounded-[12px] border border-[#FCA5A5] bg-[#FFE0E9] p-4 text-sm font-semibold text-[#9F1239]">{actionError}</div>}
            <section className="grid grid-cols-3 gap-3 pb-6">{loadingEvents ? <div className="col-span-3 rounded-[14px] border border-black/10 bg-white p-6 text-sm text-[#6B7280]">Loading parties...</div> : filteredParties.length > 0 ? filteredParties.map((party) => { const eventType = getEventType(party.eventTypeName); const isCancelled = party.status === "Cancelled"; const canCancel = !isCancelled && party.status !== "Completed"; return <article key={party.id} className="rounded-[14px] border border-black/10 bg-white p-4 shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#1E293B]" style={{ backgroundColor: makeSoftColor(eventType.color) }}>{getEventIcon(party.eventTypeName)} {party.eventTypeName}</span><h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">{party.title}</h2><p className="mt-1 text-xs text-[#6B7280]">{party.eventNumber} • {party.date}</p><p className="mt-1 text-xs text-[#6B7280]">{party.time}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(party.status)}`}>{party.status}</span></div><div className="grid grid-cols-3 gap-2 text-xs"><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Guests</p><p className="mt-1 font-semibold text-[#1E293B]">{party.checkedInCount}/{Math.max(party.guestCount, 1)}</p></div><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Waivers</p><p className="mt-1 font-semibold text-[#1E293B]">{party.waiverNeededCount}</p></div><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Balance</p><p className="mt-1 font-semibold text-[#1E293B]">{party.balanceDue}</p></div></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><Link href={`/parties/${party.id}`} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-center text-sm font-semibold text-white">Open Party</Link>{canCancel && <button onClick={() => setConfirmModal({ type: "cancel", party })} disabled={activeActionId === `cancel:${party.id}`} className="rounded-[10px] border border-[#FCA5A5] bg-[#FFF7F7] px-4 py-3 text-sm font-semibold text-[#9F1239] disabled:opacity-50">Cancel</button>}{isCancelled && <button onClick={() => setConfirmModal({ type: "uncancel", party })} disabled={activeActionId === `uncancel:${party.id}`} className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6] disabled:opacity-50">Restore</button>}</div></article>; }) : <div className="col-span-3 rounded-[14px] border border-dashed border-black/20 bg-white/70 p-8 text-center"><p className="font-semibold text-[#1E293B]">No parties found</p><p className="mt-2 text-sm text-[#6B7280]">Try changing the view, event type, or search.</p></div>}</section>
          </div>
        </section>
      </div>

      {confirmModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-[18px] bg-white p-6 shadow-xl"><p className="text-sm font-semibold text-[#8A6D3B]">{confirmModal.type === "cancel" ? "Guardrail" : "Restore Party"}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">{confirmModal.type === "cancel" ? `Cancel ${confirmModal.party.title}?` : `Restore ${confirmModal.party.title}?`}</h2><p className="mt-3 text-sm leading-6 text-[#6B7280]">{confirmModal.type === "cancel" ? "This will remove the party from the active dashboard. The booking, guest list, timeline, and payments will be preserved. You can restore this party later from the Cancelled filter." : "This will move the party back to Confirmed and return it to the active dashboard. The existing guest list, timeline, and payment records will stay attached."}</p><div className="mt-4 rounded-[12px] bg-[#F6F0E6] p-4 text-sm"><p className="font-semibold text-[#1E293B]">{confirmModal.party.date}</p><p className="mt-1 text-[#6B7280]">{confirmModal.party.time}</p></div><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setConfirmModal(null)} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">{confirmModal.type === "cancel" ? "Keep Party" : "Leave Cancelled"}</button><button onClick={() => runPartyAction(confirmModal.type, confirmModal.party)} disabled={Boolean(activeActionId)} className={`rounded-[10px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${confirmModal.type === "cancel" ? "bg-[#9F1239]" : "bg-[#1E293B]"}`}>{activeActionId ? "Working..." : confirmModal.type === "cancel" ? "Yes, Cancel Party" : "Restore Party"}</button></div></div></div>}
    </main>
  );
}
