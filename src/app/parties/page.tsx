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

type PackageOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  depositAmount: number;
  guestLimit: number | null;
  durationMinutes: number | null;
  active: boolean;
};

type Party = {
  id: string;
  childName: string;
  title: string;
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
  deposit: string;
  balanceDue: string;
  addOns: string[];
  notes: string;
  guests: {
    name: string;
    status: string;
    waiver: string;
  }[];
};

const parties: Party[] = [
  {
    id: "party-dava",
    childName: "Dava Gray",
    title: "Dava Gray Birthday Party",
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
    deposit: "$100.00",
    balanceDue: "$200.00",
    addOns: ["Balloon Arch", "Balloon Columns"],
    notes: "Pink, teal, and white balloons. Birthday child loves princess themes.",
    guests: [
      { name: "Dava Gray", status: "Birthday Child", waiver: "Valid" },
      { name: "Taylan Smith", status: "Checked In", waiver: "Valid" },
    ],
  },
  {
    id: "party-mason",
    childName: "Mason Taylor",
    title: "Mason Taylor Birthday Party",
    eventTypeName: "Private Event",
    family: "Taylor Family",
    host: "Ashley Taylor",
    phone: "843-555-0144",
    date: "Friday, Jun 26",
    time: "6:00 PM - 8:00 PM",
    status: "Confirmed",
    packageName: "Private Party Package",
    room: "Main Party Room",
    guestCount: 18,
    deposit: "$100.00",
    balanceDue: "$275.00",
    addOns: ["Extra 30 Minutes", "Pizza Package"],
    notes: "Customer asked about adding balloon columns if available.",
    guests: [
      { name: "Mason Taylor", status: "Birthday Child", waiver: "Valid" },
      { name: "Ava Johnson", status: "Expected", waiver: "Valid" },
    ],
  },
  {
    id: "party-sophia",
    childName: "Sophia Lee",
    title: "Sophia Lee Birthday Party",
    eventTypeName: "Birthday Party",
    family: "Lee Family",
    host: "Morgan Lee",
    phone: "843-555-0188",
    date: "Saturday, Jun 27",
    time: "9:00 AM - 11:00 AM",
    status: "Pending",
    packageName: "Birthday Party Package",
    room: "Main Party Room",
    guestCount: 10,
    deposit: "$0.00",
    balanceDue: "$300.00",
    addOns: ["Balloon Arch"],
    notes: "Deposit has not been collected yet.",
    guests: [],
  },
];

const partyFilters = ["All", "Today", "This Week", "Confirmed", "Pending", "Balance Due"];

const fallbackEventTypes: EventTypeOption[] = [
  { id: "birthday-party", name: "Birthday Party", description: "", color: "#FFB768", active: true },
  { id: "private-event", name: "Private Event", description: "", color: "#3B82F6", active: true },
  { id: "field-trip", name: "Field Trip", description: "", color: "#7BAE7F", active: true },
];

const fallbackPackages: PackageOption[] = [
  {
    id: "birthday-party-package",
    name: "Birthday Party Package",
    description: "Standard party package.",
    price: 300,
    depositAmount: 100,
    guestLimit: 20,
    durationMinutes: 120,
    active: true,
  },
  {
    id: "private-party-package",
    name: "Private Party Package",
    description: "Private room and extended party time.",
    price: 375,
    depositAmount: 100,
    guestLimit: 25,
    durationMinutes: 120,
    active: true,
  },
];

const navItems = [
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Party & Events", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
];

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function makeSoftColor(hexColor: string) {
  if (!hexColor.startsWith("#") || hexColor.length !== 7) {
    return "#F6F0E6";
  }

  return `${hexColor}22`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "No duration";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours && remainingMinutes) {
    return `${hours} hr ${remainingMinutes} min`;
  }

  if (hours) {
    return `${hours} hr`;
  }

  return `${minutes} min`;
}

function getStatusStyles(status: string) {
  if (status === "Confirmed") {
    return "bg-[#D7F1EC] text-[#155E75]";
  }

  if (status === "Pending") {
    return "bg-[#FFF0C4] text-[#92400E]";
  }

  return "bg-[#F1F1F1] text-[#4B5563]";
}

function getWaiverStyles(status: string) {
  if (status === "Valid") {
    return "bg-[#D7F1EC] text-[#155E75]";
  }

  return "bg-[#FFE0E9] text-[#9F1239]";
}

function getEventIcon(eventTypeName: string) {
  const name = normalizeName(eventTypeName);

  if (name.includes("party")) return "🎂";
  if (name.includes("field")) return "🚌";
  if (name.includes("camp")) return "🏕️";
  if (name.includes("class")) return "●";
  if (name.includes("rental")) return "🔑";

  return "★";
}

export default function PartiesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeEventTypeFilter, setActiveEventTypeFilter] = useState("All Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState(parties[0].id);
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(fallbackEventTypes);
  const [packages, setPackages] = useState<PackageOption[]>(fallbackPackages);
  const [newPartyEventType, setNewPartyEventType] = useState("Birthday Party");
  const [newPartyPackageId, setNewPartyPackageId] = useState(fallbackPackages[0].id);
  const [isNewPartyOpen, setIsNewPartyOpen] = useState(false);

  useEffect(() => {
    async function loadEventTypes() {
      try {
        const response = await fetch("/api/event-types");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load event types.");
        }

        const activeEventTypes = (data.eventTypes ?? []).filter(
          (eventType: EventTypeOption) => eventType.active
        );

        if (activeEventTypes.length > 0) {
          setEventTypes(activeEventTypes);
          setNewPartyEventType(activeEventTypes[0].name);
        }
      } catch {
        setEventTypes(fallbackEventTypes);
      }
    }

    async function loadPackages() {
      try {
        const response = await fetch("/api/packages");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load packages.");
        }

        const activePackages = (data.packages ?? []).filter(
          (packageItem: PackageOption) => packageItem.active
        );

        if (activePackages.length > 0) {
          setPackages(activePackages);
          setNewPartyPackageId(activePackages[0].id);
        }
      } catch {
        setPackages(fallbackPackages);
      }
    }

    loadEventTypes();
    loadPackages();
  }, []);

  const eventTypeMap = useMemo(() => {
    return eventTypes.reduce<Record<string, EventTypeOption>>((map, eventType) => {
      map[normalizeName(eventType.name)] = eventType;
      return map;
    }, {});
  }, [eventTypes]);

  function getEventType(eventTypeName: string) {
    return eventTypeMap[normalizeName(eventTypeName)] ??
      fallbackEventTypes.find(
        (eventType) => normalizeName(eventType.name) === normalizeName(eventTypeName)
      ) ?? {
        id: eventTypeName,
        name: eventTypeName,
        description: "",
        color: "#B99AFF",
        active: true,
      };
  }

  const selectedNewPartyPackage =
    packages.find((packageItem) => packageItem.id === newPartyPackageId) ??
    packages[0] ??
    fallbackPackages[0];

  const filteredParties = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();

    return parties.filter((party) => {
      const matchesSearch =
        !cleanQuery ||
        party.title.toLowerCase().includes(cleanQuery) ||
        party.family.toLowerCase().includes(cleanQuery) ||
        party.host.toLowerCase().includes(cleanQuery) ||
        party.phone.includes(cleanQuery);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Confirmed" && party.status === "Confirmed") ||
        (activeFilter === "Pending" && party.status === "Pending") ||
        (activeFilter === "Balance Due" && party.balanceDue !== "$0.00") ||
        activeFilter === "This Week" ||
        activeFilter === "Today";

      const matchesEventType =
        activeEventTypeFilter === "All Types" ||
        normalizeName(party.eventTypeName) === normalizeName(activeEventTypeFilter);

      return matchesSearch && matchesFilter && matchesEventType;
    });
  }, [activeFilter, activeEventTypeFilter, searchQuery]);

  const selectedParty =
    parties.find((party) => party.id === selectedPartyId) ?? parties[0];

  const selectedPartyEventType = getEventType(selectedParty.eventTypeName);

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
              const isActive = item.href === "/parties";

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
              <p className="text-sm font-semibold text-[#8A6D3B]">Party Management</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Parties
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/calendar"
                className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]"
              >
                View Calendar
              </Link>
              <button
                onClick={() => setIsNewPartyOpen((current) => !current)}
                className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white"
              >
                + New Party
              </button>

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

          {isNewPartyOpen && (
            <div className="mb-3 rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#1E293B]">Start New Event</p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Event types and packages come from Company Settings.
                  </p>
                </div>

                <button
                  onClick={() => setIsNewPartyOpen(false)}
                  className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-[220px_260px_1fr_auto] gap-3">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                    Event Type
                  </span>
                  <select
                    value={newPartyEventType}
                    onChange={(event) => setNewPartyEventType(event.target.value)}
                    className="mt-2 w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm font-semibold outline-none"
                  >
                    {eventTypes.map((eventType) => (
                      <option key={eventType.id} value={eventType.name}>
                        {eventType.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                    Package
                  </span>
                  <select
                    value={newPartyPackageId}
                    onChange={(event) => setNewPartyPackageId(event.target.value)}
                    className="mt-2 w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm font-semibold outline-none"
                  >
                    {packages.map((packageItem) => (
                      <option key={packageItem.id} value={packageItem.id}>
                        {packageItem.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-6 grid grid-cols-4 gap-2 rounded-[10px] border border-black/10 bg-[#F6F0E6] px-3 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Price
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1E293B]">
                      {formatCurrency(selectedNewPartyPackage.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Deposit
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#155E75]">
                      {formatCurrency(selectedNewPartyPackage.depositAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Guests
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1E293B]">
                      {selectedNewPartyPackage.guestLimit ?? "No limit"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Duration
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1E293B]">
                      {formatDuration(selectedNewPartyPackage.durationMinutes)}
                    </p>
                  </div>
                </div>

                <button className="mt-6 rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
                  Continue
                </button>
              </div>

              {selectedNewPartyPackage.description && (
                <p className="mt-3 rounded-[10px] bg-[#F6F0E6] px-4 py-3 text-xs text-[#6B7280]">
                  {selectedNewPartyPackage.description}
                </p>
              )}
            </div>
          )}

          <div className="grid h-[calc(100vh-125px)] grid-cols-[390px_1fr] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1E293B]">Party List</p>
                  <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">
                    {filteredParties.length}
                  </span>
                </div>

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                  placeholder="Search party, host, phone..."
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {partyFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        activeFilter === filter
                          ? "bg-[#1E293B] text-white"
                          : "bg-[#F6F0E6] text-[#5B6270] hover:bg-[#EFE8DC]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {["All Types", ...eventTypes.map((eventType) => eventType.name)].map((filter) => {
                    const eventType = filter === "All Types" ? null : getEventType(filter);

                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveEventTypeFilter(filter)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          activeEventTypeFilter === filter
                            ? "border-[#1E293B] bg-[#1E293B] text-white"
                            : "border-black/10 bg-white text-[#5B6270] hover:bg-[#F6F0E6]"
                        }`}
                        style={
                          eventType && activeEventTypeFilter !== filter
                            ? {
                                borderColor: eventType.color,
                                backgroundColor: makeSoftColor(eventType.color),
                              }
                            : undefined
                        }
                      >
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
                    <button
                      key={party.id}
                      onClick={() => setSelectedPartyId(party.id)}
                      className={`w-full rounded-[10px] border p-4 text-left transition ${
                        isSelected
                          ? "border-[#1E293B] bg-[#1E293B] text-white"
                          : "border-black/10 bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                backgroundColor: isSelected
                                  ? "rgba(255,255,255,0.15)"
                                  : makeSoftColor(eventType.color),
                                color: isSelected ? "#FFFFFF" : "#1E293B",
                              }}
                            >
                              {getEventIcon(party.eventTypeName)} {party.eventTypeName}
                            </span>
                          </div>
                          <p className="font-semibold">{party.title}</p>
                          <p
                            className={`mt-1 text-xs ${
                              isSelected ? "text-white/70" : "text-[#6B7280]"
                            }`}
                          >
                            {party.date} • {party.time}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isSelected ? "bg-white/15 text-white" : getStatusStyles(party.status)
                          }`}
                        >
                          {party.status}
                        </span>
                      </div>

                      <div
                        className={`grid grid-cols-2 gap-2 text-xs ${
                          isSelected ? "text-white/70" : "text-[#6B7280]"
                        }`}
                      >
                        <span>Host: {party.host}</span>
                        <span>Guests: {party.guestCount}</span>
                        <span>Package: {party.packageName}</span>
                        <span>Balance: {party.balanceDue}</span>
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
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(selectedParty.status)}`}>
                        {selectedParty.status}
                      </span>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-semibold text-[#1E293B]"
                        style={{
                          borderColor: selectedPartyEventType.color,
                          backgroundColor: makeSoftColor(selectedPartyEventType.color),
                        }}
                      >
                        {getEventIcon(selectedParty.eventTypeName)} {selectedParty.eventTypeName}
                      </span>
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                      {selectedParty.title}
                    </h2>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      {selectedParty.date} • {selectedParty.time} • {selectedParty.room}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">
                      Edit
                    </button>
                    <button className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
                      Party Check-In
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-full overflow-y-auto p-5 pb-24">
                <div className="mb-4 grid grid-cols-4 gap-3">
                  <div className="rounded-[12px] bg-[#F6F0E6] p-4">
                    <p className="text-xs font-semibold text-[#6B7280]">Event Type</p>
                    <p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.eventTypeName}</p>
                  </div>

                  <div className="rounded-[12px] bg-[#F6F0E6] p-4">
                    <p className="text-xs font-semibold text-[#6B7280]">Package</p>
                    <p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.packageName}</p>
                  </div>

                  <div className="rounded-[12px] bg-[#F6F0E6] p-4">
                    <p className="text-xs font-semibold text-[#6B7280]">Balance Due</p>
                    <p className="mt-2 font-semibold text-[#9F1239]">{selectedParty.balanceDue}</p>
                  </div>

                  <div className="rounded-[12px] bg-[#F6F0E6] p-4">
                    <p className="text-xs font-semibold text-[#6B7280]">Guests</p>
                    <p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.guestCount}</p>
                  </div>
                </div>

                <section className="mb-4 rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                        Party Details
                      </h3>
                      {!detailsExpanded && (
                        <p className="mt-1 text-sm text-[#6B7280]">
                          {selectedParty.host} • Balance {selectedParty.balanceDue} •{" "}
                          {selectedParty.addOns.length} add-on
                          {selectedParty.addOns.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold">
                        Contact Host
                      </button>
                      <button
                        onClick={() => setDetailsExpanded((current) => !current)}
                        className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold"
                      >
                        {detailsExpanded ? "Hide Details ↑" : "Show Details ↓"}
                      </button>
                    </div>
                  </div>

                  {detailsExpanded && (
                    <div className="mt-4 grid grid-cols-[1fr_320px] gap-3">
                      <div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-[10px] bg-white p-4">
                            <p className="text-xs font-semibold text-[#6B7280]">Host</p>
                            <p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.host}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">{selectedParty.phone}</p>
                          </div>

                          <div className="rounded-[10px] bg-white p-4">
                            <p className="text-xs font-semibold text-[#6B7280]">Family</p>
                            <p className="mt-2 font-semibold text-[#1E293B]">{selectedParty.family}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              Birthday Child: {selectedParty.childName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-[10px] bg-white p-4">
                          <p className="text-xs font-semibold text-[#6B7280]">Notes</p>
                          <p className="mt-2 text-sm text-[#1E293B]">{selectedParty.notes}</p>
                        </div>
                      </div>

                      <div className="rounded-[10px] bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#1E293B]">Add-Ons</p>
                          <button className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">
                            Manage
                          </button>
                        </div>

                        <div className="space-y-2">
                          {selectedParty.addOns.map((addOn) => (
                            <div
                              key={addOn}
                              className="flex items-center justify-between rounded-[8px] bg-[#F6F0E6] px-3 py-3"
                            >
                              <span className="text-sm font-semibold text-[#1E293B]">{addOn}</span>
                              <span className="text-xs font-medium text-[#6B7280]">Added</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                        Party Guest Check-In
                      </h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Add guests after their waiver creates or matches a family record.
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">
                      {selectedParty.guests.length} added
                    </span>
                  </div>

                  <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Add Guest To Party
                    </p>

                    <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                      <input
                        value={guestSearchQuery}
                        onChange={(event) => setGuestSearchQuery(event.target.value)}
                        className="rounded-[8px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                        placeholder="Search child, parent, phone, or email..."
                      />

                      <button className="rounded-[8px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">
                        Search
                      </button>

                      <button className="rounded-[8px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
                        Sign Waiver Now
                      </button>
                    </div>

                    {guestSearchQuery && (
                      <div className="mt-3 rounded-[8px] border border-black/10 bg-[#F6F0E6] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#1E293B]">
                              Search result preview
                            </p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              Matching families/children will appear here once connected to the database.
                            </p>
                          </div>

                          <button className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">
                            Add To Party
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="mt-3 text-xs text-[#6B7280]">
                      Waivers become the intake source of truth: parent profile, family, children, and waiver status all come from the same form.
                    </p>
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

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getWaiverStyles(
                                guest.waiver
                              )}`}
                            >
                              Waiver {guest.waiver}
                            </span>
                          </div>

                          <button className="mt-3 w-full rounded-[8px] bg-[#7BAE7F] px-3 py-2 text-sm font-semibold text-white">
                            Check In Guest
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center">
                      <p className="font-semibold text-[#1E293B]">No guests added yet</p>
                      <p className="mt-2 text-sm text-[#6B7280]">
                        Guests will appear here after they sign a waiver or staff adds them from the search above.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
