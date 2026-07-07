"use client";

import { useEffect, useState } from "react";
import {
  ActiveToggle,
  EmptyState,
  Message,
  SelectField,
  SettingsSection,
  TextField,
  formatCurrency,
} from "./SettingsPrimitives";

type MembershipPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  billingInterval: "NONE" | "MONTHLY" | "YEARLY";
  durationDays: number | null;
  visitLimit: number | null;
  autoRenewDefault: boolean;
  active: boolean;
};

type MembershipFormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  billingInterval: "NONE" | "MONTHLY" | "YEARLY";
  durationDays: string;
  visitLimit: string;
  autoRenewDefault: boolean;
  active: boolean;
};

const emptyMembershipForm: MembershipFormState = {
  id: "",
  name: "",
  description: "",
  price: "",
  billingInterval: "NONE",
  durationDays: "",
  visitLimit: "",
  autoRenewDefault: false,
  active: true,
};

export default function MembershipsSettings() {
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [form, setForm] = useState<MembershipFormState>(emptyMembershipForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadMemberships() {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/memberships");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load memberships.");
      setMemberships(data.memberships ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load memberships.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMemberships();
  }, []);

  function startNewMembership() {
    setForm(emptyMembershipForm);
    setIsFormOpen(true);
    setMessage("");
  }

  function startEditMembership(plan: MembershipPlan) {
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? "",
      price: String(plan.price ?? ""),
      billingInterval: plan.billingInterval,
      durationDays: plan.durationDays === null ? "" : String(plan.durationDays),
      visitLimit: plan.visitLimit === null ? "" : String(plan.visitLimit),
      autoRenewDefault: plan.autoRenewDefault,
      active: plan.active,
    });
    setIsFormOpen(true);
    setMessage("");
  }

  async function saveMembership() {
    const name = form.name.trim();
    if (!name) {
      setMessage("Membership name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/memberships", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          name,
          description: form.description.trim(),
          price: form.price || "0",
          billingInterval: form.billingInterval,
          durationDays: form.durationDays || null,
          visitLimit: form.visitLimit || null,
          autoRenewDefault: form.autoRenewDefault,
          active: form.active,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save membership.");
      setForm(emptyMembershipForm);
      setIsFormOpen(false);
      setMessage(form.id ? "Membership updated." : "Membership created.");
      await loadMemberships();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save membership.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMembership(id: string) {
    setMessage("");
    try {
      const response = await fetch(`/api/memberships?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete membership.");
      setMessage("Membership deleted.");
      await loadMemberships();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete membership.");
    }
  }

  return (
    <SettingsSection
      title="Memberships"
      description="Create monthly, seasonal, annual, or custom membership plans."
      action={
        <button onClick={startNewMembership} className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
          + New Membership
        </button>
      }
    >
      <Message message={message} />

      {isFormOpen && (
        <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#1E293B]">{form.id ? "Edit Membership" : "Create Membership"}</p>
              <p className="mt-1 text-xs text-[#6B7280]">Memberships can be sold in POS and checked during check-in later.</p>
            </div>
            <button onClick={() => { setIsFormOpen(false); setForm(emptyMembershipForm); }} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Cancel</button>
          </div>

          <div className="grid grid-cols-[1fr_150px_170px] gap-3">
            <TextField label="Name" value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} placeholder="Monthly Unlimited" />
            <TextField label="Price" value={form.price} onChange={(price) => setForm((current) => ({ ...current, price }))} placeholder="49.99" type="number" />
            <SelectField
              label="Billing"
              value={form.billingInterval}
              onChange={(billingInterval) => setForm((current) => ({ ...current, billingInterval: billingInterval as MembershipFormState["billingInterval"] }))}
              options={[
                { label: "None", value: "NONE" },
                { label: "Monthly", value: "MONTHLY" },
                { label: "Yearly", value: "YEARLY" },
              ]}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <TextField label="Duration Days" value={form.durationDays} onChange={(durationDays) => setForm((current) => ({ ...current, durationDays }))} placeholder="30" type="number" />
            <TextField label="Visit Limit" value={form.visitLimit} onChange={(visitLimit) => setForm((current) => ({ ...current, visitLimit }))} placeholder="Unlimited if blank" type="number" />
          </div>

          <div className="mt-3">
            <TextField label="Description" value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="Unlimited open play for one month" />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <ActiveToggle checked={form.active} onChange={(active) => setForm((current) => ({ ...current, active }))} />
              <label className="flex items-center gap-3 text-sm font-semibold text-[#1E293B]"><input checked={form.autoRenewDefault} onChange={(event) => setForm((current) => ({ ...current, autoRenewDefault: event.target.checked }))} type="checkbox" />Auto-renew default</label>
            </div>
            <button onClick={saveMembership} disabled={isSaving} className="rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Membership"}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[10px] bg-white/70 p-6 text-center"><p className="font-semibold text-[#1E293B]">Loading memberships...</p></div>
      ) : memberships.length > 0 ? (
        <div className="space-y-2">
          {memberships.map((membership) => (
            <div key={membership.id} className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#1E293B]">{membership.name}</p>
                <p className="mt-1 truncate text-xs text-[#6B7280]">{membership.description || "No description"} • {membership.active ? "Active" : "Inactive"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#1E293B]">{formatCurrency(membership.price)}</span>
                <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#6B7280]">{membership.billingInterval}</span>
                <button onClick={() => startEditMembership(membership)} className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Edit</button>
                <button onClick={() => deleteMembership(membership.id)} className="rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No membership plans created yet." description="Create the first plan, like Monthly Unlimited, Summer Pass, or Annual Membership." />
      )}
    </SettingsSection>
  );
}
