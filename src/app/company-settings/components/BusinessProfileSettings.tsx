"use client";

import { useEffect, useState } from "react";
import { Message, SettingsSection, TextField } from "./SettingsPrimitives";

type BusinessProfileForm = {
  name: string;
  phone: string;
  email: string;
  website: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
};

const emptyBusinessProfile: BusinessProfileForm = {
  name: "",
  phone: "",
  email: "",
  website: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  timezone: "America/New_York",
};

export default function BusinessProfileSettings() {
  const [form, setForm] = useState<BusinessProfileForm>(emptyBusinessProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBusinessProfile() {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/business-profile");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load business profile.");
      if (data.businessProfile) setForm({ ...emptyBusinessProfile, ...data.businessProfile });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load business profile.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBusinessProfile();
  }, []);

  async function saveBusinessProfile() {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save business profile.");
      setForm({ ...emptyBusinessProfile, ...data.businessProfile });
      setMessage("Business profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save business profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Business Profile"
      description="This information identifies the business throughout PlayFlow."
      action={<button onClick={saveBusinessProfile} disabled={isSaving || isLoading} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Profile"}</button>}
    >
      <Message message={message} />
      {isLoading ? <div className="rounded-[10px] bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">Loading business profile...</p></div> : <div className="space-y-4 rounded-[10px] bg-white p-4"><div className="grid grid-cols-2 gap-4"><TextField label="Business Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Palmetto Playhouse" /><TextField label="Timezone" value={form.timezone} onChange={(timezone) => setForm((current) => ({ ...current, timezone }))} placeholder="America/New_York" /><TextField label="Phone" value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} placeholder="843-555-0000" /><TextField label="Email" value={form.email} onChange={(email) => setForm((current) => ({ ...current, email }))} placeholder="hello@business.com" /><TextField label="Website" value={form.website} onChange={(website) => setForm((current) => ({ ...current, website }))} placeholder="https://example.com" /><TextField label="Address" value={form.address1} onChange={(address1) => setForm((current) => ({ ...current, address1 }))} placeholder="Street address" /><TextField label="Address 2" value={form.address2} onChange={(address2) => setForm((current) => ({ ...current, address2 }))} placeholder="Suite, unit, etc." /><TextField label="City" value={form.city} onChange={(city) => setForm((current) => ({ ...current, city }))} placeholder="Florence" /><TextField label="State" value={form.state} onChange={(state) => setForm((current) => ({ ...current, state }))} placeholder="SC" /><TextField label="ZIP" value={form.zip} onChange={(zip) => setForm((current) => ({ ...current, zip }))} placeholder="29501" /></div></div>}
    </SettingsSection>
  );
}
