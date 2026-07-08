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

type EventTimelineItem = {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  createdAt: string;
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
  depositMethod: string | null;
  balanceDue: number;
  notes: string;
  timelineItems: EventTimelineItem[];
};

type Party = {
  id: string;
  childName: string;
  title: string;
  eventNumber: string;
  eventTypeName: string;
  family: string;
  host: string;
  phone: string;
  date: string;
  time: string;
  status: string;
  packageName: string;
  room: string;
  guestCount: number;
  checkedInCount: number;
  waiverNeededCount: number;
  deposit: string;
  depositStatus: string;
  balanceDue: string;
  balanceDueNumber: number;
  addOns: string[];
  notes: string;
  timelineItems: EventTimelineItem[];
  guests: {
    name: string;
    status: string;
    waiver: string;
  }[];
};

const fallbackEventTypes: EventTypeOption[] = [
  { id: "birthday-party", name: "Birthday Party", description: "", color: "#FFB768", active: true },
  { id: "private-event", name: "Private Event", description: "", color: "#3B82F6", active: true },
  { id: "field-trip", name: "Field Trip", description: "", color: "#7BAE7F", active: true },
];

const fallbackParties: Party[] = [
  {
    id: "party-dava",
    childName: "Dava Gray",
    title: "Dava Gray Birthday Party",
    eventNumber: "Sample",
    eventTypeName: "Birthday Party",
    family: "Gray Family",
    host: "Nicole Gray",
    phone: "843-555-0102",
    date: "Saturday, Jun 27",
    time: "12:00 PM - 2:00 PM",
    status: "Confirmed",
    packageName: "Birthday Party Package",
    room: "Main Party Room",
    guestCount: 12,
    checkedInCount: 2,
    waiverNeededCount: 1,
    deposit: "$100.00",
    depositStatus: "CASH_COLLECTED",
    balanceDue: "$200.00",
    balanceDueNumber: 200,
    addOns: ["Balloon Arch", "Balloon Columns"],
    notes: "Pink, teal, and white balloons. Birthday child loves princess themes.",
    timelineItems: [
      {
        id: "sample-timeline-1",
        title: "Booking Created",
        body: "Sample booking created.",
        icon: "✓",
        createdAt: new Date().toISOString(),
      },
    ],
    guests: [
      { name: "Dava Gray", status: "Birthday Child", waiver: "Valid" },
      { name: "Taylan Smith", status: "Checked In", waiver: "Valid" },
      { name: "Liam Johnson", status: "Expected", waiver: "Needed" },
    ],
  },
];

const partyFilters = ["All", "Today", "This Week", "Confirmed", "Pending", "Balance Due"];

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

function formatTimelineTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getStatusStyles(status: string) {
  if (status === "CONFIRMED" || status === "Confirmed") return "bg-[#D7F1EC] text-[#155E75]";
  if (status === "PENDING" || status === "Pending") return "bg-[#FFF0C4] text-[#92400E]";
  if (status === "IN_PROGRESS" || status === "In Progress") return "bg-[#EEF5FF] text-[#0B55C6]";
  return "bg-[#F1F1F1] text-[#4B5563]";
}

function getWaiverStyles(status: string) {
  if (status === "Valid") return "bg-[#D7F1EC] text-[#155E75]";
  return "bg-[#FFE0E9] text-[#9F1239]";
}

function getDepositBadge(depositStatus: string) {
  if (depositStatus === "CASH_COLLECTED") return "Cash Deposit";
  if (depositStatus === "CARD_COLLECTED") return "Card Deposit";
  if (depositStatus === "WAIVED") return "Deposit Waived";
  return "Deposit Pending";
}

function getDepositStyles(depositStatus: string) {
  if (depositStatus === "CASH_COLLECTED" || depositStatus === "CARD_COLLECTED") return "bg-[#D7F1EC] text-[#155E75]";
  if (depositStatus === "WAIVED") return "bg-[#F1F1F1] text-[#4B5563]";
  return "bg-[#FFF0C4] text-[#92400E]";
}

function getEventIcon(eventTypeName: string) {
  const name = normalizeName(eventTypeName);
  if (name.includes("party")) return "🎂";
  if (name.includes("field")) return "🚌";
  if (name.includes("camp")) return "🏕️";
  if (name.includes("class")) return "●";
  if (name.includes("private")) return "🔒";
  if (name.includes("rental")) return "🔑";
  return "★";
}

function guessEventTypeName(event: EventRecord) {
  const title = event.title || "";
  const packageName = event.packageName || "";
  if (title.toLowerCase().includes("field") || packageName.toLowerCase().includes("field")) return "Field Trip";
  if (title.toLowerCase().includes("private") || packageName.toLowerCase().includes("private")) return "Private Event";
  if (title.toLowerCase().includes("birthday") || packageName.toLowerCase().includes("birthday")) return "Birthday Party";
  return "Birthday Party";
}

function normalizeEventToParty(event: EventRecord): Party {
  const guestName = event.guestOfHonor || "Guest of Honor";
  const hasWaiverNeeded = Boolean(event.guestOfHonor);

  return {
    id: event.id,
    childName: guestName,
    title: event.title,
    eventNumber: event.eventNumber || "EVT",
    eventTypeName: guessEventTypeName(event),
    family: "Family Record Pending",
    host: "Booking Customer",
    phone: "Saved with booking",
    date: formatDate(event.eventDate),
    time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
    status: event.status === "CONFIRMED" ? "Confirmed" : event.status === "PENDING" ? "Pending" : event.status,
    packageName: event.packageName || "No package",
    room: "Main Party Room",
    guestCount: event.guestOfHonor ? 1 : 0,
    checkedInCount: 0,
    waiverNeededCount: hasWaiverNeeded ? 1 : 0,
    deposit: formatCurrency(event.depositAmount),
    depositStatus: event.depositStatus,
    balanceDue: formatCurrency(event.balanceDue),
    balanceDueNumber: event.balanceDue,
    addOns: [],
    notes: event.notes || "No notes yet.",
    timelineItems: event.timelineItems ?? [],
    guests: event.guestOfHonor ? [{ name: guestName, status: "Guest of Honor", waiver: "Needed" }] : [],
  };
}

export default function PartiesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeEventTypeFilter, setActiveEventTypeFilter] = useState("All Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState(fallbackParties[0].id);
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(fallbackEventTypes);
  const [parties, setParties] = useState<Party[]>(fallbackParties);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeControlTab, setActiveControlTab] = useState("overview");

  useEffect(() => {
    async function loadPartyManagerData() {
      try {
        const [eventTypesResponse, eventsResponse] = await Promise.all([fetch("/api/event-types"), fetch("/api/events")]);
        const [eventTypesData, eventsData] = await Promise.all([eventTypesResponse.json(), eventsResponse.json()]);

        if (eventTypesResponse.ok) {
          const activeEventTypes = (eventTypesData.eventTypes ?? []).filter((eventType: EventTypeOption) => eventType.active);
          if (activeEventTypes.length > 0) setEventTypes(activeEventTypes);
        }

        if (eventsResponse.ok) {
          const realParties = (eventsData.events ?? []).map(normalizeEventToParty);
          if (realParties.length > 0) {
            setParties(realParties);
            setSelectedPartyId(realParties[0].id);
          }
        }
      } catch {
        setParties(fallbackParties);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadPartyManagerData();
  }, []);

  const eventTypeMap = useMemo(() => {
    return eventTypes.reduce<Record<string, EventTypeOption>>((map, eventType) => {
      map[normalizeName(eventType.name)] = eventType;
      return map;
    }, {});
  }, [eventTypes]);

  function getEventType(eventTypeName: string) {
    return eventTypeMap[normalizeName(eventTypeName)] ??
      fallbackEventTypes.find((eventType) => normalizeName(eventType.name) === normalizeName(eventTypeName)) ?? {
        id: eventTypeName,
        name: eventTypeName,
        description: "",
        color: "#B99AFF",
        active: true,
      };
  }

  const filteredParties = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();

    return parties.filter((party) => {
      const matchesSearch =
        !cleanQuery ||
        party.title.toLowerCase().includes(cleanQuery) ||
        party.family.toLowerCase().includes(cleanQuery) ||
        party.host.toLowerCase().includes(cleanQuery) ||
        party.eventNumber.toLowerCase().includes(cleanQuery) ||
        party.packageName.toLowerCase().includes(cleanQuery);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Confirmed" && party.status === "Confirmed") ||
        (activeFilter === "Pending" && party.status === "Pending") ||
        (activeFilter === "Balance Due" && party.balanceDueNumber > 0) ||
        activeFilter === "This Week" ||
        activeFilter === "Today";

      const matchesEventType = activeEventTypeFilter === "All Types" || normalizeName(party.eventTypeName) === normalizeName(activeEventTypeFilter);
      return matchesSearch && matchesFilter && matchesEventType;
    });
  }, [activeFilter, activeEventTypeFilter, parties, searchQuery]);

  const selectedParty = parties.find((party) => party.id === selectedPartyId) ?? parties[0] ?? fallbackParties[0];
  const selectedPartyEventType = getEventType(selectedParty.eventTypeName);

  const eventReadiness = [
    {
      label: "Deposit",
      value: getDepositBadge(selectedParty.depositStatus),
      done: selectedParty.depositStatus !== "PENDING",
    },
    {
      label: "Waivers",
      value: selectedParty.waiverNeededCount === 0 ? "Complete" : `${selectedParty.waiverNeededCount} needed`,
      done: selectedParty.waiverNeededCount === 0,
    },
    {
      label: "Guests",
      value: `${selectedParty.checkedInCount}/${Math.max(selectedParty.guestCount, 1)} checked in`,
      done: selectedParty.guestCount > 0 && selectedParty.checkedInCount >= selectedParty.guestCount,
    },
    {
      label: "Balance",
      value: selectedParty.balanceDueNumber > 0 ? selectedParty.balanceDue : "Paid",
      done: selectedParty.balanceDueNumber <= 0,
    },
  ];

  const completedReadiness = eventReadiness.filter((item) => item.done).length;
  const readinessPercent = Math.round((completedReadiness / eventReadiness.length) * 100);

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">PF</div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1>
                <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
              </div>
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
              <p className="text-sm font-semibold text-[#8A6D3B]">Operations</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">Party Control Center</h1>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/bookings" className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ New Booking</Link>
              <Link href="/calendar" className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">View Calendar</Link>
              <button title="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-[#1E293B] shadow-sm transition hover:bg-[#FAFAFA]">
                <span className="text-lg leading-none">🔔</span>
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD56B] text-md font-semibold text-[#1E293B]">D</div>
                <span className="text-sm font-medium text-[#1E293B]">Devin</span>
              </div>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[390px_1fr] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1E293B]">Events From Booking Engine</p>
                  <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">{loadingEvents ? "Loading..." : filteredParties.length}</span>
                </div>

                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Search event, package, event number..." />

                <div className="mt-3 flex flex-wrap gap-2">
                  {partyFilters.map((filter) => (
                    <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === filter ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270] hover:bg-[#EFE8DC]"}`}>
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {["All Types", ...eventTypes.map((eventType) => eventType.name)].map((filter) => {
                    const eventType = filter === "All Types" ? null : getEventType(filter);
                    return (
                      <button key={filter} onClick={() => setActiveEventTypeFilter(filter)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeEventTypeFilter === filter ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-white text-[#5B6270] hover:bg-[#F6F0E6]"}`} style={eventType && activeEventTypeFilter !== filter ? { borderColor: eventType.color, backgroundColor: makeSoftColor(eventType.color) } : undefined}>
                        {filter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-full space-y-2 overflow-y-auto p-3 pb-24">
                {filteredParties.map((party) => {
                  const eventType = getEventType(party.eventTypeName);
                  const isSelected = selectedParty.id === party.id;

                  return (
                    <button key={party.id} onClick={() => setSelectedPartyId(party.id)} className={`w-full rounded-[10px] border p-4 text-left transition ${isSelected ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : makeSoftColor(eventType.color), color: isSelected ? "#FFFFFF" : "#1E293B" }}>
                              {getEventIcon(party.eventTypeName)} {party.eventTypeName}
                            </span>
                          </div>
                          <p className="font-semibold">{party.title}</p>
                          <p className={`mt-1 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}>{party.eventNumber} • {party.date}</p>
                          <p className={`mt-1 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}>{party.time}</p>
                        </div>

                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : getStatusStyles(party.status)}`}>{party.status}</span>
                      </div>

                      <div className={`grid grid-cols-2 gap-2 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}>
                        <span>Deposit: {party.deposit}</span>
                        <span>Balance: {party.balanceDue}</span>
                        <span>Waivers: {party.waiverNeededCount} needed</span>
                        <span>{party.checkedInCount}/{Math.max(party.guestCount, 1)} checked in</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-5">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(selectedParty.status)}`}>{selectedParty.status}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDepositStyles(selectedParty.depositStatus)}`}>{getDepositBadge(selectedParty.depositStatus)}</span>
                      <span className="rounded-full border px-3 py-1 text-xs font-semibold text-[#1E293B]" style={{ borderColor: selectedPartyEventType.color, backgroundColor: makeSoftColor(selectedPartyEventType.color) }}>
                        {getEventIcon(selectedParty.eventTypeName)} {selectedParty.eventTypeName}
                      </span>
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{selectedParty.title}</h2>
                    <p className="mt-2 text-sm text-[#6B7280]">{selectedParty.eventNumber} • {selectedParty.date} • {selectedParty.time}</p>
                  </div>

                  <div className="flex gap-2">
                    <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">Edit</button>
                    <button className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">Start Event</button>
                  </div>
                </div>
              </div>

              <div className="h-full overflow-y-auto p-5 pb-24">
                <section className="mb-4 rounded-[14px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Event Readiness</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">Everything staff needs before the party starts.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">{readinessPercent}%</p>
                      <p className="text-xs font-semibold text-[#6B7280]">Ready</p>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[#1E293B] transition-all duration-300" style={{ width: `${readinessPercent}%` }} />
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {eventReadiness.map((item) => (
                      <div key={item.label} className="rounded-[10px] bg-white p-4">
                        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F0E6] text-sm font-semibold">{item.done ? "✓" : "!"}</div>
                        <p className="text-xs font-semibold text-[#6B7280]">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-[#1E293B]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="mb-4 grid grid-cols-4 gap-3">
                  <button onClick={() => setActiveControlTab("overview")} className={`rounded-[10px] px-4 py-3 text-sm font-semibold ${activeControlTab === "overview" ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270]"}`}>Overview</button>
                  <button onClick={() => setActiveControlTab("guests")} className={`rounded-[10px] px-4 py-3 text-sm font-semibold ${activeControlTab === "guests" ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270]"}`}>Guests</button>
                  <button onClick={() => setActiveControlTab("payments")} className={`rounded-[10px] px-4 py-3 text-sm font-semibold ${activeControlTab === "payments" ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270]"}`}>Payments</button>
                  <button onClick={() => setActiveControlTab("timeline")} className={`rounded-[10px] px-4 py-3 text-sm font-semibold ${activeControlTab === "timeline" ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270]"}`}>Timeline</button>
                </div>

                {activeControlTab === "overview" && (
                  <div className="grid grid-cols-[1fr_330px] gap-4">
                    <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Party Details</h3>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Guest of Honor</p><p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.childName}</p></div>
                        <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Package</p><p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.packageName}</p></div>
                        <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Room</p><p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.room}</p></div>
                        <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Customer</p><p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.host}</p></div>
                      </div>

                      <div className="mt-3 rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">Notes / Balloon Colors</p>
                        <p className="mt-2 text-sm text-[#1E293B]">{selectedParty.notes}</p>
                      </div>
                    </section>

                    <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Quick Actions</h3>
                      <div className="mt-4 space-y-2">
                        <button className="w-full rounded-[10px] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E293B]">✓ Check In Guest</button>
                        <button className="w-full rounded-[10px] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E293B]">✍ Send Waiver Link</button>
                        <button className="w-full rounded-[10px] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E293B]">💵 Collect Remaining Balance</button>
                        <button className="w-full rounded-[10px] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E293B]">🧾 Open POS Ticket</button>
                        <button className="w-full rounded-[10px] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1E293B]">🏁 Complete Event</button>
                      </div>
                    </section>
                  </div>
                )}

                {activeControlTab === "guests" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Guest Check-In + Waivers</h3>
                        <p className="mt-1 text-sm text-[#6B7280]">Guests attach to this event record as waivers and check-ins are connected.</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">{selectedParty.guests.length} added</span>
                    </div>

                    <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Add Guest To Event</p>
                      <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                        <input value={guestSearchQuery} onChange={(event) => setGuestSearchQuery(event.target.value)} className="rounded-[8px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Search child, parent, phone, or email..." />
                        <button className="rounded-[8px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">Search</button>
                        <button className="rounded-[8px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">Sign Waiver Now</button>
                      </div>
                    </div>

                    {selectedParty.guests.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {selectedParty.guests.map((guest) => (
                          <div key={guest.name} className="rounded-[10px] bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#1E293B]">{guest.name}</p>
                                <p className="mt-1 text-xs text-[#6B7280]">{guest.status}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWaiverStyles(guest.waiver)}`}>Waiver {guest.waiver}</span>
                            </div>
                            <button className="mt-3 w-full rounded-[8px] bg-[#7BAE7F] px-3 py-2 text-sm font-semibold text-white">Check In Guest</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center">
                        <p className="font-semibold text-[#1E293B]">No guests added yet</p>
                        <p className="mt-2 text-sm text-[#6B7280]">Guests will appear here after they sign a waiver or staff adds them from search.</p>
                      </div>
                    )}
                  </section>
                )}

                {activeControlTab === "payments" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Payments + Checkout</h3>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Deposit</p><p className="mt-2 font-semibold text-[#155E75]">{selectedParty.deposit}</p><p className="mt-1 text-xs text-[#6B7280]">{getDepositBadge(selectedParty.depositStatus)}</p></div>
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Balance Due</p><p className="mt-2 font-semibold text-[#9F1239]">{selectedParty.balanceDue}</p><p className="mt-1 text-xs text-[#6B7280]">Due at checkout</p></div>
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">POS Ticket</p><p className="mt-2 font-semibold text-[#1E293B]">Not Open</p><p className="mt-1 text-xs text-[#6B7280]">Coming next</p></div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button className="rounded-[10px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white">Collect Remaining Balance</button>
                      <button className="rounded-[10px] bg-[#7BAE7F] px-4 py-4 text-sm font-semibold text-white">Complete Checkout</button>
                    </div>
                  </section>
                )}

                {activeControlTab === "timeline" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Event Timeline</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{selectedParty.timelineItems.length}</span>
                    </div>
                    <div className="space-y-3">
                      {selectedParty.timelineItems.length > 0 ? (
                        selectedParty.timelineItems.map((item) => (
                          <div key={item.id} className="flex gap-3 rounded-[8px] bg-white p-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F0E6] text-xs font-semibold">{item.icon || "•"}</div>
                            <div>
                              <p className="text-sm font-semibold text-[#1E293B]">{item.title}</p>
                              <p className="mt-1 text-xs text-[#6B7280]">{formatTimelineTime(item.createdAt)}</p>
                              {item.body && <p className="mt-1 text-xs text-[#6B7280]">{item.body}</p>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[8px] bg-white p-4 text-sm text-[#6B7280]">Timeline will appear here as staff runs the event.</div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
