"use client";

import { useEffect, useState } from "react";
import {
  ActiveToggle,
  EmptyState,
  Message,
  SettingsSection,
  TextField,
  formatCurrency,
} from "./SettingsPrimitives";

type EventPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  depositAmount: number;
  guestLimit: number | null;
  durationMinutes: number | null;
  active: boolean;
};

type PackageFormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  depositAmount: string;
  guestLimit: string;
  durationMinutes: string;
  active: boolean;
};

const emptyPackageForm: PackageFormState = {
  id: "",
  name: "",
  description: "",
  price: "",
  depositAmount: "",
  guestLimit: "",
  durationMinutes: "",
  active: true,
};

export default function PackagesSettings() {
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [form, setForm] = useState<PackageFormState>(emptyPackageForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPackages() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/packages");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load packages.");
      }

      setPackages(data.packages ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load packages.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  function startNewPackage() {
    setForm(emptyPackageForm);
    setIsFormOpen(true);
    setMessage("");
  }

  function startEditPackage(packageItem: EventPackage) {
    setForm({
      id: packageItem.id,
      name: packageItem.name,
      description: packageItem.description ?? "",
      price: String(packageItem.price ?? ""),
      depositAmount: String(packageItem.depositAmount ?? ""),
      guestLimit: packageItem.guestLimit === null ? "" : String(packageItem.guestLimit),
      durationMinutes:
        packageItem.durationMinutes === null ? "" : String(packageItem.durationMinutes),
      active: packageItem.active,
    });
    setIsFormOpen(true);
    setMessage("");
  }

  async function savePackage() {
    const name = form.name.trim();

    if (!name) {
      setMessage("Package name is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/packages", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          name,
          description: form.description.trim(),
          price: form.price || "0",
          depositAmount: form.depositAmount || "0",
          guestLimit: form.guestLimit || null,
          durationMinutes: form.durationMinutes || null,
          active: form.active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save package.");
      }

      setForm(emptyPackageForm);
      setIsFormOpen(false);
      setMessage(form.id ? "Package updated." : "Package created.");
      await loadPackages();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save package.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePackage(packageId: string) {
    setMessage("");

    try {
      const response = await fetch(`/api/packages?id=${packageId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete package.");
      }

      setMessage("Package deleted.");
      await loadPackages();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete package.");
    }
  }

  return (
    <SettingsSection
      title="Packages"
      description="Create party, event, field trip, rental, or custom packages with pricing and limits."
      action={
        <button
          onClick={startNewPackage}
          className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white"
        >
          + New Package
        </button>
      }
    >
      <Message message={message} />

      {isFormOpen && (
        <div className="mb-4 rounded-[10px] border border-black/10 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#1E293B]">
                {form.id ? "Edit Package" : "Create Package"}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                Packages become available later in Party & Events.
              </p>
            </div>
            <button
              onClick={() => {
                setIsFormOpen(false);
                setForm(emptyPackageForm);
              }}
              className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-[1fr_150px_150px] gap-3">
            <TextField
              label="Name"
              value={form.name}
              onChange={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="Basic Birthday Party"
            />
            <TextField
              label="Price"
              value={form.price}
              onChange={(price) => setForm((current) => ({ ...current, price }))}
              placeholder="249.00"
              type="number"
            />
            <TextField
              label="Deposit"
              value={form.depositAmount}
              onChange={(depositAmount) =>
                setForm((current) => ({ ...current, depositAmount }))
              }
              placeholder="100.00"
              type="number"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <TextField
              label="Guest Limit"
              value={form.guestLimit}
              onChange={(guestLimit) => setForm((current) => ({ ...current, guestLimit }))}
              placeholder="20"
              type="number"
            />
            <TextField
              label="Duration"
              value={form.durationMinutes}
              onChange={(durationMinutes) =>
                setForm((current) => ({ ...current, durationMinutes }))
              }
              placeholder="120 min"
              type="number"
            />
          </div>

          <div className="mt-3">
            <TextField
              label="Description"
              value={form.description}
              onChange={(description) =>
                setForm((current) => ({ ...current, description }))
              }
              placeholder="Includes private room, open play, and setup time"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <ActiveToggle
              checked={form.active}
              onChange={(active) => setForm((current) => ({ ...current, active }))}
            />
            <button
              onClick={savePackage}
              disabled={isSaving}
              className="rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Package"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-[10px] bg-white/70 p-6 text-center">
          <p className="font-semibold text-[#1E293B]">Loading packages...</p>
        </div>
      ) : packages.length > 0 ? (
        <div className="space-y-2">
          {packages.map((packageItem) => (
            <div
              key={packageItem.id}
              className="flex items-center justify-between gap-4 rounded-[10px] bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#1E293B]">{packageItem.name}</p>
                <p className="mt-1 truncate text-xs text-[#6B7280]">
                  {packageItem.description || "No description"} •{" "}
                  {packageItem.active ? "Active" : "Inactive"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#1E293B]">
                  {formatCurrency(packageItem.price)}
                </span>
                <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#6B7280]">
                  {packageItem.durationMinutes
                    ? `${packageItem.durationMinutes} min`
                    : "No duration"}
                </span>
                <button
                  onClick={() => startEditPackage(packageItem)}
                  className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => deletePackage(packageItem.id)}
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
          title="No packages created yet."
          description="Create the first package, like Basic Party, Premium Party, Field Trip, or Private Rental."
        />
      )}
    </SettingsSection>
  );
}
