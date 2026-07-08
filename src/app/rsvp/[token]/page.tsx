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
  guests: {
    id: string;
    guestName: string | null;
    parentName: string | null;
    status: string;
    waiverStatus: string | null;
    createdAt: string;
  }[];
};

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
  const [guestName, setGuestName] = useState("");
  const [parentName, setParentName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  async function submitRsvp() {
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guestName,
          parentName,
          guestEmail,
          guestPhone,
          notes,
          waiverAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit RSVP.");
      }

      setSubmitted(true);
      setGuestName("");
      setParentName("");
      setGuestEmail("");
      setGuestPhone("");
      setNotes("");
      setWaiverAccepted(false);
      await loadEvent();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit RSVP.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[22px] bg-[#F6F0E6] shadow-sm">
        <header className="border-b border-black/10 bg-white p-6">
          <p className="text-sm font-semibold text-[#8A6D3B]">PlayFlow RSVP</p>

          {loading ? (
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
              Loading invitation...
            </h1>
          ) : event ? (
            <>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                {event.title}
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                {formatDate(event.eventDate)} • {eventTime}
              </p>
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
              <p className="font-semibold text-[#245B35]">RSVP submitted.</p>
              <p className="mt-1 text-sm text-[#245B35]">
                You have been added to the guest list.
              </p>
            </div>
          )}

          {event && (
            <div className="grid gap-4 md:grid-cols-[1fr_260px]">
              <section className="rounded-[16px] border border-black/10 bg-white p-5">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                  Add Your Guest
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  This adds the guest directly to the party list so check-in is easier.
                </p>

                <div className="mt-5 space-y-3">
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                    placeholder="Guest / child name"
                  />

                  <input
                    value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                    placeholder="Parent / guardian name"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                      placeholder="Email"
                    />
                    <input
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      className="w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                      placeholder="Phone"
                    />
                  </div>

                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-[88px] w-full resize-none rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                    placeholder="Allergies, notes, or special instructions"
                  />

                  <label className="flex gap-3 rounded-[10px] border border-black/10 bg-[#F6F0E6] p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={waiverAccepted}
                      onChange={(event) => setWaiverAccepted(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <strong>I agree to sign the waiver for this guest.</strong>
                      <br />
                      <span className="text-[#6B7280]">
                        This is a placeholder for the final online waiver text/signature flow.
                      </span>
                    </span>
                  </label>

                  <button
                    onClick={submitRsvp}
                    disabled={submitting || !guestName.trim()}
                    className="w-full rounded-[12px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {submitting ? "Submitting..." : "Submit RSVP"}
                  </button>
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-[16px] border border-black/10 bg-white p-5">
                  <p className="text-sm font-semibold text-[#6B7280]">Guest List</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                    {event.guests.length}
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">RSVPs received</p>

                  <div className="mt-4 space-y-2">
                    {event.guests.length > 0 ? (
                      event.guests.map((guest) => (
                        <div key={guest.id} className="rounded-[10px] bg-[#F6F0E6] p-3">
                          <p className="text-sm font-semibold text-[#1E293B]">
                            {guest.guestName}
                          </p>
                          <p className="mt-1 text-xs text-[#6B7280]">
                            Waiver {guest.waiverStatus === "SIGNED" ? "signed" : "needed"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[10px] bg-[#F6F0E6] p-3 text-sm text-[#6B7280]">
                        No guests yet.
                      </p>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
