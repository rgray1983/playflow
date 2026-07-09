"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type HostGuest = {
  id: string;
  guestName: string | null;
  parentName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  rsvpStatus: string;
  waiverStatus: string;
  notes: string | null;
  declineReason: string | null;
  createdAt: string;
};

type HostEvent = {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  packageName: string | null;
  guestOfHonor: string | null;
  notes: string;
  totals: {
    attending: number;
    declined: number;
    totalResponses: number;
    waiverNeeded: number;
    favorCount: number;
    supplyCount: number;
  };
  attendingGuests: HostGuest[];
  declinedGuests: HostGuest[];
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBD";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function HostRsvpDashboardPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [event, setEvent] = useState<HostEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadHostDashboard() {
      try {
        const response = await fetch(`/api/rsvp/${token}/host`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load host dashboard.");
        setEvent(data.event);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load host dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadHostDashboard();
  }, [token]);

  const eventTime = useMemo(() => {
    if (!event) return "";
    return `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
  }, [event]);

  return (
    <main className="min-h-screen bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[22px] bg-[#F6F0E6] shadow-sm">
        <header className="border-b border-black/10 bg-white p-6">
          <p className="text-sm font-semibold text-[#8A6D3B]">Host RSVP Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
            {loading ? "Loading guest responses..." : event?.title || "Host dashboard not found"}
          </h1>
          {event && <p className="mt-2 text-sm text-[#6B7280]">{formatDate(event.eventDate)} • {eventTime}</p>}
        </header>

        <section className="p-6">
          {errorMessage && <div className="mb-4 rounded-[12px] border border-[#FCA5A5] bg-[#FFE0E9] p-4 text-sm font-semibold text-[#9F1239]">{errorMessage}</div>}

          {event && (
            <div className="space-y-4">
              <section className="rounded-[14px] border border-black/10 bg-white p-5">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Planning Counts</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <div className="rounded-[12px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold text-[#6B7280]">Attending</p><p className="mt-2 text-3xl font-semibold text-[#1E293B]">{event.totals.attending}</p></div>
                  <div className="rounded-[12px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold text-[#6B7280]">Declined</p><p className="mt-2 text-3xl font-semibold text-[#1E293B]">{event.totals.declined}</p></div>
                  <div className="rounded-[12px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold text-[#6B7280]">Responses</p><p className="mt-2 text-3xl font-semibold text-[#1E293B]">{event.totals.totalResponses}</p></div>
                  <div className="rounded-[12px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold text-[#6B7280]">Favors</p><p className="mt-2 text-3xl font-semibold text-[#1E293B]">{event.totals.favorCount}</p></div>
                  <div className="rounded-[12px] bg-[#F6F0E6] p-4"><p className="text-xs font-semibold text-[#6B7280]">Waivers Needed</p><p className="mt-2 text-3xl font-semibold text-[#1E293B]">{event.totals.waiverNeeded}</p></div>
                </div>
              </section>

              <section className="rounded-[14px] border border-black/10 bg-white p-5">
                <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Party Details</h2>
                <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                  <p><span className="font-semibold text-[#6B7280]">Guest of honor:</span> {event.guestOfHonor || "Not listed"}</p>
                  <p><span className="font-semibold text-[#6B7280]">Package:</span> {event.packageName || "Not listed"}</p>
                  <p><span className="font-semibold text-[#6B7280]">Event #:</span> {event.eventNumber || "Pending"}</p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[14px] border border-black/10 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Attending Guests</h2>
                    <span className="rounded-full bg-[#D7F1EC] px-3 py-1 text-xs font-semibold text-[#155E75]">{event.attendingGuests.length}</span>
                  </div>
                  <div className="space-y-2">
                    {event.attendingGuests.length > 0 ? event.attendingGuests.map((guest) => (
                      <div key={guest.id} className="rounded-[10px] bg-[#F6F0E6] p-3">
                        <p className="font-semibold text-[#1E293B]">{guest.guestName || "Unnamed Guest"}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">{guest.parentName || "Parent pending"} • Waiver {guest.waiverStatus === "SIGNED" ? "signed" : "needed"}</p>
                        {guest.notes && <p className="mt-2 text-sm text-[#1E293B]">{guest.notes}</p>}
                      </div>
                    )) : <p className="rounded-[10px] bg-[#F6F0E6] p-3 text-sm text-[#6B7280]">No attending guests yet.</p>}
                  </div>
                </div>

                <div className="rounded-[14px] border border-black/10 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">Declined Guests</h2>
                    <span className="rounded-full bg-[#FFE0E9] px-3 py-1 text-xs font-semibold text-[#9F1239]">{event.declinedGuests.length}</span>
                  </div>
                  <div className="space-y-2">
                    {event.declinedGuests.length > 0 ? event.declinedGuests.map((guest) => (
                      <div key={guest.id} className="rounded-[10px] bg-[#F6F0E6] p-3">
                        <p className="font-semibold text-[#1E293B]">{guest.guestName || "Unnamed Guest"}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">{guest.parentName || "Parent pending"}</p>
                        <p className="mt-2 text-sm text-[#1E293B]">{guest.declineReason || "No reason provided."}</p>
                      </div>
                    )) : <p className="rounded-[10px] bg-[#F6F0E6] p-3 text-sm text-[#6B7280]">No declined responses yet.</p>}
                  </div>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
