"use client";
import { useEffect, useState } from "react";
export default function BookingScheduleSettings() {
  const [times, setTimes] = useState("");
  const [setup, setSetup] = useState(30);
  const [buffer, setBuffer] = useState(0);
  const [days, setDays] = useState<number[]>([]);
  const [timezone, setTimezone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/booking-settings").then(async r => { if (!r.ok) throw new Error("Unable to load schedule."); return r.json(); }).then(data => { setTimes(data.schedule.startTimes.join(", ")); setBuffer(data.schedule.bufferMinutes); setSetup(data.schedule.setupMinutes ?? 30); setDays(data.schedule.daysOfWeek); setTimezone(data.timezone); setLoaded(true); }).catch(e => setMessage(e.message));
  }, []);
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/booking-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startTimes: times.split(",").map(t => t.trim()), bufferMinutes: buffer, setupMinutes: setup, daysOfWeek: days }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save schedule.");
      setMessage("Booking schedule saved.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save schedule."); } finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-xl border border-black/10 bg-white p-6"><h2 className="text-xl font-semibold">Booking Schedule</h2><p className="text-sm text-gray-600">Bookings reserve the whole venue for the package duration. Times use {timezone || "the business timezone"}. Changes apply to new bookings; existing reservations remain in place.</p><label className="block text-sm font-semibold">Start times (24-hour format, separated by commas)<input disabled={!loaded} value={times} onChange={e => setTimes(e.target.value)} className="mt-2 block w-full rounded-lg border p-3" placeholder="09:00, 12:00, 15:00, 18:00" /></label><label className="block text-sm font-semibold">Setup before party (minutes)<input disabled={!loaded} type="number" min={0} max={120} value={setup} onChange={e => setSetup(Number(e.target.value))} className="mt-2 block rounded-lg border p-3" /></label><label className="block text-sm font-semibold">Turnaround between bookings (minutes)<input disabled={!loaded} type="number" min={0} max={720} value={buffer} onChange={e => setBuffer(Number(e.target.value))} className="mt-2 block rounded-lg border p-3" /></label><fieldset><legend className="mb-2 text-sm font-semibold">Open days</legend><div className="flex flex-wrap gap-4">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((name, i) => <label key={name}><input disabled={!loaded} type="checkbox" checked={days.includes(i + 1)} onChange={e => setDays(current => e.target.checked ? [...current, i + 1] : current.filter(d => d !== i + 1))} /> {name}</label>)}</div></fieldset><button disabled={!loaded || busy} onClick={save} className="rounded-lg bg-[#1E293B] px-5 py-3 text-white disabled:opacity-40">{busy ? "Saving…" : "Save Schedule"}</button>{message && <p role="status">{message}</p>}</section>;
}
