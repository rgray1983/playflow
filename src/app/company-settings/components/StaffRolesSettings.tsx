"use client";

import { useEffect, useState } from "react";
import { ActiveToggle, EmptyState, Message, SettingsSection, TextField } from "./SettingsPrimitives";

type StaffRole = { id: string; name: string; description: string; active: boolean };
type StaffRoleFormState = { id: string; name: string; description: string; active: boolean };
const emptyStaffRoleForm: StaffRoleFormState = { id: "", name: "", description: "", active: true };

export default function StaffRolesSettings() {
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [form, setForm] = useState<StaffRoleFormState>(emptyStaffRoleForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadStaffRoles() { setIsLoading(true); setMessage(""); try { const response = await fetch("/api/staff-roles"); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load staff roles."); setStaffRoles(data.staffRoles ?? []); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load staff roles."); } finally { setIsLoading(false); } }
  useEffect(() => { loadStaffRoles(); }, []);

  function startNewStaffRole() { setForm(emptyStaffRoleForm); setIsFormOpen(true); setMessage(""); }
  function startEditStaffRole(role: StaffRole) { setForm({ id: role.id, name: role.name, description: role.description ?? "", active: role.active }); setIsFormOpen(true); setMessage(""); }

  async function saveStaffRole() { const name = form.name.trim(); if (!name) { setMessage("Staff role name is required."); return; } setIsSaving(true); setMessage(""); try { const response = await fetch("/api/staff-roles", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id || undefined, name, description: form.description.trim(), permissions: {}, active: form.active }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save staff role."); setForm(emptyStaffRoleForm); setIsFormOpen(false); setMessage(form.id ? "Staff role updated." : "Staff role created."); await loadStaffRoles(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save staff role."); } finally { setIsSaving(false); } }
  async function deleteStaffRole(id: string) { setMessage(""); try { const response = await fetch(`/api/staff-roles?id=${id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to delete staff role."); setMessage("Staff role deleted."); await loadStaffRoles(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete staff role."); } }

  return <SettingsSection title="Staff Roles" description="Create configurable staff roles. Permissions can become more detailed later." action={<button onClick={startNewStaffRole} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ New Role</button>}><Message message={message} />{isFormOpen && <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#1E293B]">{form.id ? "Edit Staff Role" : "Create Staff Role"}</p><p className="mt-1 text-xs text-[#6B7280]">Roles will control permissions later.</p></div><button onClick={() => { setIsFormOpen(false); setForm(emptyStaffRoleForm); }} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Cancel</button></div><TextField label="Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Front Desk" /><div className="mt-3"><TextField label="Description" value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="Check-in, POS, waivers, and guest support" /></div><div className="mt-4 flex items-center justify-between"><ActiveToggle checked={form.active} onChange={(active) => setForm((current) => ({ ...current, active }))} /><button onClick={saveStaffRole} disabled={isSaving} className="rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Role"}</button></div></div>}{isLoading ? <div className="rounded-[10px] bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">Loading staff roles...</p></div> : staffRoles.length > 0 ? <div className="space-y-2">{staffRoles.map((role) => <div key={role.id} className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3"><div className="min-w-0"><p className="font-semibold text-[#1E293B]">{role.name}</p><p className="mt-1 truncate text-xs text-[#6B7280]">{role.description || "No description"} • {role.active ? "Active" : "Inactive"}</p></div><div className="flex items-center gap-3"><button onClick={() => startEditStaffRole(role)} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Edit</button><button onClick={() => deleteStaffRole(role.id)} className="rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">Delete</button></div></div>)}</div> : <EmptyState title="No staff roles created yet." description="Create the first role, like Owner, Manager, Front Desk, or Party Host." />}</SettingsSection>;
}
