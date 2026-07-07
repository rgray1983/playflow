"use client";

import { useEffect, useState } from "react";
import ColorPickerField from "@/components/ColorPickerField";
import {
  ActiveToggle,
  EmptyState,
  Message,
  SettingsSection,
  TextField,
  formatCurrency,
} from "./SettingsPrimitives";

type Admission = {
  id: string;
  name: string;
  description: string;
  price: number;
  color: string;
  active: boolean;
};

type AdmissionFormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  color: string;
  active: boolean;
};

const emptyAdmissionForm: AdmissionFormState = {
  id: "",
  name: "",
  description: "",
  price: "",
  color: "#20B8A8",
  active: true,
};

export default function AdmissionsSettings() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [form, setForm] = useState<AdmissionFormState>(emptyAdmissionForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAdmissions() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admissions");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load admissions.");
      }

      setAdmissions(data.admissions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load admissions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAdmissions();
  }, []);

  function startNewAdmission() {
    setForm(emptyAdmissionForm);
    setIsFormOpen(true);
    setMessage("");
  }

  function startEditAdmission(admission: Admission) {
    setForm({
      id: admission.id,
      name: admission.name,
      description: admission.description ?? "",
      price: String(admission.price ?? ""),
      color: admission.color || "#20B8A8",
      active: admission.active,
    });
    setIsFormOpen(true);
    setMessage("");
  }

  async function saveAdmission() {
    const name = form.name.trim();

    if (!name) {
      setMessage("Admission name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admissions", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          name,
          description: form.description.trim(),
          price: form.price || "0",
          color: form.color.trim(),
          active: form.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save admission.");
      }

      setForm(emptyAdmissionForm);
      setIsFormOpen(false);
      setMessage(form.id ? "Admission updated." : "Admission created.");
      await loadAdmissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save admission.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteAdmission(admissionId: string) {
    setMessage("");

    try {
      const response = await fetch(`/api/admissions?id=${admissionId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete admission.");
      }

      setMessage("Admission deleted.");
      await loadAdmissions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete admission.");
    }
  }

  return (
    <SettingsSection
      title="Admissions"
      description="Create the admission options this business sells during check-in and general POS checkout."
      action={
        <button
          onClick={startNewAdmission}
          className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white"
        >
          + New Admission
        </button>
      }
    >
      <Message message={message} />

      {isFormOpen && (
        <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#1E293B]">
                {form.id ? "Edit Admission" : "Create Admission"}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Admissions save directly to Neon through Prisma.
              </p>
            </div>

            <button
              onClick={() => {
                setIsFormOpen(false);
                setForm(emptyAdmissionForm);
              }}
              className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-[1fr_160px_180px] gap-3">
            <TextField
              label="Name"
              value={form.name}
              onChange={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="Open Play"
            />
            <TextField
              label="Price"
              value={form.price}
              onChange={(price) => setForm((current) => ({ ...current, price }))}
              placeholder="12.00"
              type="number"
            />
            <ColorPickerField
              label="Color"
              value={form.color}
              onChange={(color) => setForm((current) => ({ ...current, color }))}
            />
          </div>

          <div className="mt-3">
            <TextField
              label="Description"
              value={form.description}
              onChange={(description) =>
                setForm((current) => ({ ...current, description }))
              }
              placeholder="General open play admission"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <ActiveToggle
              checked={form.active}
              onChange={(active) => setForm((current) => ({ ...current, active }))}
            />
            <button
              onClick={saveAdmission}
              disabled={isSaving}
              className="rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Admission"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[10px] bg-white/70 p-6 text-center">
          <p className="font-semibold text-[#1E293B]">Loading admissions...</p>
        </div>
      ) : admissions.length > 0 ? (
        <div className="space-y-2">
          {admissions.map((admission) => (
            <div
              key={admission.id}
              className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-9 w-9 shrink-0 rounded-[9px] border border-black/10"
                  style={{ backgroundColor: admission.color || "#F6F0E6" }}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-[#1E293B]">{admission.name}</p>
                  <p className="mt-1 truncate text-xs text-[#6B7280]">
                    {admission.description || "No description"} •{" "}
                    {admission.active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#1E293B]">
                  {formatCurrency(admission.price)}
                </span>
                <button
                  onClick={() => startEditAdmission(admission)}
                  className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAdmission(admission.id)}
                  className="rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No admission services created yet."
          description="Create the first admission option, like Open Play, Toddler Time, or Homeschool Play."
        />
      )}
    </SettingsSection>
  );
}
