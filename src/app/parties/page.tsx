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

type EventTimelineItem = {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  createdAt: string;
};

type EventGuestRecord = {
  id: string;
  guestName: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  parentName?: string | null;
  status: string;
  waiverStatus?: string | null;
  waiverSignedAt?: string | null;
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
  depositMethod: string | null;
  balanceDue: number;
  notes: string;
  inviteUrl: string | null;
  timelineItems: EventTimelineItem[];
  guests?: EventGuestRecord[];
};

type PartyMode = "before" | "during" | "after";

type PartyGuest = {
  id: string;
  name: string;
  parentName: string;
  email: string;
  phone: string;
  status: string;
  waiver: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
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
  expectedCount: number;
  checkedInCount: number;
  checkedOutCount: number;
  noShowCount: number;
  waiverNeededCount: number;
  deposit: string;
  depositStatus: string;
  balanceDue: string;
  balanceDueNumber: number;
  addOns: string[];
  notes: string;
  inviteUrl: string | null;
  timelineItems: EventTimelineItem[];
  guests: PartyGuest[];
};

const fallbackEventTypes: EventTypeOption[] = [
  {
    id: "birthday-party",
    name: "Birthday Party",
    description: "",
    color: "#FFB768",
    active: true,
  },
  {
    id: "private-event",
    name: "Private Event",
    description: "",
    color: "#3B82F6",
    active: true,
  },
  {
    id: "field-trip",
    name: "Field Trip",
    description: "",
    color: "#7BAE7F",
    active: true,
  },
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
    expectedCount: 1,
    checkedInCount: 2,
    checkedOutCount: 0,
    noShowCount: 0,
    waiverNeededCount: 1,
    deposit: "$100.00",
    depositStatus: "CASH_COLLECTED",
    balanceDue: "$200.00",
    balanceDueNumber: 200,
    addOns: ["Balloon Arch", "Balloon Columns"],
    notes:
      "Pink, teal, and white balloons. Birthday child loves princess themes.",
    inviteUrl: "http://localhost:3000/rsvp/sample-party-link",
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
      {
        id: "sample-guest-1",
        name: "Dava Gray",
        parentName: "Nicole Gray",
        email: "",
        phone: "",
        status: "Birthday Child",
        waiver: "Valid",
        checkedInAt: new Date().toISOString(),
        checkedOutAt: null,
      },
      {
        id: "sample-guest-2",
        name: "Taylan Smith",
        parentName: "",
        email: "",
        phone: "",
        status: "Checked In",
        waiver: "Valid",
        checkedInAt: new Date().toISOString(),
        checkedOutAt: null,
      },
      {
        id: "sample-guest-3",
        name: "Liam Johnson",
        parentName: "",
        email: "",
        phone: "",
        status: "Expected",
        waiver: "Needed",
        checkedInAt: null,
        checkedOutAt: null,
      },
    ],
  },
];

const partyFilters = [
  "All",
  "Today",
  "This Week",
  "Confirmed",
  "Pending",
  "Balance Due",
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
  return `${hexColor}22`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimelineTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusStyles(status: string) {
  if (status === "CONFIRMED" || status === "Confirmed")
    return "bg-[#D7F1EC] text-[#155E75]";
  if (status === "PENDING" || status === "Pending")
    return "bg-[#FFF0C4] text-[#92400E]";
  if (status === "IN_PROGRESS" || status === "In Progress")
    return "bg-[#EEF5FF] text-[#0B55C6]";
  if (status === "COMPLETED" || status === "Completed")
    return "bg-[#F1F1F1] text-[#4B5563]";
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
  if (depositStatus === "CASH_COLLECTED" || depositStatus === "CARD_COLLECTED")
    return "bg-[#D7F1EC] text-[#155E75]";
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
  if (
    title.toLowerCase().includes("field") ||
    packageName.toLowerCase().includes("field")
  )
    return "Field Trip";
  if (
    title.toLowerCase().includes("private") ||
    packageName.toLowerCase().includes("private")
  )
    return "Private Event";
  if (
    title.toLowerCase().includes("birthday") ||
    packageName.toLowerCase().includes("birthday")
  )
    return "Birthday Party";
  return "Birthday Party";
}

function normalizeGuestStatus(guest: EventGuestRecord) {
  if (guest.status === "CHECKED_OUT" || guest.checkedOutAt)
    return "Checked Out";
  if (guest.status === "CHECKED_IN" || guest.checkedInAt) return "Checked In";
  if (guest.status === "NO_SHOW") return "No Show";
  return "Expected";
}

function normalizeEventToParty(event: EventRecord): Party {
  const fallbackGuestName = event.guestOfHonor || "Guest of Honor";
  const realGuests = event.guests ?? [];
  const guests =
    realGuests.length > 0
      ? realGuests.map((guest) => ({
          id: guest.id,
          name: guest.guestName || "Unnamed Guest",
          parentName: guest.parentName || "",
          email: guest.guestEmail || "",
          phone: guest.guestPhone || "",
          status: normalizeGuestStatus(guest),
          waiver: guest.waiverStatus === "SIGNED" ? "Valid" : "Needed",
          checkedInAt: guest.checkedInAt,
          checkedOutAt: guest.checkedOutAt ?? null,
        }))
      : event.guestOfHonor
        ? [
            {
              id: `${event.id}-guest-of-honor`,
              name: fallbackGuestName,
              parentName: "",
              email: "",
              phone: "",
              status: "Guest of Honor",
              waiver: "Needed",
              checkedInAt: null,
              checkedOutAt: null,
            },
          ]
        : [];

  const expectedCount = realGuests.filter(
    (guest) => guest.status === "EXPECTED",
  ).length;
  const checkedInCount = realGuests.filter(
    (guest) => guest.status === "CHECKED_IN",
  ).length;
  const checkedOutCount = realGuests.filter(
    (guest) => guest.status === "CHECKED_OUT",
  ).length;
  const noShowCount = realGuests.filter(
    (guest) => guest.status === "NO_SHOW",
  ).length;
  const waiverNeededCount = guests.filter(
    (guest) => guest.waiver !== "Valid",
  ).length;

  return {
    id: event.id,
    childName: fallbackGuestName,
    title: event.title,
    eventNumber: event.eventNumber || "EVT",
    eventTypeName: guessEventTypeName(event),
    family: "Family Record Pending",
    host: "Booking Customer",
    phone: "Saved with booking",
    date: formatDate(event.eventDate),
    time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
    status:
      event.status === "CONFIRMED"
        ? "Confirmed"
        : event.status === "PENDING"
          ? "Pending"
          : event.status,
    packageName: event.packageName || "No package",
    room: "Main Party Room",
    guestCount: Math.max(guests.length, event.guestOfHonor ? 1 : 0),
    expectedCount,
    checkedInCount,
    checkedOutCount,
    noShowCount,
    waiverNeededCount,
    deposit: formatCurrency(event.depositAmount),
    depositStatus: event.depositStatus,
    balanceDue: formatCurrency(event.balanceDue),
    balanceDueNumber: event.balanceDue,
    addOns: [],
    notes: event.notes || "No notes yet.",
    inviteUrl: event.inviteUrl,
    timelineItems: event.timelineItems ?? [],
    guests,
  };
}

function getPartyMode(status: string): PartyMode {
  if (status === "IN_PROGRESS" || status === "In Progress") return "during";
  if (status === "COMPLETED" || status === "Completed") return "after";
  return "before";
}

export default function PartiesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeEventTypeFilter, setActiveEventTypeFilter] =
    useState("All Types");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState(fallbackParties[0].id);
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [eventTypes, setEventTypes] =
    useState<EventTypeOption[]>(fallbackEventTypes);
  const [parties, setParties] = useState<Party[]>(fallbackParties);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [openCard, setOpenCard] = useState("next");
  const [copyStatus, setCopyStatus] = useState("");
  const [activeGuestAction, setActiveGuestAction] = useState("");
  const [guestActionError, setGuestActionError] = useState("");

  const loadPartyManagerData = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) setLoadingEvents(true);

        const [eventTypesResponse, eventsResponse] = await Promise.all([
          fetch("/api/event-types", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
        ]);
        const [eventTypesData, eventsData] = await Promise.all([
          eventTypesResponse.json(),
          eventsResponse.json(),
        ]);

        if (eventTypesResponse.ok) {
          const activeEventTypes = (eventTypesData.eventTypes ?? []).filter(
            (eventType: EventTypeOption) => eventType.active,
          );
          if (activeEventTypes.length > 0) setEventTypes(activeEventTypes);
        }

        if (eventsResponse.ok) {
          const realParties = (eventsData.events ?? []).map(
            normalizeEventToParty,
          );
          if (realParties.length > 0) {
            setParties(realParties);
            setSelectedPartyId((currentPartyId) =>
              realParties.some((party: Party) => party.id === currentPartyId)
                ? currentPartyId
                : realParties[0].id,
            );
          }
        }
      } catch {
        if (!options?.silent) setParties(fallbackParties);
      } finally {
        if (!options?.silent) setLoadingEvents(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadPartyManagerData();

    const refreshTimer = window.setInterval(() => {
      loadPartyManagerData({ silent: true });
    }, 5000);

    return () => window.clearInterval(refreshTimer);
  }, [loadPartyManagerData]);

  const eventTypeMap = useMemo(() => {
    return eventTypes.reduce<Record<string, EventTypeOption>>(
      (map, eventType) => {
        map[normalizeName(eventType.name)] = eventType;
        return map;
      },
      {},
    );
  }, [eventTypes]);

  function getEventType(eventTypeName: string) {
    return (
      eventTypeMap[normalizeName(eventTypeName)] ??
      fallbackEventTypes.find(
        (eventType) =>
          normalizeName(eventType.name) === normalizeName(eventTypeName),
      ) ?? {
        id: eventTypeName,
        name: eventTypeName,
        description: "",
        color: "#B99AFF",
        active: true,
      }
    );
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

      const matchesEventType =
        activeEventTypeFilter === "All Types" ||
        normalizeName(party.eventTypeName) ===
          normalizeName(activeEventTypeFilter);
      return matchesSearch && matchesFilter && matchesEventType;
    });
  }, [activeFilter, activeEventTypeFilter, parties, searchQuery]);

  const selectedParty =
    parties.find((party) => party.id === selectedPartyId) ??
    parties[0] ??
    fallbackParties[0];
  const selectedPartyEventType = getEventType(selectedParty.eventTypeName);
  const partyMode = getPartyMode(selectedParty.status);

  const visibleGuests = useMemo(() => {
    const cleanQuery = guestSearchQuery.trim().toLowerCase();

    if (!cleanQuery) return selectedParty.guests;

    return selectedParty.guests.filter((guest) => {
      return (
        guest.name.toLowerCase().includes(cleanQuery) ||
        guest.parentName.toLowerCase().includes(cleanQuery) ||
        guest.email.toLowerCase().includes(cleanQuery) ||
        guest.phone.toLowerCase().includes(cleanQuery) ||
        guest.status.toLowerCase().includes(cleanQuery) ||
        guest.waiver.toLowerCase().includes(cleanQuery)
      );
    });
  }, [guestSearchQuery, selectedParty.guests]);

  const eventReadiness = [
    {
      label: "Deposit",
      value: getDepositBadge(selectedParty.depositStatus),
      done: selectedParty.depositStatus !== "PENDING",
    },
    {
      label: "Waivers",
      value:
        selectedParty.waiverNeededCount === 0
          ? "Complete"
          : `${selectedParty.waiverNeededCount} needed`,
      done: selectedParty.waiverNeededCount === 0,
    },
    {
      label: "Guests",
      value: `${selectedParty.checkedInCount}/${Math.max(selectedParty.guestCount, 1)} checked in`,
      done:
        selectedParty.guestCount > 0 &&
        selectedParty.checkedInCount >= selectedParty.guestCount,
    },
    {
      label: "Balance",
      value:
        selectedParty.balanceDueNumber > 0 ? selectedParty.balanceDue : "Paid",
      done: selectedParty.balanceDueNumber <= 0,
    },
  ];

  const completedReadiness = eventReadiness.filter((item) => item.done).length;
  const readinessPercent = Math.round(
    (completedReadiness / eventReadiness.length) * 100,
  );

  const checklist =
    partyMode === "before"
      ? [
          { label: "Review booking details", done: true },
          { label: "Send RSVP link", done: Boolean(selectedParty.inviteUrl) },
          {
            label: "Collect waivers",
            done: selectedParty.waiverNeededCount === 0,
          },
          { label: "Set up room", done: false },
          { label: "Start party", done: false },
        ]
      : partyMode === "during"
        ? [
            {
              label: "Check in guests",
              done: selectedParty.checkedInCount > 0,
            },
            {
              label: "Collect remaining balance",
              done: selectedParty.balanceDueNumber <= 0,
            },
            { label: "Open POS ticket", done: false },
            { label: "Close event", done: false },
          ]
        : [
            { label: "Send thank-you email", done: false },
            { label: "Save customer notes", done: false },
            { label: "Invite to book again", done: false },
          ];

  const nextStep =
    checklist.find((item) => !item.done) ?? checklist[checklist.length - 1];

  const primaryAction =
    partyMode === "before"
      ? selectedParty.waiverNeededCount > 0
        ? "Send RSVP + Waiver Link"
        : "Start Party"
      : partyMode === "during"
        ? selectedParty.balanceDueNumber > 0
          ? "Collect Remaining Balance"
          : "Complete Event"
        : "Send Thank You";

  async function copyInviteLink() {
    if (!selectedParty.inviteUrl) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(selectedParty.inviteUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = selectedParty.inviteUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopyStatus("Copied!");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 1800);
    }
  }

  function openInviteLink() {
    if (!selectedParty.inviteUrl) return;
    window.open(selectedParty.inviteUrl, "_blank", "noopener,noreferrer");
  }

  function emailInviteLink() {
    if (!selectedParty.inviteUrl) return;

    const subject = encodeURIComponent(`RSVP link for ${selectedParty.title}`);
    const body = encodeURIComponent(
      `Here is your RSVP + waiver link for ${selectedParty.title}:\n\n${selectedParty.inviteUrl}\n\nYou can send this to your guests so they can RSVP and sign the waiver before the event.`,
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async function runGuestAction(
    guest: PartyGuest,
    action: "check-in" | "check-out" | "no-show",
  ) {
    const actionKey = `${guest.id}:${action}`;
    setActiveGuestAction(actionKey);
    setGuestActionError("");

    try {
      const response = await fetch(
        `/api/events/${selectedParty.id}/guests/${guest.id}/${action}`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update guest.");
      }

      await loadPartyManagerData({ silent: true });
    } catch (error) {
      setGuestActionError(
        error instanceof Error ? error.message : "Unable to update guest.",
      );
    } finally {
      setActiveGuestAction("");
    }
  }

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
                <h1 className="text-lg font-semibold tracking-[-0.03em]">
                  PlayFlow
                </h1>
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
                  className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"}`}
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
              <p className="text-sm font-semibold text-[#8A6D3B]">Operations</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Party Control Center
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/bookings"
                className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white"
              >
                + New Booking
              </Link>
              <Link
                href="/calendar"
                className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]"
              >
                View Calendar
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
                <span className="text-sm font-medium text-[#1E293B]">
                  Devin
                </span>
              </div>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[360px_1fr_300px] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1E293B]">Events</p>
                  <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">
                    {loadingEvents ? "Loading..." : filteredParties.length}
                  </span>
                </div>

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                  placeholder="Search event, package, event number..."
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {partyFilters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeFilter === filter ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270] hover:bg-[#EFE8DC]"}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "All Types",
                    ...eventTypes.map((eventType) => eventType.name),
                  ].map((filter) => {
                    const eventType =
                      filter === "All Types" ? null : getEventType(filter);
                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveEventTypeFilter(filter)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${activeEventTypeFilter === filter ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-white text-[#5B6270] hover:bg-[#F6F0E6]"}`}
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
                      className={`w-full rounded-[10px] border p-4 text-left transition ${isSelected ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}
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
                              {getEventIcon(party.eventTypeName)}{" "}
                              {party.eventTypeName}
                            </span>
                          </div>
                          <p className="font-semibold">{party.title}</p>
                          <p
                            className={`mt-1 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}
                          >
                            {party.eventNumber} • {party.date}
                          </p>
                          <p
                            className={`mt-1 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}
                          >
                            {party.time}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : getStatusStyles(party.status)}`}
                        >
                          {party.status}
                        </span>
                      </div>

                      <div
                        className={`grid grid-cols-2 gap-2 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}
                      >
                        <span>Balance: {party.balanceDue}</span>
                        <span>Waivers: {party.waiverNeededCount} needed</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div
                className="border-b border-black/10 p-5"
                style={{
                  background: `linear-gradient(90deg, ${makeSoftColor(selectedPartyEventType.color)} 0%, #FFFFFF 65%)`,
                }}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(selectedParty.status)}`}
                      >
                        {selectedParty.status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getDepositStyles(selectedParty.depositStatus)}`}
                      >
                        {getDepositBadge(selectedParty.depositStatus)}
                      </span>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-semibold text-[#1E293B]"
                        style={{
                          borderColor: selectedPartyEventType.color,
                          backgroundColor: makeSoftColor(
                            selectedPartyEventType.color,
                          ),
                        }}
                      >
                        {getEventIcon(selectedParty.eventTypeName)}{" "}
                        {selectedParty.eventTypeName}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                        {selectedParty.title}
                      </h2>
                      {selectedParty.inviteUrl && (
                        <button
                          onClick={openInviteLink}
                          title="Open RSVP link"
                          className="rounded-full border border-[#B7D4FF] bg-[#EEF5FF] px-3 py-1 text-xs font-semibold text-[#0B55C6]"
                        >
                          RSVP Link
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      {selectedParty.eventNumber} • {selectedParty.date} •{" "}
                      {selectedParty.time}
                    </p>
                  </div>

                  <button className="rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white">
                    {primaryAction}
                  </button>
                </div>
              </div>

              <div className="h-full overflow-y-auto p-5 pb-24">
                <section className="mb-4 rounded-[14px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">
                        {partyMode === "before"
                          ? "Before Party"
                          : partyMode === "during"
                            ? "During Party"
                            : "After Party"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                        Next Step: {nextStep.label}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                        {readinessPercent}%
                      </p>
                      <p className="text-xs font-semibold text-[#6B7280]">
                        Ready
                      </p>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#1E293B] transition-all duration-300"
                      style={{ width: `${readinessPercent}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {eventReadiness.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[10px] bg-white p-4"
                      >
                        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F0E6] text-sm font-semibold">
                          {item.done ? "✓" : "!"}
                        </div>
                        <p className="text-xs font-semibold text-[#6B7280]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#1E293B]">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-4 rounded-[14px] border border-black/10 bg-white p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      {
                        key: "next",
                        label: `${selectedParty.eventTypeName} Checklist`,
                        detail: `${checklist.filter((item) => item.done).length}/${checklist.length} complete`,
                      },
                      {
                        key: "guests",
                        label: "Guest Check-In",
                        detail: `${selectedParty.checkedInCount} in • ${selectedParty.checkedOutCount} out`,
                      },
                      {
                        key: "money",
                        label: "Payments",
                        detail:
                          selectedParty.balanceDueNumber > 0
                            ? selectedParty.balanceDue
                            : "Paid",
                      },
                      {
                        key: "timeline",
                        label: "Timeline",
                        detail: `${selectedParty.timelineItems.length} events`,
                      },
                      {
                        key: "details",
                        label: "Details + Notes",
                        detail: selectedParty.packageName,
                      },
                    ].map((card) => (
                      <button
                        key={card.key}
                        onClick={() =>
                          setOpenCard((current) =>
                            current === card.key ? "" : card.key,
                          )
                        }
                        className={`min-h-[70px] rounded-[10px] border px-3 py-2.5 text-left transition ${openCard === card.key ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}
                      >
                        <span className="block text-xs font-semibold leading-tight">
                          {card.label}
                        </span>
                        <span
                          className={`mt-2 block text-[11px] leading-tight ${openCard === card.key ? "text-white/70" : "text-[#6B7280]"}`}
                        >
                          {card.detail}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                {openCard === "next" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                      {selectedParty.eventTypeName} Checklist
                    </h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Checklist items will change by event type as each event
                      workflow is defined.
                    </p>

                    <div className="mt-4 space-y-2">
                      {checklist.map((item, index) => {
                        const isNext = item.label === nextStep.label;

                        return (
                          <div
                            key={item.label}
                            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${isNext ? "border border-[#1E293B] bg-white" : item.done ? "bg-white/70" : "bg-white"}`}
                          >
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${item.done ? "bg-[#D7F1EC] text-[#155E75]" : isNext ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#6B7280]"}`}
                            >
                              {item.done ? "✓" : index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-[#1E293B]">
                                {item.label}
                              </p>
                              {isNext && (
                                <p className="text-[11px] text-[#6B7280]">
                                  Next action
                                </p>
                              )}
                            </div>
                            {isNext && (
                              <button className="rounded-[8px] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-white">
                                {primaryAction}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {openCard === "guests" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                          Guest Check-In + Waivers
                        </h3>
                        <p className="mt-1 text-sm text-[#6B7280]">
                          Guests move from expected to checked in, checked out,
                          or no-show as the party runs.
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">
                        {selectedParty.guests.length} added
                      </span>
                    </div>

                    <div className="mb-3 grid grid-cols-4 gap-2">
                      <div className="rounded-[10px] bg-white p-3">
                        <p className="text-[11px] font-semibold text-[#6B7280]">
                          Expected
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#1E293B]">
                          {selectedParty.expectedCount}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-3">
                        <p className="text-[11px] font-semibold text-[#6B7280]">
                          Checked In
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#155E75]">
                          {selectedParty.checkedInCount}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-3">
                        <p className="text-[11px] font-semibold text-[#6B7280]">
                          Checked Out
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#1E293B]">
                          {selectedParty.checkedOutCount}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-3">
                        <p className="text-[11px] font-semibold text-[#6B7280]">
                          No Show
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#92400E]">
                          {selectedParty.noShowCount}
                        </p>
                      </div>
                    </div>

                    {guestActionError && (
                      <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FFE0E9] p-3 text-sm font-semibold text-[#9F1239]">
                        {guestActionError}
                      </div>
                    )}

                    <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <input
                          value={guestSearchQuery}
                          onChange={(event) =>
                            setGuestSearchQuery(event.target.value)
                          }
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
                    </div>

                    {selectedParty.guests.length > 0 ? (
                      visibleGuests.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {visibleGuests.map((guest) => {
                            const isCheckedIn =
                              guest.status === "Checked In" ||
                              Boolean(guest.checkedInAt);
                            const isCheckedOut =
                              guest.status === "Checked Out" ||
                              Boolean(guest.checkedOutAt);
                            const isNoShow = guest.status === "No Show";
                            const isBusy = activeGuestAction.startsWith(
                              `${guest.id}:`,
                            );

                            return (
                              <div
                                key={guest.id}
                                className="rounded-[10px] bg-white p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-[#1E293B]">
                                      {guest.name}
                                    </p>
                                    <p className="mt-1 text-xs text-[#6B7280]">
                                      {guest.status}
                                    </p>
                                    {guest.parentName && (
                                      <p className="mt-1 text-xs text-[#6B7280]">
                                        Parent: {guest.parentName}
                                      </p>
                                    )}
                                  </div>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getWaiverStyles(guest.waiver)}`}
                                  >
                                    Waiver {guest.waiver}
                                  </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <button
                                    onClick={() =>
                                      runGuestAction(guest, "check-in")
                                    }
                                    disabled={
                                      isCheckedIn ||
                                      isCheckedOut ||
                                      isNoShow ||
                                      isBusy
                                    }
                                    className={`rounded-[8px] px-3 py-2 text-xs font-semibold text-white ${isCheckedIn ? "bg-[#9CA3AF]" : "bg-[#7BAE7F] disabled:opacity-60"}`}
                                  >
                                    {activeGuestAction ===
                                    `${guest.id}:check-in`
                                      ? "Checking..."
                                      : isCheckedIn
                                        ? "In"
                                        : "Check In"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      runGuestAction(guest, "check-out")
                                    }
                                    disabled={
                                      !isCheckedIn || isCheckedOut || isBusy
                                    }
                                    className={`rounded-[8px] px-3 py-2 text-xs font-semibold text-white ${isCheckedOut ? "bg-[#9CA3AF]" : "bg-[#1E293B] disabled:opacity-40"}`}
                                  >
                                    {activeGuestAction ===
                                    `${guest.id}:check-out`
                                      ? "Saving..."
                                      : isCheckedOut
                                        ? "Out"
                                        : "Check Out"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      runGuestAction(guest, "no-show")
                                    }
                                    disabled={
                                      isCheckedIn ||
                                      isCheckedOut ||
                                      isNoShow ||
                                      isBusy
                                    }
                                    className={`rounded-[8px] px-3 py-2 text-xs font-semibold text-white ${isNoShow ? "bg-[#9CA3AF]" : "bg-[#92400E] disabled:opacity-40"}`}
                                  >
                                    {activeGuestAction === `${guest.id}:no-show`
                                      ? "Saving..."
                                      : isNoShow
                                        ? "No Show"
                                        : "No Show"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center">
                          <p className="font-semibold text-[#1E293B]">
                            No guests match that search
                          </p>
                          <p className="mt-2 text-sm text-[#6B7280]">
                            Clear the search field to see the full RSVP list.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center">
                        <p className="font-semibold text-[#1E293B]">
                          No guests added yet
                        </p>
                        <p className="mt-2 text-sm text-[#6B7280]">
                          Send the RSVP link so guests can add themselves and
                          sign the waiver before the party.
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {openCard === "money" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                      Payments + Checkout
                    </h3>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Deposit
                        </p>
                        <p className="mt-2 font-semibold text-[#155E75]">
                          {selectedParty.deposit}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {getDepositBadge(selectedParty.depositStatus)}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Balance Due
                        </p>
                        <p className="mt-2 font-semibold text-[#9F1239]">
                          {selectedParty.balanceDue}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          Due at checkout
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          POS Ticket
                        </p>
                        <p className="mt-2 font-semibold text-[#1E293B]">
                          Not Open
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          Coming next
                        </p>
                      </div>
                    </div>
                    {selectedParty.balanceDueNumber > 0 && (
                      <button className="mt-4 w-full rounded-[10px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white">
                        Collect Remaining Balance
                      </button>
                    )}
                  </section>
                )}

                {openCard === "timeline" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                        Event Timeline
                      </h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                        {selectedParty.timelineItems.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedParty.timelineItems.length > 0 ? (
                        selectedParty.timelineItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 rounded-[8px] bg-white p-3"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F0E6] text-xs font-semibold">
                              {item.icon || "•"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1E293B]">
                                {item.title}
                              </p>
                              <p className="mt-1 text-xs text-[#6B7280]">
                                {formatTimelineTime(item.createdAt)}
                              </p>
                              {item.body && (
                                <p className="mt-1 text-xs text-[#6B7280]">
                                  {item.body}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[8px] bg-white p-4 text-sm text-[#6B7280]">
                          Timeline will appear here as staff runs the event.
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {openCard === "details" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                      Details + Notes
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Guest of Honor
                        </p>
                        <p className="mt-2 font-semibold text-[#1E293B]">
                          {selectedParty.childName}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Package
                        </p>
                        <p className="mt-2 font-semibold text-[#1E293B]">
                          {selectedParty.packageName}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Room
                        </p>
                        <p className="mt-2 font-semibold text-[#1E293B]">
                          {selectedParty.room}
                        </p>
                      </div>
                      <div className="rounded-[10px] bg-white p-4">
                        <p className="text-xs font-semibold text-[#6B7280]">
                          Customer
                        </p>
                        <p className="mt-2 font-semibold text-[#1E293B]">
                          {selectedParty.host}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-[10px] bg-white p-4">
                      <p className="text-xs font-semibold text-[#6B7280]">
                        Notes / Balloon Colors
                      </p>
                      <p className="mt-2 text-sm text-[#1E293B]">
                        {selectedParty.notes}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </section>

            <aside className="space-y-3 overflow-y-auto">
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#6B7280]">
                  At a Glance
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Mode</span>
                    <span className="font-semibold capitalize text-[#1E293B]">
                      {partyMode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Ready</span>
                    <span className="font-semibold text-[#1E293B]">
                      {readinessPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Expected</span>
                    <span className="font-semibold text-[#1E293B]">
                      {selectedParty.expectedCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Checked In</span>
                    <span className="font-semibold text-[#1E293B]">
                      {selectedParty.checkedInCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Checked Out</span>
                    <span className="font-semibold text-[#1E293B]">
                      {selectedParty.checkedOutCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Balance</span>
                    <span className="font-semibold text-[#9F1239]">
                      {selectedParty.balanceDue}
                    </span>
                  </div>
                </div>
              </section>

              {selectedParty.inviteUrl && (
                <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-[#6B7280]">
                    RSVP + Waiver Link
                  </p>
                  <p className="mt-2 break-all rounded-[8px] bg-[#F6F0E6] p-3 text-xs text-[#1E293B]">
                    {selectedParty.inviteUrl}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={openInviteLink}
                      className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]"
                    >
                      Open
                    </button>
                    <button
                      onClick={copyInviteLink}
                      className="rounded-[8px] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Copy
                    </button>
                    <button
                      onClick={emailInviteLink}
                      className="rounded-[8px] border border-[#B7D4FF] bg-[#EEF5FF] px-3 py-2 text-xs font-semibold text-[#0B55C6]"
                    >
                      Email
                    </button>
                  </div>
                  {copyStatus && (
                    <p className="mt-2 rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold text-[#1E293B]">
                      {copyStatus}
                    </p>
                  )}
                </section>
              )}

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#6B7280]">
                  Quiet Quick Actions
                </p>
                <div className="mt-3 space-y-2">
                  <button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">
                    Send Reminder
                  </button>
                  <button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">
                    Add Staff Note
                  </button>
                  <button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">
                    Open POS Ticket
                  </button>
                  <button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">
                    Print Receipt
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
