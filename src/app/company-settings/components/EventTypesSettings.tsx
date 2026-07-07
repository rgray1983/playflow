"use client";

import { useEffect, useState } from "react";
import ColorPickerField from "@/components/ColorPickerField";
import { ActiveToggle, EmptyState, Message, SettingsSection, TextField } from "./SettingsPrimitives";

type EventType = { id: string; name: string; description: string; color: string; active: boolean };
type EventTypeFormState = { id: string; name: string; description: string; color: string; active: boolean };

const emptyEventTypeForm: EventTypeFormState = { id: "", name: "", description: "", color: "#3B82F6", active: true };

export default function EventTypesSettings() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [form, setForm] = useState<EventTypeFormState>(emptyEventTypeForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadEventTypes() {
    setIsLoading(true); setMessage("");
    try {
      const response = await fetch("/api/event-types");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load event types.");
      setEventTypes(data.eventTypes ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load event types.");
    } finally { setIsLoading(false); }
  }

  useEffect(() => { loadEventTypes(); }, []);

  function startNewEventType() { setForm(emptyEventTypeForm); setIsFormOpen(true); setMessage(""); }
  function startEditEventType(eventType: EventType) {
    setForm({ id: eventType.id, name: eventType.name, description: eventType.description ?? "", color: eventType.color || "#3B82F6", active: eventType.active });
    setIsFormOpen(true); setMessage("");
  }

  async function saveEventType() {
    const name = form.name.trim();
    if (!name) { setMessage("Event type name is required."); return; }
    setIsSaving(true); setMessage("");
    try {
      const response = await fetch("/api/event-types", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id || undefined, name, description: form.description.trim(), color: form.color.trim(), active: form.active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save event type.");
      setForm(emptyEventTypeForm); setIsFormOpen(false); setMessage(form.id ? "Event type updated." : "Event type created."); await loadEventTypes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save event type.");
    } finally { setIsSaving(false); }
  }

  async function deleteEventType(id: string) {
    setMessage("");
    try {
      const response = await fetch(`/api/event-types?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete event type.");
      setMessage("Event type deleted."); await loadEventTypes();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete event type."); }
  }

  return (
    <SettingsSection title="Party & Event Types" description="Create birthday parties, field trips, private events, classes, rentals, or custom event types." action={<button onClick={startNewEventType} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ New Event Type</button>}>
      <Message message={message} />
      {isFormOpen && <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#1E293B]">{form.id ? "Edit Event Type" : "Create Event Type"}</p><p className="mt-1 text-xs text-[#6B7280]">Event type colors will drive Calendar and Party & Events later.</p></div><button onClick={() => { setIsFormOpen(false); setForm(emptyEventTypeForm); }} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Cancel</button></div>
        <div className="grid grid-cols-[1fr_180px] gap-3"><TextField label="Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Birthday Party" /><ColorPickerField label="Color" value={form.color} onChange={(color) => setForm((current) => ({ ...current, color }))} /></div>
        <div className="mt-3"><TextField label="Description" value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="Parties, rentals, field trips, classes, etc." /></div>
        <div className="mt-4 flex items-center justify-between"><ActiveToggle checked={form.active} onChange={(active) => setForm((current) => ({ ...current, active }))} /><button onClick={saveEventType} disabled={isSaving} className="rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Event Type"}</button></div>
      </div>}
      {isLoading ? <div className="rounded-[10px] bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">Loading event types...</p></div> : eventTypes.length > 0 ? <div className="space-y-2">{eventTypes.map((eventType) => <div key={eventType.id} className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="h-9 w-9 shrink-0 rounded-[9px] border border-black/10" style={{ backgroundColor: eventType.color || "#F6F0E6" }} /><div className="min-w-0"><p className="font-semibold text-[#1E293B]">{eventType.name}</p><p className="mt-1 truncate text-xs text-[#6B7280]">{eventType.description || "No description"} • {eventType.active ? "Active" : "Inactive"}</p></div></div><div className="flex items-center gap-3"><button onClick={() => startEditEventType(eventType)} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Edit</button><button onClick={() => deleteEventType(eventType.id)} className="rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">Delete</button></div></div>)}</div> : <EmptyState title="No event types created yet." description="Create the first event type, like Birthday Party, Field Trip, or Private Event." />}
    </SettingsSection>
  );
}
