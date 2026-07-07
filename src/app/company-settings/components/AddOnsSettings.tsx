"use client";

import { useEffect, useState } from "react";
import { ActiveToggle, EmptyState, Message, SettingsSection, TextField, formatCurrency } from "./SettingsPrimitives";

type AddOn = { id: string; name: string; description: string; price: number; active: boolean };
type AddOnFormState = { id: string; name: string; description: string; price: string; active: boolean };
const emptyAddOnForm: AddOnFormState = { id: "", name: "", description: "", price: "", active: true };

export default function AddOnsSettings() {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [form, setForm] = useState<AddOnFormState>(emptyAddOnForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAddOns() {
    setIsLoading(true); setMessage("");
    try {
      const response = await fetch("/api/add-ons");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load add-ons.");
      setAddOns(data.addOns ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load add-ons."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { loadAddOns(); }, []);

  function startNewAddOn() { setForm(emptyAddOnForm); setIsFormOpen(true); setMessage(""); }
  function startEditAddOn(addOn: AddOn) { setForm({ id: addOn.id, name: addOn.name, description: addOn.description ?? "", price: String(addOn.price ?? ""), active: addOn.active }); setIsFormOpen(true); setMessage(""); }

  async function saveAddOn() {
    const name = form.name.trim();
    if (!name) { setMessage("Add-on name is required."); return; }
    setIsSaving(true); setMessage("");
    try {
      const response = await fetch("/api/add-ons", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id || undefined, name, description: form.description.trim(), price: form.price || "0", active: form.active }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save add-on.");
      setForm(emptyAddOnForm); setIsFormOpen(false); setMessage(form.id ? "Add-on updated." : "Add-on created."); await loadAddOns();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save add-on."); }
    finally { setIsSaving(false); }
  }

  async function deleteAddOn(id: string) {
    setMessage("");
    try {
      const response = await fetch(`/api/add-ons?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete add-on.");
      setMessage("Add-on deleted."); await loadAddOns();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete add-on."); }
  }

  return (
    <SettingsSection title="Add-Ons" description="Create balloon arches, extra time, food, services, or any other extras this business sells." action={<button onClick={startNewAddOn} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ New Add-On</button>}>
      <Message message={message} />
      {isFormOpen && <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#1E293B]">{form.id ? "Edit Add-On" : "Create Add-On"}</p><p className="mt-1 text-xs text-[#6B7280]">Add-ons can be attached to parties and events later.</p></div><button onClick={() => { setIsFormOpen(false); setForm(emptyAddOnForm); }} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Cancel</button></div><div className="grid grid-cols-[1fr_150px] gap-3"><TextField label="Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Balloon Arch" /><TextField label="Price" value={form.price} onChange={(price) => setForm((current) => ({ ...current, price }))} placeholder="75.00" type="number" /></div><div className="mt-3"><TextField label="Description" value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="Optional description" /></div><div className="mt-4 flex items-center justify-between"><ActiveToggle checked={form.active} onChange={(active) => setForm((current) => ({ ...current, active }))} /><button onClick={saveAddOn} disabled={isSaving} className="rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Add-On"}</button></div></div>}
      {isLoading ? <div className="rounded-[10px] bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">Loading add-ons...</p></div> : addOns.length > 0 ? <div className="space-y-2">{addOns.map((addOn) => <div key={addOn.id} className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3"><div className="min-w-0"><p className="font-semibold text-[#1E293B]">{addOn.name}</p><p className="mt-1 truncate text-xs text-[#6B7280]">{addOn.description || "No description"} • {addOn.active ? "Active" : "Inactive"}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-[#1E293B]">{formatCurrency(addOn.price)}</span><button onClick={() => startEditAddOn(addOn)} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Edit</button><button onClick={() => deleteAddOn(addOn.id)} className="rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">Delete</button></div></div>)}</div> : <EmptyState title="No add-ons created yet." description="Create the first add-on, like Balloon Arch, Extra Time, or Pizza." />}
    </SettingsSection>
  );
}
