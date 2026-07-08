"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type EventTimelineItem = { id: string; title: string; body: string | null; icon: string | null; createdAt: string };
type EventGuestRecord = { id: string; guestName: string | null; guestEmail?: string | null; guestPhone?: string | null; parentName?: string | null; status: string; waiverStatus?: string | null; checkedInAt: string | null; checkedOutAt?: string | null };
type EventRecord = { id: string; eventNumber: string | null; title: string; eventDate: string; startTime: string; endTime: string; status: string; packageName: string | null; guestOfHonor: string | null; depositAmount: number; depositStatus: string; depositMethod: string | null; balanceDue: number; notes: string; inviteUrl: string | null; timelineItems: EventTimelineItem[]; guests?: EventGuestRecord[] };
type PartyMode = "before" | "during" | "after";
type PartyGuest = { id: string; name: string; parentName: string; email: string; phone: string; status: string; waiver: string; checkedInAt: string | null; checkedOutAt: string | null };
type Party = { id: string; childName: string; title: string; eventNumber: string; eventTypeName: string; host: string; phone: string; date: string; time: string; status: string; packageName: string; room: string; guestCount: number; expectedCount: number; checkedInCount: number; checkedOutCount: number; noShowCount: number; waiverNeededCount: number; deposit: string; depositStatus: string; balanceDue: string; balanceDueNumber: number; notes: string; inviteUrl: string | null; timelineItems: EventTimelineItem[]; guests: PartyGuest[] };

const fallbackParty: Party = { id: "", childName: "Guest of Honor", title: "Loading Party", eventNumber: "EVT", eventTypeName: "Birthday Party", host: "Booking Customer", phone: "Saved with booking", date: "Date TBD", time: "Time TBD", status: "Loading", packageName: "No package", room: "Main Party Room", guestCount: 0, expectedCount: 0, checkedInCount: 0, checkedOutCount: 0, noShowCount: 0, waiverNeededCount: 0, deposit: "$0.00", depositStatus: "PENDING", balanceDue: "$0.00", balanceDueNumber: 0, notes: "No notes yet.", inviteUrl: null, timelineItems: [], guests: [] };

function normalizeName(value: string) { return value.trim().toLowerCase(); }
function makeSoftColor(hexColor: string) { if (!hexColor.startsWith("#") || hexColor.length !== 7) return "#F6F0E6"; return `${hexColor}22`; }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Date TBD"; return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }
function formatTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Time TBD"; return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function formatTimelineTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function formatShortTime(value: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function getStatusLabel(status: string) { if (status === "CONFIRMED") return "Confirmed"; if (status === "PENDING") return "Pending"; if (status === "IN_PROGRESS") return "In Progress"; if (status === "COMPLETED") return "Completed"; if (status === "CANCELLED") return "Cancelled"; return status; }
function getStatusStyles(status: string) { if (status === "Cancelled" || status === "CANCELLED") return "bg-[#FFE0E9] text-[#9F1239]"; if (status === "Confirmed" || status === "CONFIRMED") return "bg-[#D7F1EC] text-[#155E75]"; if (status === "Pending" || status === "PENDING") return "bg-[#FFF0C4] text-[#92400E]"; if (status === "In Progress" || status === "IN_PROGRESS") return "bg-[#EEF5FF] text-[#0B55C6]"; return "bg-[#F1F1F1] text-[#4B5563]"; }
function getWaiverStyles(status: string) { if (status === "Valid") return "bg-[#D7F1EC] text-[#155E75]"; return "bg-[#FFE0E9] text-[#9F1239]"; }
function getGuestStatusStyles(status: string) { if (status === "Checked In") return "bg-[#D7F1EC] text-[#155E75]"; if (status === "Checked Out") return "bg-[#EEF5FF] text-[#0B55C6]"; if (status === "No Show") return "bg-[#F1F1F1] text-[#4B5563]"; return "bg-[#FFF0C4] text-[#92400E]"; }
function getDepositBadge(depositStatus: string) { if (depositStatus === "CASH_COLLECTED") return "Cash Deposit"; if (depositStatus === "CARD_COLLECTED") return "Card Deposit"; if (depositStatus === "WAIVED") return "Deposit Waived"; return "Deposit Pending"; }
function getDepositStyles(depositStatus: string) { if (depositStatus === "CASH_COLLECTED" || depositStatus === "CARD_COLLECTED") return "bg-[#D7F1EC] text-[#155E75]"; if (depositStatus === "WAIVED") return "bg-[#F1F1F1] text-[#4B5563]"; return "bg-[#FFF0C4] text-[#92400E]"; }
function getEventIcon(eventTypeName: string) { const name = normalizeName(eventTypeName); if (name.includes("party")) return "🎂"; if (name.includes("field")) return "🚌"; if (name.includes("private")) return "🔒"; return "★"; }
function guessEventTypeName(event: EventRecord) { const title = event.title || ""; const packageName = event.packageName || ""; if (title.toLowerCase().includes("field") || packageName.toLowerCase().includes("field")) return "Field Trip"; if (title.toLowerCase().includes("private") || packageName.toLowerCase().includes("private")) return "Private Event"; return "Birthday Party"; }
function normalizeGuestStatus(guest: EventGuestRecord) { if (guest.status === "CHECKED_OUT" || guest.checkedOutAt) return "Checked Out"; if (guest.status === "CHECKED_IN" || guest.checkedInAt) return "Checked In"; if (guest.status === "NO_SHOW") return "No Show"; return "Expected"; }
function getPartyMode(status: string): PartyMode { if (status === "IN_PROGRESS" || status === "In Progress") return "during"; if (status === "COMPLETED" || status === "Completed") return "after"; return "before"; }
function normalizeEventToParty(event: EventRecord): Party {
  const fallbackGuestName = event.guestOfHonor || "Guest of Honor";
  const realGuests = event.guests ?? [];
  const guests = realGuests.map((guest) => ({ id: guest.id, name: guest.guestName || "Unnamed Guest", parentName: guest.parentName || "", email: guest.guestEmail || "", phone: guest.guestPhone || "", status: normalizeGuestStatus(guest), waiver: guest.waiverStatus === "SIGNED" ? "Valid" : "Needed", checkedInAt: guest.checkedInAt, checkedOutAt: guest.checkedOutAt ?? null }));
  return { id: event.id, childName: fallbackGuestName, title: event.title, eventNumber: event.eventNumber || "EVT", eventTypeName: guessEventTypeName(event), host: "Booking Customer", phone: "Saved with booking", date: formatDate(event.eventDate), time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`, status: getStatusLabel(event.status), packageName: event.packageName || "No package", room: "Main Party Room", guestCount: Math.max(guests.length, event.guestOfHonor ? 1 : 0), expectedCount: realGuests.filter((guest) => guest.status === "EXPECTED").length, checkedInCount: realGuests.filter((guest) => guest.status === "CHECKED_IN").length, checkedOutCount: realGuests.filter((guest) => guest.status === "CHECKED_OUT").length, noShowCount: realGuests.filter((guest) => guest.status === "NO_SHOW").length, waiverNeededCount: guests.filter((guest) => guest.waiver !== "Valid").length, deposit: formatCurrency(event.depositAmount), depositStatus: event.depositStatus, balanceDue: formatCurrency(event.balanceDue), balanceDueNumber: event.balanceDue, notes: event.notes || "No notes yet.", inviteUrl: event.inviteUrl, timelineItems: event.timelineItems ?? [], guests };
}

export default function PartyManagerPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = params.eventId;
  const [party, setParty] = useState<Party>(fallbackParty);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [openCard, setOpenCard] = useState("guests");
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [activeGuestAction, setActiveGuestAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadParty = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoadingEvent(true);
      const response = await fetch("/api/events", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load party.");
      const event = (data.events ?? []).find((item: EventRecord) => item.id === eventId);
      if (!event) throw new Error("Party or event was not found.");
      setParty(normalizeEventToParty(event));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to load party.");
    } finally {
      if (!options?.silent) setLoadingEvent(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadParty();
    const refreshTimer = window.setInterval(() => loadParty({ silent: true }), 5000);
    return () => window.clearInterval(refreshTimer);
  }, [loadParty]);

  const partyMode = getPartyMode(party.status);
  const selectedPartyEventType = { color: "#FFB768" };
  const visibleGuests = useMemo(() => {
    const cleanQuery = guestSearchQuery.trim().toLowerCase();
    if (!cleanQuery) return party.guests;
    return party.guests.filter((guest) => guest.name.toLowerCase().includes(cleanQuery) || guest.parentName.toLowerCase().includes(cleanQuery) || guest.email.toLowerCase().includes(cleanQuery) || guest.phone.toLowerCase().includes(cleanQuery) || guest.status.toLowerCase().includes(cleanQuery) || guest.waiver.toLowerCase().includes(cleanQuery));
  }, [guestSearchQuery, party.guests]);

  const eventReadiness = [
    { label: "Deposit", value: getDepositBadge(party.depositStatus), done: party.depositStatus !== "PENDING" },
    { label: "Waivers", value: party.waiverNeededCount === 0 ? "Complete" : `${party.waiverNeededCount} needed`, done: party.waiverNeededCount === 0 },
    { label: "Guests", value: `${party.checkedInCount}/${Math.max(party.guestCount, 1)} checked in`, done: party.guestCount > 0 && party.checkedInCount >= party.guestCount },
    { label: "Balance", value: party.balanceDueNumber > 0 ? party.balanceDue : "Paid", done: party.balanceDueNumber <= 0 },
  ];
  const readinessPercent = Math.round((eventReadiness.filter((item) => item.done).length / eventReadiness.length) * 100);
  const checklist = partyMode === "before" ? [{ label: "Review booking details", done: true }, { label: "Send RSVP link", done: Boolean(party.inviteUrl) }, { label: "Collect waivers", done: party.waiverNeededCount === 0 }, { label: "Set up room", done: false }, { label: "Start party", done: false }] : partyMode === "during" ? [{ label: "Check in guests", done: party.checkedInCount > 0 }, { label: "Collect remaining balance", done: party.balanceDueNumber <= 0 }, { label: "Open POS ticket", done: false }, { label: "Close event", done: false }] : [{ label: "Send thank-you email", done: false }, { label: "Save customer notes", done: false }, { label: "Invite to book again", done: false }];
  const nextStep = checklist.find((item) => !item.done) ?? checklist[checklist.length - 1];
  const primaryAction = party.status === "Cancelled" ? "Cancelled" : partyMode === "before" ? party.waiverNeededCount > 0 ? "Send RSVP + Waiver Link" : "Start Party" : partyMode === "during" ? party.balanceDueNumber > 0 ? "Collect Remaining Balance" : "Complete Event" : "Send Thank You";

  async function copyInviteLink() {
    if (!party.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(party.inviteUrl);
      setCopyStatus("Copied!");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 1800);
    }
  }

  function openInviteLink() { if (party.inviteUrl) window.open(party.inviteUrl, "_blank", "noopener,noreferrer"); }
  function emailInviteLink() { if (!party.inviteUrl) return; const subject = encodeURIComponent(`RSVP link for ${party.title}`); const body = encodeURIComponent(`Here is your RSVP + waiver link for ${party.title}:\n\n${party.inviteUrl}\n\nYou can send this to your guests so they can RSVP and sign the waiver before the event.`); window.location.href = `mailto:?subject=${subject}&body=${body}`; }

  async function runGuestAction(guest: PartyGuest, action: "check-in" | "check-out" | "no-show") {
    const actionKey = `${guest.id}:${action}`;
    setActiveGuestAction(actionKey);
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/guests/${guest.id}/${action}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update guest.");
      await loadParty({ silent: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update guest.");
    } finally {
      setActiveGuestAction("");
    }
  }

  async function cancelParty() {
    setCancelling(true);
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to cancel party.");
      await loadParty({ silent: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to cancel party.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <section className="h-full overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
            <div>
              <Link href="/parties" className="text-sm font-semibold text-[#0B55C6]">← Back to Party Control Center</Link>
              <p className="mt-3 text-sm font-semibold text-[#8A6D3B]">Individual Party Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{loadingEvent ? "Loading party..." : party.title}</h1>
              <p className="mt-2 text-sm text-[#6B7280]">{party.eventNumber} • {party.date} • {party.time}</p>
            </div>
            <div className="flex items-center gap-3">
              {party.inviteUrl && <button onClick={openInviteLink} className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">RSVP Link</button>}
              <button disabled={party.status === "Cancelled" || cancelling} onClick={cancelParty} className="rounded-[10px] border border-[#FCA5A5] bg-white px-4 py-3 text-sm font-semibold text-[#9F1239] disabled:opacity-40">{cancelling ? "Cancelling..." : "Cancel Party"}</button>
              <button disabled={party.status === "Cancelled"} className="rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{primaryAction}</button>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[1fr_300px] gap-3 overflow-hidden">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-5" style={{ background: `linear-gradient(90deg, ${makeSoftColor(selectedPartyEventType.color)} 0%, #FFFFFF 65%)` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(party.status)}`}>{party.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDepositStyles(party.depositStatus)}`}>{getDepositBadge(party.depositStatus)}</span>
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold text-[#1E293B]" style={{ borderColor: selectedPartyEventType.color, backgroundColor: makeSoftColor(selectedPartyEventType.color) }}>{getEventIcon(party.eventTypeName)} {party.eventTypeName}</span>
                </div>
              </div>

              <div className="h-full overflow-y-auto p-5 pb-24">
                {actionError && <p className="mb-4 rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">{actionError}</p>}

                <section className="mb-4 rounded-[14px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">{partyMode === "before" ? "Before Party" : partyMode === "during" ? "During Party" : "After Party"}</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">Next Step: {nextStep.label}</h3></div>
                    <div className="text-right"><p className="text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{readinessPercent}%</p><p className="text-xs font-semibold text-[#6B7280]">Ready</p></div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#1E293B] transition-all duration-300" style={{ width: `${readinessPercent}%` }} /></div>
                  <div className="mt-4 grid grid-cols-4 gap-3">{eventReadiness.map((item) => <div key={item.label} className="rounded-[10px] bg-white p-4"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F0E6] text-sm font-semibold">{item.done ? "✓" : "!"}</div><p className="text-xs font-semibold text-[#6B7280]">{item.label}</p><p className="mt-1 text-sm font-semibold text-[#1E293B]">{item.value}</p></div>)}</div>
                </section>

                <section className="mb-4 grid grid-cols-5 gap-2 rounded-[14px] border border-black/10 bg-white p-3">
                  {[
                    { key: "next", label: "Checklist", detail: `${checklist.filter((item) => item.done).length}/${checklist.length}` },
                    { key: "guests", label: "Guest Check-In", detail: `${party.checkedInCount}/${Math.max(party.guestCount, 1)}` },
                    { key: "money", label: "Payments", detail: party.balanceDueNumber > 0 ? party.balanceDue : "Paid" },
                    { key: "timeline", label: "Timeline", detail: `${party.timelineItems.length}` },
                    { key: "details", label: "Details + Notes", detail: party.packageName },
                  ].map((card) => <button key={card.key} onClick={() => setOpenCard(card.key)} className={`rounded-[10px] px-3 py-3 text-left transition ${openCard === card.key ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}><span className="block text-sm font-semibold">{card.label}</span><span className={`mt-1 block truncate text-xs ${openCard === card.key ? "text-white/70" : "text-[#6B7280]"}`}>{card.detail}</span></button>)}
                </section>

                {openCard === "next" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">{party.eventTypeName} Checklist</h3><div className="mt-4 space-y-2">{checklist.map((item, index) => { const isNext = item.label === nextStep.label; return <div key={item.label} className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${isNext ? "border border-[#1E293B] bg-white" : item.done ? "bg-white/70" : "bg-white"}`}><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${item.done ? "bg-[#D7F1EC] text-[#155E75]" : isNext ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#6B7280]"}`}>{item.done ? "✓" : index + 1}</div><div className="flex-1"><p className="text-sm font-semibold text-[#1E293B]">{item.label}</p>{isNext && <p className="text-[11px] text-[#6B7280]">Next action</p>}</div></div>; })}</div></section>}

                {openCard === "guests" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><div className="mb-3 flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Guest Check-In + Waivers</h3><p className="mt-1 text-sm text-[#6B7280]">Run check-in, check-out, no-shows, and waiver status from this party.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">{party.guests.length} added</span></div><div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4"><input value={guestSearchQuery} onChange={(event) => setGuestSearchQuery(event.target.value)} className="w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Search child, parent, phone, email, status..." /></div>{visibleGuests.length > 0 ? <div className="grid grid-cols-2 gap-3">{visibleGuests.map((guest) => <div key={guest.id} className="rounded-[10px] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#1E293B]">{guest.name}</p><p className="mt-1 text-xs text-[#6B7280]">{guest.parentName || "Parent pending"}</p></div><div className="flex flex-col items-end gap-1"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getGuestStatusStyles(guest.status)}`}>{guest.status}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWaiverStyles(guest.waiver)}`}>Waiver {guest.waiver}</span></div></div><div className="mt-3 grid grid-cols-3 gap-2"><button disabled={guest.status === "Checked In" || guest.status === "Checked Out" || guest.status === "No Show" || activeGuestAction === `${guest.id}:check-in` || party.status === "Cancelled"} onClick={() => runGuestAction(guest, "check-in")} className="rounded-[8px] bg-[#7BAE7F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{activeGuestAction === `${guest.id}:check-in` ? "..." : "Check In"}</button><button disabled={guest.status !== "Checked In" || activeGuestAction === `${guest.id}:check-out` || party.status === "Cancelled"} onClick={() => runGuestAction(guest, "check-out")} className="rounded-[8px] border border-[#B7D4FF] bg-[#EEF5FF] px-3 py-2 text-xs font-semibold text-[#0B55C6] disabled:opacity-40">{activeGuestAction === `${guest.id}:check-out` ? "..." : "Check Out"}</button><button disabled={guest.status !== "Expected" || activeGuestAction === `${guest.id}:no-show` || party.status === "Cancelled"} onClick={() => runGuestAction(guest, "no-show")} className="rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-2 text-xs font-semibold text-[#4B5563] disabled:opacity-40">{activeGuestAction === `${guest.id}:no-show` ? "..." : "No Show"}</button></div>{guest.checkedInAt && <p className="mt-2 text-[11px] text-[#6B7280]">Checked in: {formatShortTime(guest.checkedInAt)}{guest.checkedOutAt ? ` • Checked out: ${formatShortTime(guest.checkedOutAt)}` : ""}</p>}</div>)}</div> : <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">No guests found</p><p className="mt-2 text-sm text-[#6B7280]">Send the RSVP link so guests can add themselves before the party.</p></div>}</section>}

                {openCard === "money" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Payments + Checkout</h3><div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Deposit</p><p className="mt-2 font-semibold text-[#155E75]">{party.deposit}</p><p className="mt-1 text-xs text-[#6B7280]">{getDepositBadge(party.depositStatus)}</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Balance Due</p><p className="mt-2 font-semibold text-[#9F1239]">{party.balanceDue}</p><p className="mt-1 text-xs text-[#6B7280]">Due at checkout</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">POS Ticket</p><p className="mt-2 font-semibold text-[#1E293B]">Not Open</p><p className="mt-1 text-xs text-[#6B7280]">Coming next</p></div></div></section>}
                {openCard === "timeline" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Event Timeline</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{party.timelineItems.length}</span></div><div className="space-y-3">{party.timelineItems.length > 0 ? party.timelineItems.map((item) => <div key={item.id} className="flex gap-3 rounded-[8px] bg-white p-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F0E6] text-xs font-semibold">{item.icon || "•"}</div><div><p className="text-sm font-semibold text-[#1E293B]">{item.title}</p><p className="mt-1 text-xs text-[#6B7280]">{formatTimelineTime(item.createdAt)}</p>{item.body && <p className="mt-1 text-xs text-[#6B7280]">{item.body}</p>}</div></div>) : <div className="rounded-[8px] bg-white p-4 text-sm text-[#6B7280]">Timeline will appear here as staff runs the event.</div>}</div></section>}
                {openCard === "details" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Details + Notes</h3><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Guest of Honor</p><p className="mt-2 font-semibold text-[#1E293B]">{party.childName}</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Package</p><p className="mt-2 font-semibold text-[#1E293B]">{party.packageName}</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Room</p><p className="mt-2 font-semibold text-[#1E293B]">{party.room}</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Customer</p><p className="mt-2 font-semibold text-[#1E293B]">{party.host}</p></div></div><div className="mt-3 rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Notes / Balloon Colors</p><p className="mt-2 text-sm text-[#1E293B]">{party.notes}</p></div></section>}
              </div>
            </section>

            <aside className="space-y-3 overflow-y-auto">
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-[#6B7280]">At a Glance</p><div className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#6B7280]">Mode</span><span className="font-semibold capitalize text-[#1E293B]">{partyMode}</span></div><div className="flex justify-between"><span className="text-[#6B7280]">Ready</span><span className="font-semibold text-[#1E293B]">{readinessPercent}%</span></div><div className="flex justify-between"><span className="text-[#6B7280]">Expected</span><span className="font-semibold text-[#1E293B]">{party.expectedCount}</span></div><div className="flex justify-between"><span className="text-[#6B7280]">Checked In</span><span className="font-semibold text-[#155E75]">{party.checkedInCount}</span></div><div className="flex justify-between"><span className="text-[#6B7280]">Checked Out</span><span className="font-semibold text-[#0B55C6]">{party.checkedOutCount}</span></div><div className="flex justify-between"><span className="text-[#6B7280]">No Show</span><span className="font-semibold text-[#4B5563]">{party.noShowCount}</span></div><div className="flex justify-between"><span className="text-[#6B7280]">Balance</span><span className="font-semibold text-[#9F1239]">{party.balanceDue}</span></div></div></section>
              {party.inviteUrl && <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-[#6B7280]">RSVP + Waiver Link</p><p className="mt-2 break-all rounded-[8px] bg-[#F6F0E6] p-3 text-xs text-[#1E293B]">{party.inviteUrl}</p><div className="mt-3 grid grid-cols-3 gap-2"><button onClick={openInviteLink} className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">Open</button><button onClick={copyInviteLink} className="rounded-[8px] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-white">Copy</button><button onClick={emailInviteLink} className="rounded-[8px] border border-[#B7D4FF] bg-[#EEF5FF] px-3 py-2 text-xs font-semibold text-[#0B55C6]">Email</button></div>{copyStatus && <p className="mt-2 rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold text-[#1E293B]">{copyStatus}</p>}</section>}
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-[#6B7280]">Manager Actions</p><div className="mt-3 space-y-2"><button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">Send Reminder</button><button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">Add Staff Note</button><button className="w-full rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-left text-xs font-semibold text-[#1E293B]">Open POS Ticket</button><button onClick={() => router.push("/parties")} className="w-full rounded-[8px] bg-[#1E293B] px-3 py-2 text-left text-xs font-semibold text-white">Back to Dashboard</button></div></section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
