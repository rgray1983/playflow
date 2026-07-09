"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type RsvpEvent = {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  packageName: string | null;
  guestOfHonor: string | null;
  notes: string;
};

type ResponseMode = "attending" | "declined" | "";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
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

export default function RsvpPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [event, setEvent] = useState<RsvpEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMode, setResponseMode] = useState<ResponseMode>("");
  const [guestName, setGuestName] = useState("");
  const [parentName, setParentName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ResponseMode>("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEvent() {
    try {
      const response = await fetch(`/api/rsvp/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load RSVP.");
      }

      setEvent(data.event);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load RSVP.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvent();
  }, [token]);

  const eventTime = useMemo(() => {
    if (!event) return "";
    return `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
  }, [event]);

  async function submitRsvp(response: Exclude<ResponseMode, "">) {
    setSubmitting(true);
    setErrorMessage("");

    try {
      const responseResult = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response,
          guestName,
          parentName,
          guestEmail,
          guestPhone,
          notes,
          declineReason,
          waiverAccepted,
        }),
      });

      const data = await responseResult.json();

      if (!responseResult.ok) {
        throw new Error(data.error || "Unable to submit RSVP.");
      }

      setSubmitted(response);
      setGuestName("");
      setParentName("");
      setGuestEmail("");
      setGuestPhone("");
      setNotes("");
      setDeclineReason("");
      setWaiverAccepted(false);
      setResponseMode("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit RSVP.");
    } finally {
      setSubmitting(false);
    }
  }

  const inviteName = event?.guestOfHonor || "Your friend";
  const partyType = event?.packageName || event?.title || "party";

  return (
    <main className="min-h-screen bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[22px] bg-[#F6F0E6] shadow-sm">
        <header className="border-b border-black/10 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-[#8A6D3B]">You&apos;re Invited</p>

          {loading ? (
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
              Loading invitation...
            </h1>
          ) : event ? (
            <>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                {inviteName} has invited you to their {partyType}!
              </h1>
              <p className="mt-3 text-sm text-[#6B7280]">
                {formatDate(event.eventDate)} • {eventTime}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1E293B]">{event.title}</p>
              {event.packageName && (
                <p className="mt-1 text-sm text-[#6B7280]">{event.packageName}</p>
              )}
            </>
          ) : (
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
              RSVP link not found
            </h1>
          )}
        </header>

        <section className="p-6">
          {errorMessage && (
            <div className="mb-4 rounded-[12px] border border-[#FCA5A5] bg-[#FFE0E9] p-4 text-sm font-semibold text-[#9F1239]">
              {errorMessage}
            </div>
          )}

          {submitted && (
            <div className="mb-4 rounded-[12px] border border-[#7BAE7F] bg-[#E9F8EC] p-4">
              <p className="font-semibold text-[#245B35]">
                {submitted === "attending" ? "RSVP submitted." : "Thanks for letting the host know."}
              </p>
              <p className="mt-1 text-sm text-[#245B35]">
                {submitted === "attending" ? "We saved your response for this party." : "Your decline response has been saved."}
              </p>
            </div>
          )}

          {event && !responseMode && (
            <section className="rounded-[16px] border border-black/10 bg-white p-5 text-center">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                Can you make it?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[#6B7280]">
                Please respond for your own guest so the host can plan food, favors, and supplies.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <button
                  onClick={() => setResponseMode("attending")}
                  className="rounded-[14px] bg-[#1E293B] px-5 py-4 text-sm font-semibold text-white"
                >
                  I&apos;m coming!
                </button>
                <button
                  onClick={() => setResponseMode("declined")}
                  className="rounded-[14px] border border-black/10 bg-[#F6F0E6] px-5 py-4 text-sm font-semibold text-[#1E293B]"
                >
                  Sorry, I can&apos;t make it
                </button>
              </div>
            </section>
          )}

          {event && responseMode === "attending" && (
            <section className="rounded-[16px] border border-black/10 bg-white p-5">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                Great, who&apos;s coming?
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                This helps the host prepare and makes party check-in easier.
              </p>

              <div className="mt-5 space-y-3">
                <input value={guestName} onChange={(event) => setGuestName(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Guest / child name" />
                <input value={parentName} onChange={(event) => setParentName(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Parent / guardian name" />
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Email" />
                  <input value={guestPhone} onChange={(event) => setGuestPhone(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Phone" />
                </div>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[88px] w-full resize-none rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Allergies, notes, or special instructions" />
                <label className="flex gap-3 rounded-[10px] border border-black/10 bg-[#F6F0E6] p-4 text-sm">
                  <input type="checkbox" checked={waiverAccepted} onChange={(event) => setWaiverAccepted(event.target.checked)} className="mt-1" />
                  <span>
                    <strong>I agree to sign the waiver for this guest.</strong>
                    <br />
                    <span className="text-[#6B7280]">This preserves the current placeholder waiver behavior.</span>
                  </span>
                </label>

                <div className="grid gap-3 md:grid-cols-[auto_1fr]">
                  <button onClick={() => setResponseMode("")} className="rounded-[12px] border border-black/10 bg-white px-4 py-4 text-sm font-semibold text-[#1E293B]">Back</button>
                  <button onClick={() => submitRsvp("attending")} disabled={submitting || !guestName.trim()} className="rounded-[12px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white disabled:opacity-40">{submitting ? "Submitting..." : "Submit RSVP"}</button>
                </div>
              </div>
            </section>
          )}

          {event && responseMode === "declined" && (
            <section className="rounded-[16px] border border-black/10 bg-white p-5">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                Sorry you can&apos;t make it
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Let the host know who is declining. A reason is optional.
              </p>

              <div className="mt-5 space-y-3">
                <input value={guestName} onChange={(event) => setGuestName(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Guest / child name" />
                <input value={parentName} onChange={(event) => setParentName(event.target.value)} className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Parent / guardian name" />
                <textarea value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} className="min-h-[96px] w-full resize-none rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none" placeholder="Optional reason" />
                <div className="grid gap-3 md:grid-cols-[auto_1fr]">
                  <button onClick={() => setResponseMode("")} className="rounded-[12px] border border-black/10 bg-white px-4 py-4 text-sm font-semibold text-[#1E293B]">Back</button>
                  <button onClick={() => submitRsvp("declined")} disabled={submitting || !guestName.trim()} className="rounded-[12px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white disabled:opacity-40">{submitting ? "Submitting..." : "Submit Decline"}</button>
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
