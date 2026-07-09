"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { CommerceSettingsPayload, PaymentMethodRule } from "@/lib/commerce-settings";
import {
  completeWorkflowStep,
  getNextWorkflowStep,
  getProgressPercent,
  getWorkflowStep,
  getWorkflowStepIndex,
  isPartyWorkflowStepKey,
  isWorkflowComplete,
  partyWorkflowSteps,
  type PartyWorkflowStep,
  type PartyWorkflowStepKey,
} from "@/lib/party-workflow";

type EventTimelineItem = { id: string; title: string; body: string | null; icon: string | null; createdAt: string };
type EventGuestRecord = { id: string; guestName: string | null; guestEmail?: string | null; guestPhone?: string | null; parentName?: string | null; status: string; rsvpStatus?: string | null; waiverStatus?: string | null; declinedAt?: string | null; declineReason?: string | null; checkedInAt: string | null; checkedOutAt?: string | null };
type EventPaymentRecord = { id: string; amount: number; method: string; notes: string; staff: string; collectedAt: string; createdAt: string };
type EventRecord = { id: string; eventNumber: string | null; title: string; eventDate: string; startTime: string; endTime: string; status: string; workflowStep?: string | number | null; packageName: string | null; guestOfHonor: string | null; depositAmount: number; depositStatus: string; depositMethod: string | null; balanceDue: number; notes: string; inviteUrl: string | null; confirmationUrl?: string | null; pendingExpiresAt?: string | null; incidentCount?: number; timelineItems: EventTimelineItem[]; payments?: EventPaymentRecord[]; guests?: EventGuestRecord[] };
type PartyGuest = { id: string; name: string; parentName: string; email: string; phone: string; status: string; rsvpStatus: string; waiver: string; declineReason: string; checkedInAt: string | null; checkedOutAt: string | null };
type IncidentReport = { id: string; incidentType: string; severity: string; description: string; staffMember: string | null; guestName: string | null; status: string; createdAt: string; updatedAt: string };
type Party = { id: string; childName: string; title: string; eventNumber: string; eventTypeName: string; date: string; time: string; status: string; rawStatus: string; workflowStep: PartyWorkflowStepKey; packageName: string; room: string; guestCount: number; expectedCount: number; checkedInCount: number; checkedOutCount: number; noShowCount: number; waiverNeededCount: number; deposit: string; depositStatus: string; balanceDue: string; balanceDueNumber: number; notes: string; inviteUrl: string | null; confirmationUrl: string | null; pendingExpiresAt: string | null; incidentCount: number; timelineItems: EventTimelineItem[]; payments: EventPaymentRecord[]; guests: PartyGuest[] };
type Guardrail = { type: "cancel" | "advance" | "complete"; step?: PartyWorkflowStep | null; party: Party } | null;

type IncidentForm = {
  incidentType: string;
  severity: string;
  guestName: string;
  staffMember: string;
  description: string;
};

const fallbackParty: Party = {
  id: "",
  childName: "Guest of Honor",
  title: "Loading Party",
  eventNumber: "EVT",
  eventTypeName: "Birthday Party",
  date: "Date TBD",
  time: "Time TBD",
  status: "Loading",
  rawStatus: "PENDING",
  workflowStep: "PENDING",
  packageName: "No package",
  room: "Main Party Room",
  guestCount: 0,
  expectedCount: 0,
  checkedInCount: 0,
  checkedOutCount: 0,
  noShowCount: 0,
  waiverNeededCount: 0,
  deposit: "$0.00",
  depositStatus: "PENDING",
  balanceDue: "$0.00",
  balanceDueNumber: 0,
  notes: "No notes yet.",
  inviteUrl: null,
  confirmationUrl: null,
  pendingExpiresAt: null,
  incidentCount: 0,
  timelineItems: [],
  payments: [],
  guests: [],
};

const defaultIncidentForm: IncidentForm = {
  incidentType: "Injury",
  severity: "LOW",
  guestName: "",
  staffMember: "",
  description: "",
};

const incidentTypes = ["Injury", "Damaged Equipment", "Lost Item", "Behavior Issue", "Parent Complaint", "Staff Note", "Other"];
const severityOptions = ["LOW", "MEDIUM", "HIGH"];

function normalizeName(value: string) { return value.trim().toLowerCase(); }
function makeSoftColor(hexColor: string) { if (!hexColor.startsWith("#") || hexColor.length !== 7) return "#F6F0E6"; return `${hexColor}22`; }
function formatCurrency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Date TBD"; return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }
function formatTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Time TBD"; return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function formatTimelineTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function formatShortTime(value: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function formatHoldTime(value: string | null) { if (!value) return "No expiration shown"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "No expiration shown"; return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function getStatusLabel(status: string) { if (status === "CONFIRMED") return "Confirmed"; if (status === "PENDING") return "Pending"; if (status === "READY") return "Room Setup"; if (status === "IN_PROGRESS") return "Live"; if (status === "CLEANING_UP") return "Closing Out"; if (status === "COMPLETED") return "Completed"; if (status === "CANCELLED") return "Cancelled"; return status; }
function getStatusStyles(status: string) { if (status === "Cancelled") return "bg-[#FFE0E9] text-[#9F1239]"; if (status === "Confirmed" || status === "Room Setup") return "bg-[#D7F1EC] text-[#155E75]"; if (status === "Pending") return "bg-[#FFF0C4] text-[#92400E]"; if (status === "Live") return "bg-[#EEF5FF] text-[#0B55C6]"; if (status === "Closing Out") return "bg-[#F6F0E6] text-[#8A6D3B]"; return "bg-[#F1F1F1] text-[#4B5563]"; }
function getWaiverStyles(status: string) { if (status === "Valid") return "bg-[#D7F1EC] text-[#155E75]"; return "bg-[#FFE0E9] text-[#9F1239]"; }
function getGuestStatusStyles(status: string) { if (status === "Checked In") return "bg-[#D7F1EC] text-[#155E75]"; if (status === "Checked Out") return "bg-[#EEF5FF] text-[#0B55C6]"; if (status === "Declined") return "bg-[#FFE0E9] text-[#9F1239]"; if (status === "No Show") return "bg-[#F1F1F1] text-[#4B5563]"; return "bg-[#FFF0C4] text-[#92400E]"; }
function getDepositBadge(depositStatus: string) { if (depositStatus === "CASH_COLLECTED") return "Cash Deposit"; if (depositStatus === "CARD_COLLECTED") return "Card Deposit"; if (depositStatus === "WAIVED") return "Deposit Waived"; return "Deposit Pending"; }
function getDepositStyles(depositStatus: string) { if (depositStatus === "CASH_COLLECTED" || depositStatus === "CARD_COLLECTED") return "bg-[#D7F1EC] text-[#155E75]"; if (depositStatus === "WAIVED") return "bg-[#F1F1F1] text-[#4B5563]"; return "bg-[#FFF0C4] text-[#92400E]"; }
function getPaymentMethodLabel(method: string) { if (method === "CASH") return "Cash"; if (method === "CARD") return "Card"; if (method === "OTHER") return "Other"; return method; }
function getEventIcon(eventTypeName: string) { const name = normalizeName(eventTypeName); if (name.includes("party")) return "🎂"; if (name.includes("field")) return "🚌"; if (name.includes("private")) return "🔒"; return "★"; }
function guessEventTypeName(event: EventRecord) { const title = event.title || ""; const packageName = event.packageName || ""; if (title.toLowerCase().includes("field") || packageName.toLowerCase().includes("field")) return "Field Trip"; if (title.toLowerCase().includes("private") || packageName.toLowerCase().includes("private")) return "Private Event"; return "Birthday Party"; }
function normalizeGuestStatus(guest: EventGuestRecord) { if (guest.rsvpStatus === "DECLINED") return "Declined"; if (guest.status === "CHECKED_OUT" || guest.checkedOutAt) return "Checked Out"; if (guest.status === "CHECKED_IN" || guest.checkedInAt) return "Checked In"; if (guest.status === "NO_SHOW") return "No Show"; return "Expected"; }
function normalizeWorkflowStep(value: EventRecord["workflowStep"]): PartyWorkflowStepKey { if (typeof value === "string" && isPartyWorkflowStepKey(value)) return value; if (typeof value === "number" && Number.isFinite(value)) return partyWorkflowSteps[Math.min(Math.max(Math.trunc(value), 0), partyWorkflowSteps.length - 1)]?.key ?? "PENDING"; return "PENDING"; }
function getSeverityStyles(severity: string) { if (severity === "HIGH") return "bg-[#FFE0E9] text-[#9F1239]"; if (severity === "MEDIUM") return "bg-[#FFF0C4] text-[#92400E]"; return "bg-[#D7F1EC] text-[#155E75]"; }

function normalizeEventToParty(event: EventRecord): Party {
  const realGuests = event.guests ?? [];
  const guests = realGuests.map((guest) => ({ id: guest.id, name: guest.guestName || "Unnamed Guest", parentName: guest.parentName || "", email: guest.guestEmail || "", phone: guest.guestPhone || "", status: normalizeGuestStatus(guest), rsvpStatus: guest.rsvpStatus ?? "ATTENDING", waiver: guest.waiverStatus === "SIGNED" ? "Valid" : guest.rsvpStatus === "DECLINED" ? "Not Needed" : "Needed", declineReason: guest.declineReason ?? "", checkedInAt: guest.checkedInAt, checkedOutAt: guest.checkedOutAt ?? null }));
  const attendingGuests = realGuests.filter((guest) => guest.rsvpStatus !== "DECLINED");
  const workflowStep = normalizeWorkflowStep(event.workflowStep);
  return { id: event.id, childName: event.guestOfHonor || "Guest of Honor", title: event.title, eventNumber: event.eventNumber || "EVT", eventTypeName: guessEventTypeName(event), date: formatDate(event.eventDate), time: `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`, status: getStatusLabel(event.status), rawStatus: event.status, workflowStep, packageName: event.packageName || "No package", room: "Main Party Room", guestCount: Math.max(attendingGuests.length, event.guestOfHonor ? 1 : 0), expectedCount: attendingGuests.filter((guest) => guest.status === "EXPECTED").length, checkedInCount: attendingGuests.filter((guest) => guest.status === "CHECKED_IN").length, checkedOutCount: attendingGuests.filter((guest) => guest.status === "CHECKED_OUT").length, noShowCount: attendingGuests.filter((guest) => guest.status === "NO_SHOW").length, waiverNeededCount: guests.filter((guest) => guest.rsvpStatus !== "DECLINED" && guest.waiver !== "Valid").length, deposit: formatCurrency(event.depositAmount), depositStatus: event.depositStatus, balanceDue: formatCurrency(event.balanceDue), balanceDueNumber: event.balanceDue, notes: event.notes || "No notes yet.", inviteUrl: event.inviteUrl, confirmationUrl: event.confirmationUrl ?? null, pendingExpiresAt: event.pendingExpiresAt ?? null, incidentCount: event.incidentCount ?? 0, timelineItems: event.timelineItems ?? [], payments: event.payments ?? [], guests };
}

export default function PartyManagerPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [party, setParty] = useState<Party>(fallbackParty);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [openCard, setOpenCard] = useState("guests");
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [activeGuestAction, setActiveGuestAction] = useState("");
  const [activeIncidentAction, setActiveIncidentAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [activePartyAction, setActivePartyAction] = useState("");
  const [activePaymentAction, setActivePaymentAction] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRule[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [guardrail, setGuardrail] = useState<Guardrail>(null);
  const [incidentForm, setIncidentForm] = useState<IncidentForm>(defaultIncidentForm);

  const loadParty = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setLoadingEvent(true);
      const response = await fetch("/api/events", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load party.");
      const event = (data.events ?? []).find((item: EventRecord) => item.id === eventId);
      if (!event) throw new Error("Party or event was not found.");
      setParty(normalizeEventToParty(event));

      const incidentsResponse = await fetch(`/api/events/${eventId}/incidents`, { cache: "no-store" });
      const incidentsData = await incidentsResponse.json();
      if (incidentsResponse.ok) setIncidents(incidentsData.incidents ?? []);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to load party.");
    } finally {
      if (!options?.silent) setLoadingEvent(false);
    }
  }, [eventId]);

  useEffect(() => { loadParty(); const refreshTimer = window.setInterval(() => loadParty({ silent: true }), 5000); return () => window.clearInterval(refreshTimer); }, [loadParty]);

  useEffect(() => {
    async function loadCommerceSettings() {
      try {
        const response = await fetch("/api/company-settings/commerce", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load commerce settings.");
        const settings = data.commerceSettings as CommerceSettingsPayload;
        const enabledMethods = (settings.paymentMethods ?? []).filter((method) => method.enabled && method.allowBalances);
        setPaymentMethods(enabledMethods);
        setPaymentMethod((current) => current || enabledMethods[0]?.key || "");
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Unable to load commerce settings.");
      }
    }

    loadCommerceSettings();
  }, []);

  useEffect(() => {
    setPaymentAmount(party.balanceDueNumber > 0 ? party.balanceDueNumber.toFixed(2) : "0.00");
  }, [party.id, party.balanceDueNumber]);

  const selectedPartyEventType = { color: "#FFB768" };
  const currentStep = getWorkflowStep(party.workflowStep);
  const currentStepIndex = getWorkflowStepIndex(party.workflowStep);
  const nextStep = getNextWorkflowStep(party.workflowStep);
  const progressPercent = getProgressPercent(party.workflowStep);
  const completeAvailable = party.rawStatus !== "CANCELLED" && isWorkflowComplete(party.workflowStep);

  const visibleGuests = useMemo(() => {
    const cleanQuery = guestSearchQuery.trim().toLowerCase();
    if (!cleanQuery) return party.guests;
    return party.guests.filter((guest) => guest.name.toLowerCase().includes(cleanQuery) || guest.parentName.toLowerCase().includes(cleanQuery) || guest.email.toLowerCase().includes(cleanQuery) || guest.phone.toLowerCase().includes(cleanQuery) || guest.status.toLowerCase().includes(cleanQuery) || guest.waiver.toLowerCase().includes(cleanQuery));
  }, [guestSearchQuery, party.guests]);

  useEffect(() => {
    if (loadingEvent) return;
    if (party.rawStatus === "CANCELLED") return;

    const stageCardMap: Partial<Record<PartyWorkflowStepKey, string>> = {
      CHECK_IN: "guests",
      PARTY_TIME: "timeline",
      PAYMENT: "money",
      CLEANUP: "timeline",
    };

    const nextOpenCard = stageCardMap[party.workflowStep];
    if (nextOpenCard) setOpenCard(nextOpenCard);
  }, [loadingEvent, party.rawStatus, party.workflowStep]);

  async function copyInviteLink() { if (!party.inviteUrl) return; try { await navigator.clipboard.writeText(party.inviteUrl); setCopyStatus("Copied!"); window.setTimeout(() => setCopyStatus(""), 1800); } catch { setCopyStatus("Copy failed"); window.setTimeout(() => setCopyStatus(""), 1800); } }
  async function copyConfirmationLink() { if (!party.confirmationUrl) return; try { await navigator.clipboard.writeText(party.confirmationUrl); setCopyStatus("Confirmation copied!"); window.setTimeout(() => setCopyStatus(""), 1800); } catch { setCopyStatus("Copy failed"); window.setTimeout(() => setCopyStatus(""), 1800); } }
  function openInviteLink() { if (party.inviteUrl) window.open(party.inviteUrl, "_blank", "noopener,noreferrer"); }
  function openHostRsvpDashboard() { if (party.inviteUrl) window.open(`${party.inviteUrl.replace(/\/$/, "")}/host`, "_blank", "noopener,noreferrer"); }
  function emailInviteLink() { if (!party.inviteUrl) return; const subject = encodeURIComponent(`RSVP link for ${party.title}`); const body = encodeURIComponent(`Here is your RSVP + waiver link for ${party.title}:\n\n${party.inviteUrl}`); window.location.href = `mailto:?subject=${subject}&body=${body}`; }

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

  async function runPartyWorkflowAction(type: "advance" | "complete") {
    const requestedStep = type === "complete" ? completeWorkflowStep.key : nextStep?.key ?? completeWorkflowStep.key;
    setActivePartyAction(`${type}:${requestedStep}`);
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(type === "complete" ? { complete: true } : { workflowStep: requestedStep }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update party workflow.");
      setGuardrail(null);
      await loadParty({ silent: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update party workflow.");
    } finally {
      setActivePartyAction("");
    }
  }

  async function cancelParty() {
    setActivePartyAction("cancel");
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/cancel`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to cancel party.");
      setGuardrail(null);
      await loadParty({ silent: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to cancel party.");
    } finally {
      setActivePartyAction("");
    }
  }

  async function createIncidentReport() {
    setActiveIncidentAction("create");
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incidentForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create incident report.");
      setIncidentForm(defaultIncidentForm);
      await loadParty({ silent: true });
      setOpenCard("incidents");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to create incident report.");
    } finally {
      setActiveIncidentAction("");
    }
  }

  async function submitPayment() {
    setActivePaymentAction("collect");
    setActionError("");
    try {
      const response = await fetch(`/api/events/${party.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          method: paymentMethod,
          notes: paymentNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit payment.");
      setPaymentNotes("");
      await loadParty({ silent: true });
      setOpenCard("money");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to submit payment.");
    } finally {
      setActivePaymentAction("");
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <section className="flex h-full min-h-0 flex-col overflow-hidden px-6 py-6">
          <header className="mb-5 flex shrink-0 items-start justify-between gap-5">
            <div>
              <Link href="/parties" className="text-sm font-semibold text-[#0B55C6]">← Back to Party Control Center</Link>
              <p className="mt-3 text-sm font-semibold text-[#8A6D3B]">Individual Party Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{loadingEvent ? "Loading party..." : party.title}</h1>
              <p className="mt-2 text-sm text-[#6B7280]">{party.eventNumber} • {party.date} • {party.time}</p>
            </div>
            <div className="flex items-center gap-3">
              {party.inviteUrl && <button onClick={openInviteLink} className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">RSVP Link</button>}
              <button disabled={party.rawStatus === "CANCELLED"} onClick={() => setGuardrail({ type: "cancel", party })} className="rounded-[10px] border border-[#FCA5A5] bg-white px-4 py-3 text-sm font-semibold text-[#9F1239] disabled:opacity-40">Cancel Party</button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-3 overflow-hidden">
            <section className="min-h-0 overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-5" style={{ background: `linear-gradient(90deg, ${makeSoftColor(selectedPartyEventType.color)} 0%, #FFFFFF 65%)` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(party.status)}`}>{party.status}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDepositStyles(party.depositStatus)}`}>{getDepositBadge(party.depositStatus)}</span>
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold text-[#1E293B]" style={{ borderColor: selectedPartyEventType.color, backgroundColor: makeSoftColor(selectedPartyEventType.color) }}>{getEventIcon(party.eventTypeName)} {party.eventTypeName}</span>
                  {incidents.length > 0 && <span className="rounded-full bg-[#FFF0C4] px-3 py-1 text-xs font-semibold text-[#92400E]">⚠ {incidents.length} Incident{incidents.length === 1 ? "" : "s"}</span>}
                </div>
              </div>

              <div className="h-full min-h-0 overflow-y-auto p-5 pb-32">
                {actionError && <p className="mb-4 rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">{actionError}</p>}

                <section className="mb-4 rounded-[14px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Party Progress</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">{party.rawStatus === "CANCELLED" ? "Cancelled" : completeAvailable ? "Ready to Complete" : currentStep ? currentStep.label : "Completed"}</h3>
                      <p className="mt-1 text-sm text-[#6B7280]">{party.rawStatus === "CANCELLED" ? "Restore the party before continuing the workflow." : completeAvailable ? "All workflow steps are finished. Complete the party to close it out." : currentStep?.description}</p>
                    </div>
                    <div className="text-right"><p className="text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">{progressPercent}%</p><p className="text-xs font-semibold text-[#6B7280]">Complete</p></div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#1E293B] transition-all duration-300" style={{ width: `${progressPercent}%` }} /></div>
                  <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] font-semibold text-[#6B7280]">
                    {partyWorkflowSteps.map((step, index) => {
                      const isDone = currentStepIndex > index;
                      const isCurrent = currentStepIndex === index && party.rawStatus !== "CANCELLED";
                      return <span key={step.key} className={`${isCurrent ? "text-[#1E293B]" : isDone ? "text-[#155E75]" : ""}`}>{isDone ? "✓ " : isCurrent ? "● " : "○ "}{step.label}</span>;
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {party.rawStatus === "PENDING" && party.confirmationUrl && <button onClick={copyConfirmationLink} className="rounded-[10px] border border-[#B7D4FF] bg-white px-4 py-3 text-sm font-semibold text-[#0B55C6]">Copy Confirmation Link</button>}
                    {party.rawStatus === "PENDING" && <span className="text-xs font-semibold text-[#6B7280]">Hold expires: {formatHoldTime(party.pendingExpiresAt)}</span>}
                    {party.rawStatus !== "CANCELLED" && !completeAvailable && nextStep && <div className="rounded-[12px] bg-white p-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Next Action</p><button onClick={() => setGuardrail({ type: "advance", step: currentStep, party })} className="rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white">{currentStep?.nextActionLabel ?? "Next Step"}</button></div>}
                    {completeAvailable && party.rawStatus !== "COMPLETED" && <div className="rounded-[12px] bg-white p-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Final Action</p><button onClick={() => setGuardrail({ type: "complete", party })} className="rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white">Complete Party</button></div>}
                    {party.rawStatus === "COMPLETED" && <span className="rounded-[10px] bg-white px-4 py-3 text-sm font-semibold text-[#155E75]">Party Complete</span>}
                    {copyStatus && <span className="text-xs font-semibold text-[#155E75]">{copyStatus}</span>}
                  </div>
                </section>

                <section className="mb-4 grid grid-cols-4 gap-2 rounded-[14px] border border-black/10 bg-white p-3">
                  {[
                    { key: "guests", label: "Guest Check-In", detail: `${party.checkedInCount}/${Math.max(party.guestCount, 1)}` },
                    { key: "money", label: "Payments", detail: party.balanceDueNumber > 0 ? party.balanceDue : "Paid" },
                    { key: "timeline", label: "Timeline", detail: `${party.timelineItems.length}` },
                    { key: "incidents", label: "Incidents", detail: incidents.length > 0 ? `${incidents.length} logged` : "Create report" },
                  ].map((card) => <button key={card.key} onClick={() => setOpenCard(card.key)} className={`rounded-[10px] px-3 py-3 text-left transition ${openCard === card.key ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}><span className="block text-sm font-semibold">{card.label}</span><span className={`mt-1 block truncate text-xs ${openCard === card.key ? "text-white/70" : "text-[#6B7280]"}`}>{card.detail}</span></button>)}
                </section>

                {openCard === "guests" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><div className="mb-3 flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Guest Check-In + Waivers</h3><p className="mt-1 text-sm text-[#6B7280]">Run check-in, check-out, no-shows, and waiver status from this party.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">{party.guests.length} added</span></div><div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4"><input value={guestSearchQuery} onChange={(event) => setGuestSearchQuery(event.target.value)} className="w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Search child, parent, phone, email, status..." /></div>{visibleGuests.length > 0 ? <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{visibleGuests.map((guest) => <div key={guest.id} className="rounded-[10px] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#1E293B]">{guest.name}</p><p className="mt-1 text-xs text-[#6B7280]">{guest.parentName || "Parent pending"}</p></div><div className="flex flex-col items-end gap-1"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getGuestStatusStyles(guest.status)}`}>{guest.status}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWaiverStyles(guest.waiver)}`}>Waiver {guest.waiver}</span></div></div><div className="mt-3 grid grid-cols-3 gap-2"><button disabled={guest.status === "Checked In" || guest.status === "Checked Out" || guest.status === "No Show" || activeGuestAction === `${guest.id}:check-in` || party.rawStatus === "CANCELLED"} onClick={() => runGuestAction(guest, "check-in")} className="rounded-[8px] bg-[#7BAE7F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{activeGuestAction === `${guest.id}:check-in` ? "..." : "Check In"}</button><button disabled={guest.status !== "Checked In" || activeGuestAction === `${guest.id}:check-out` || party.rawStatus === "CANCELLED"} onClick={() => runGuestAction(guest, "check-out")} className="rounded-[8px] border border-[#B7D4FF] bg-[#EEF5FF] px-3 py-2 text-xs font-semibold text-[#0B55C6] disabled:opacity-40">{activeGuestAction === `${guest.id}:check-out` ? "..." : "Check Out"}</button><button disabled={guest.status !== "Expected" || activeGuestAction === `${guest.id}:no-show` || party.rawStatus === "CANCELLED"} onClick={() => runGuestAction(guest, "no-show")} className="rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-2 text-xs font-semibold text-[#4B5563] disabled:opacity-40">{activeGuestAction === `${guest.id}:no-show` ? "..." : "No Show"}</button></div>{guest.checkedInAt && <p className="mt-2 text-[11px] text-[#6B7280]">Checked in: {formatShortTime(guest.checkedInAt)}{guest.checkedOutAt ? ` • Checked out: ${formatShortTime(guest.checkedOutAt)}` : ""}</p>}</div>)}</div> : <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">No guests found</p><p className="mt-2 text-sm text-[#6B7280]">Send the RSVP link so guests can add themselves before the party.</p></div>}</section>}
                {openCard === "money" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><div className="mb-4 flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Payments + Checkout</h3><p className="mt-1 text-sm text-[#6B7280]">Collect balance payments using enabled Commerce Settings methods.</p></div>{party.balanceDueNumber <= 0 && <span className="rounded-full bg-[#D7F1EC] px-3 py-1 text-xs font-semibold text-[#155E75]">Paid</span>}</div><div className="grid grid-cols-1 gap-3 lg:grid-cols-3"><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Deposit</p><p className="mt-2 font-semibold text-[#155E75]">{party.deposit}</p><p className="mt-1 text-xs text-[#6B7280]">{party.rawStatus === "PENDING" ? "Processed after confirmation" : getDepositBadge(party.depositStatus)}</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Balance Due</p><p className={`mt-2 font-semibold ${party.balanceDueNumber > 0 ? "text-[#9F1239]" : "text-[#155E75]"}`}>{party.balanceDueNumber > 0 ? party.balanceDue : "$0.00"}</p><p className="mt-1 text-xs text-[#6B7280]">{party.balanceDueNumber > 0 ? "Due at checkout" : "Balance paid"}</p></div><div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Payment Methods</p><p className="mt-2 font-semibold text-[#1E293B]">{paymentMethods.length}</p><p className="mt-1 text-xs text-[#6B7280]">Enabled for balances</p></div></div><div className="mt-4 rounded-[10px] bg-white p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-[160px_180px_minmax(0,1fr)_auto]"><label className="text-xs font-semibold text-[#6B7280]">Payment Amount<input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} type="number" min="0" step="0.01" disabled={party.balanceDueNumber <= 0 || party.rawStatus === "CANCELLED"} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none disabled:opacity-50" /></label><label className="text-xs font-semibold text-[#6B7280]">Payment Method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={paymentMethods.length === 0 || party.balanceDueNumber <= 0 || party.rawStatus === "CANCELLED"} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none disabled:opacity-50">{paymentMethods.length > 0 ? paymentMethods.map((method) => <option key={method.key} value={method.key}>{method.label}</option>) : <option value="">No methods enabled</option>}</select></label><label className="text-xs font-semibold text-[#6B7280]">Optional Notes<input value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} disabled={party.balanceDueNumber <= 0 || party.rawStatus === "CANCELLED"} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none disabled:opacity-50" placeholder="Reference, cash drawer note, or staff note" /></label><button onClick={submitPayment} disabled={activePaymentAction === "collect" || party.balanceDueNumber <= 0 || paymentMethods.length === 0 || !paymentMethod || party.rawStatus === "CANCELLED"} className="self-end rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{activePaymentAction === "collect" ? "Submitting..." : "Submit Payment"}</button></div></div><div className="mt-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold text-[#1E293B]">Payment History</h4><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">{party.payments.length}</span></div>{party.payments.length > 0 ? <div className="space-y-2">{party.payments.map((payment) => <div key={payment.id} className="grid grid-cols-1 gap-3 rounded-[10px] bg-white px-4 py-3 text-sm xl:grid-cols-[150px_120px_100px_minmax(0,1fr)_80px]"><div><p className="text-xs font-semibold text-[#6B7280]">Date / Time</p><p className="mt-1 font-semibold text-[#1E293B]">{formatTimelineTime(payment.collectedAt)}</p></div><div><p className="text-xs font-semibold text-[#6B7280]">Amount</p><p className="mt-1 font-semibold text-[#155E75]">{formatCurrency(payment.amount)}</p></div><div><p className="text-xs font-semibold text-[#6B7280]">Method</p><p className="mt-1 font-semibold text-[#1E293B]">{getPaymentMethodLabel(payment.method)}</p></div><div><p className="text-xs font-semibold text-[#6B7280]">Notes</p><p className="mt-1 text-[#1E293B]">{payment.notes || "No notes"}</p></div><div><p className="text-xs font-semibold text-[#6B7280]">Staff</p><p className="mt-1 font-semibold text-[#1E293B]">{payment.staff || "Staff"}</p></div></div>)}</div> : <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">No payments collected yet</p><p className="mt-2 text-sm text-[#6B7280]">Submitted balance payments will appear here.</p></div>}</div></section>}
                {openCard === "timeline" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Event Timeline</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">{party.timelineItems.length}</span></div><div className="space-y-3">{party.timelineItems.length > 0 ? party.timelineItems.map((item) => <div key={item.id} className="flex gap-3 rounded-[8px] bg-white p-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6F0E6] text-xs font-semibold">{item.icon || "•"}</div><div><p className="text-sm font-semibold text-[#1E293B]">{item.title}</p><p className="mt-1 text-xs text-[#6B7280]">{formatTimelineTime(item.createdAt)}</p>{item.body && <p className="mt-1 text-xs text-[#6B7280]">{item.body}</p>}</div></div>) : <div className="rounded-[8px] bg-white p-4 text-sm text-[#6B7280]">Timeline will appear here as staff runs the event.</div>}</div></section>}
                {openCard === "incidents" && <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4"><div className="mb-4 flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Incidents + Event Log</h3><p className="mt-1 text-sm text-[#6B7280]">Record injuries, damaged items, behavior issues, lost items, complaints, or staff notes for this party.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">{incidents.length} logged</span></div><div className="rounded-[10px] bg-white p-4"><div className="grid grid-cols-1 gap-3 xl:grid-cols-4"><label className="text-xs font-semibold text-[#6B7280]">Type<select value={incidentForm.incidentType} onChange={(event) => setIncidentForm((current) => ({ ...current, incidentType: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none">{incidentTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="text-xs font-semibold text-[#6B7280]">Severity<select value={incidentForm.severity} onChange={(event) => setIncidentForm((current) => ({ ...current, severity: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none">{severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></label><label className="text-xs font-semibold text-[#6B7280]">Guest / Child<input value={incidentForm.guestName} onChange={(event) => setIncidentForm((current) => ({ ...current, guestName: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none" placeholder="Optional" /></label><label className="text-xs font-semibold text-[#6B7280]">Staff Member<input value={incidentForm.staffMember} onChange={(event) => setIncidentForm((current) => ({ ...current, staffMember: event.target.value }))} className="mt-2 w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none" placeholder="Optional" /></label></div><label className="mt-3 block text-xs font-semibold text-[#6B7280]">Description<textarea value={incidentForm.description} onChange={(event) => setIncidentForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-[120px] w-full rounded-[8px] border border-black/10 bg-[#F6F0E6] px-3 py-3 text-sm text-[#1E293B] outline-none" placeholder="Describe what happened, who was involved, and what staff did next." /></label><button disabled={activeIncidentAction === "create" || !incidentForm.description.trim() || party.rawStatus === "CANCELLED"} onClick={createIncidentReport} className="mt-3 rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{activeIncidentAction === "create" ? "Creating..." : "Create Incident Report"}</button></div><div className="mt-4 space-y-3">{incidents.length > 0 ? incidents.map((incident) => <div key={incident.id} className="rounded-[10px] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#1E293B]">{incident.incidentType}</p><p className="mt-1 text-xs text-[#6B7280]">{formatTimelineTime(incident.createdAt)}{incident.guestName ? ` • ${incident.guestName}` : ""}{incident.staffMember ? ` • Staff: ${incident.staffMember}` : ""}</p></div><div className="flex gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityStyles(incident.severity)}`}>{incident.severity}</span><span className="rounded-full bg-[#F1F1F1] px-3 py-1 text-xs font-semibold text-[#4B5563]">{incident.status}</span></div></div><p className="mt-3 text-sm leading-6 text-[#1E293B]">{incident.description}</p></div>) : <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">No incidents logged</p><p className="mt-2 text-sm text-[#6B7280]">Create a report if something happens during this party.</p></div>}</div></section>}
              </div>
            </section>

            <aside className="min-h-0 space-y-3 overflow-y-auto rounded-[12px] border border-black/10 bg-white p-4 pb-24 shadow-sm">
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Party Snapshot</h3>
              <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Expected</p><p className="mt-1 text-lg font-semibold text-[#1E293B]">{Math.max(party.guestCount, 1)}</p></div><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Checked In</p><p className="mt-1 text-lg font-semibold text-[#1E293B]">{party.checkedInCount}</p></div><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Checked Out</p><p className="mt-1 text-lg font-semibold text-[#1E293B]">{party.checkedOutCount}</p></div><div className="rounded-[10px] bg-[#F6F0E6] p-3"><p className="font-semibold text-[#6B7280]">Incidents</p><p className="mt-1 text-lg font-semibold text-[#1E293B]">{incidents.length}</p></div></div>
              <div className="rounded-[10px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Party Details</p><div className="mt-3 space-y-2 text-sm"><p><span className="font-semibold text-[#6B7280]">Guest:</span> {party.childName}</p><p><span className="font-semibold text-[#6B7280]">Package:</span> {party.packageName}</p><p><span className="font-semibold text-[#6B7280]">Room:</span> {party.room}</p><p><span className="font-semibold text-[#6B7280]">Event #:</span> {party.eventNumber}</p><p><span className="font-semibold text-[#6B7280]">Deposit:</span> {getDepositBadge(party.depositStatus)}</p><p><span className="font-semibold text-[#6B7280]">Balance:</span> {party.balanceDue}</p></div>{party.notes && <div className="mt-3 rounded-[8px] bg-white p-3 text-sm text-[#1E293B]"><p className="text-xs font-semibold text-[#6B7280]">Notes</p><p className="mt-1">{party.notes}</p></div>}</div>
              <div className="rounded-[10px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">Current Stage</p><p className="mt-2 font-semibold text-[#1E293B]">{completeAvailable ? "Complete Party" : currentStep?.label ?? "Completed"}</p><p className="mt-1 text-sm text-[#6B7280]">{completeAvailable ? "All steps are done. The party can now be completed." : currentStep?.description}</p></div>
              {party.inviteUrl && <div className="rounded-[10px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8A6D3B]">RSVP Links</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={openInviteLink} className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">Guest Invite</button><button onClick={openHostRsvpDashboard} className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">Host Dashboard</button><button onClick={copyInviteLink} className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">Copy Guest Link</button><button onClick={emailInviteLink} className="rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">Email Guest Link</button></div></div>}
            </aside>
          </div>
        </section>
      </div>

      {guardrail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-[18px] bg-white p-6 shadow-xl"><p className="text-sm font-semibold text-[#8A6D3B]">Guardrail</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">{guardrail.type === "cancel" ? `Cancel ${party.title}?` : guardrail.type === "complete" ? `Complete ${party.title}?` : guardrail.step?.confirmationTitle}</h2><p className="mt-3 text-sm leading-6 text-[#6B7280]">{guardrail.type === "cancel" ? "This will remove the party from the active dashboard. The booking, guest list, timeline, payments, and incident reports will be preserved." : guardrail.type === "complete" ? "This closes the party workflow and moves it out of active operations. Records, guests, payments, incident reports, and timeline history stay preserved." : guardrail.step?.confirmationBody}</p><div className="mt-4 rounded-[12px] bg-[#F6F0E6] p-4 text-sm"><p className="font-semibold text-[#1E293B]">{party.date}</p><p className="mt-1 text-[#6B7280]">{party.time}</p></div><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setGuardrail(null)} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">Not Yet</button><button onClick={() => guardrail.type === "cancel" ? cancelParty() : guardrail.type === "complete" ? runPartyWorkflowAction("complete") : runPartyWorkflowAction("advance")} disabled={Boolean(activePartyAction)} className={`rounded-[10px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${guardrail.type === "cancel" ? "bg-[#9F1239]" : "bg-[#1E293B]"}`}>{activePartyAction ? "Working..." : guardrail.type === "cancel" ? "Yes, Cancel Party" : guardrail.type === "complete" ? "Complete Party" : guardrail.step?.nextActionLabel}</button></div></div></div>}
    </main>
  );
}
