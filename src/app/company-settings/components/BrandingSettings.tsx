"use client";

import { useEffect, useState } from "react";
import ColorPickerField from "@/components/ColorPickerField";
import { Message, SettingsSection, TextField } from "./SettingsPrimitives";

type BrandingForm = { logoUrl: string; primaryColor: string; accentColor: string };
const emptyBranding: BrandingForm = { logoUrl: "", primaryColor: "#1E293B", accentColor: "#20B8A8" };

export default function BrandingSettings() {
  const [form, setForm] = useState<BrandingForm>(emptyBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBranding() { setIsLoading(true); setMessage(""); try { const response = await fetch("/api/branding"); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load branding."); if (data.branding) setForm({ ...emptyBranding, ...data.branding }); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load branding."); } finally { setIsLoading(false); } }
  useEffect(() => { loadBranding(); }, []);

  async function saveBranding() { setIsSaving(true); setMessage(""); try { const response = await fetch("/api/branding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to save branding."); setForm({ ...emptyBranding, ...data.branding }); setMessage("Branding saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save branding."); } finally { setIsSaving(false); } }

  return <SettingsSection title="Branding" description="Make PlayFlow feel like each business's own system." action={<button onClick={saveBranding} disabled={isSaving || isLoading} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Branding"}</button>}><Message message={message} />{isLoading ? <div className="rounded-[10px] bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">Loading branding...</p></div> : <div className="rounded-[10px] bg-white p-4"><div className="grid grid-cols-2 gap-4"><TextField label="Logo URL" value={form.logoUrl} onChange={(logoUrl) => setForm((current) => ({ ...current, logoUrl }))} placeholder="https://..." /><div /><ColorPickerField label="Primary Color" value={form.primaryColor} onChange={(primaryColor) => setForm((current) => ({ ...current, primaryColor }))} /><ColorPickerField label="Accent Color" value={form.accentColor} onChange={(accentColor) => setForm((current) => ({ ...current, accentColor }))} /></div></div>}</SettingsSection>;
}
