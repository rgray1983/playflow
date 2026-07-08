"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ConfirmationParty = {
  id: string;
  title: string;
  eventNumber: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: string;
  pendingExpiresAt: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return date.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ConfirmPartyPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [party, setParty] = useState<ConfirmationParty | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadParty() {
      try {
        const response = await fetch(`/api/confirm-party/${token}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load confirmation.");
        setParty(data.party);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load confirmation.");
      } finally {
        setLoading(false);
      }
    }
    loadParty();
  }, [token]);

  async function confirmParty() {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/confirm-party/${token}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to confirm party.");
      setParty((current) => current ? { ...current, status: "CONFIRMED" } : current);
      setMessage("Party confirmed! Your deposit can now be processed by the venue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm party.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <section className="mx-auto mt-16 max-w-xl rounded-[18px] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#8A6D3B]">PlayFlow Confirmation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">Confirm Your Party</h1>
        {loading ? <p className="mt-4 text-sm text-[#6B7280]">Loading confirmation...</p> : party ? <div className="mt-5 rounded-[14px] bg-[#F6F0E6] p-5"><p className="text-xl font-semibold text-[#1E293B]">{party.title}</p><p className="mt-2 text-sm text-[#6B7280]">{party.eventNumber}</p><p className="mt-2 text-sm text-[#6B7280]">{formatDateTime(party.startTime)} - {formatDateTime(party.endTime)}</p><p className="mt-2 text-sm font-semibold text-[#1E293B]">Status: {party.status}</p>{party.pendingExpiresAt && <p className="mt-2 text-xs text-[#6B7280]">Hold expires: {formatDateTime(party.pendingExpiresAt)}</p>}</div> : null}
        {message && <p className="mt-4 rounded-[10px] bg-[#F6F0E6] p-3 text-sm font-semibold text-[#1E293B]">{message}</p>}
        {party && party.status === "PENDING" && <button onClick={confirmParty} disabled={working} className="mt-5 w-full rounded-[10px] bg-[#1E293B] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{working ? "Confirming..." : "Confirm Party"}</button>}
      </section>
    </main>
  );
}
