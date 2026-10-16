"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { SettingsSection } from "./SettingsPrimitives";

type Staff = { id: string; firstName: string; lastName: string; email: string | null; accessRole: string; status: string; accessApproved: boolean; linked: boolean };
const roles = ["MANAGER", "FRONT_DESK", "PARTY_HOST"];
const labels: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", FRONT_DESK: "Front desk", PARTY_HOST: "Party host" };
const field = "w-full rounded-[8px] border border-black/15 bg-white px-3 py-3 text-sm";

async function readStaff(): Promise<Staff[]> {
  const response = await fetch("/api/staff", { cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(response.status === 403 ? "Only the business owner can manage staff access." : body.error || "Unable to load staff.");
  return body.staff;
}

export default function StaffAccessSettings() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", accessRole: "FRONT_DESK" });
  const load = useCallback(async () => {
    try {
      setStaff(await readStaff());
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load staff."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    readStaff().then((people) => { if (active) setStaff(people); })
      .catch((error) => { if (active) setError(error instanceof Error ? error.message : "Unable to load staff."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to approve staff.");
      setForm({ firstName: "", lastName: "", email: "", accessRole: "FRONT_DESK" });
      setMessage("Staff access approved. Ask them to create an account with this email and verify it.");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to approve staff."); }
    finally { setBusy(false); }
  }
  async function update(person: Staff, accessRole: string, status: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/staff", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: person.id, accessRole, status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update staff.");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update staff."); }
    finally { setBusy(false); }
  }
  return <SettingsSection title="Staff Access" description="Approve the people who can sign in, and choose what they can do.">
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <form onSubmit={save} className="mb-5 space-y-3 rounded-[10px] bg-white/70 p-4">
      <h3 className="font-semibold">Approve a staff member</h3>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">First name<input required maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={field} /></label><label className="text-xs font-semibold">Last name<input maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={field} /></label></div>
      <label className="block text-xs font-semibold">Email<input type="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} /></label>
      <label className="block text-xs font-semibold">Access role<select value={form.accessRole} onChange={(e) => setForm({ ...form, accessRole: e.target.value })} className={field}>{roles.map((role) => <option key={role} value={role}>{labels[role]}</option>)}</select></label>
      <button disabled={busy || loading} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Approve staff access"}</button>
    </form>
    <p className="mb-4 text-xs leading-5 text-[#6B7280]">Managers can change settings and run daily operations. Front desk can manage bookings, payments, and guests. Party hosts can check guests in and record incidents. Only the owner manages staff access.</p>
    {loading ? <p>Loading staff…</p> : <div className="space-y-3">{staff.map((person) => <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-white p-4">
      <div><p className="font-semibold">{person.firstName} {person.lastName}</p><p className="text-xs text-[#6B7280]">{person.email || "No email"} · {person.linked ? "Login linked" : person.accessApproved ? "Awaiting account" : "Access not approved"}</p></div>
      {person.accessRole === "OWNER" ? <span className="text-sm font-semibold">Owner</span> : <div className="flex flex-wrap gap-2"><select aria-label={`Role for ${person.firstName}`} disabled={busy} value={person.accessRole} onChange={(e) => void update(person, e.target.value, person.status)} className={field}>{roles.map((role) => <option key={role} value={role}>{labels[role]}</option>)}</select><button disabled={busy} onClick={() => void update(person, person.accessRole, person.status === "ACTIVE" && person.accessApproved ? "INACTIVE" : "ACTIVE")} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-50">{person.status === "ACTIVE" && person.accessApproved ? "Deactivate" : "Approve / activate"}</button></div>}
    </div>)}</div>}
  </SettingsSection>;
}
