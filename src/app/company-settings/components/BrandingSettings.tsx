"use client";

import { useEffect, useRef, useState } from "react";
import ColorPickerField from "@/components/ColorPickerField";
import { Message, SettingsSection } from "./SettingsPrimitives";

type BrandingForm = {
  logoUrl: string;
  iconLogoUrl: string;
  primaryColor: string;
  accentColor: string;
  tertiaryColor: string;
};

const emptyBranding: BrandingForm = {
  logoUrl: "",
  iconLogoUrl: "",
  primaryColor: "#1E293B",
  accentColor: "#20B8A8",
  tertiaryColor: "#FFD56B",
};

type LogoUploadCardProps = {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
};

function LogoUploadCard({
  title,
  description,
  value,
  onChange,
  compact = false,
}: LogoUploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  function handleFile(file: File | undefined) {
    setError("");

    if (!file) {
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PNG, JPG, SVG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Please keep logo files under 2MB for now.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-[12px] border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1E293B]">{title}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{description}</p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-[8px] bg-[#FFE0E9] px-3 py-2 text-xs font-semibold text-[#9F1239]"
          >
            Remove
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        className={`flex w-full flex-col items-center justify-center rounded-[12px] border border-dashed px-4 text-center transition ${
          compact ? "min-h-[154px]" : "min-h-[210px]"
        } ${dragActive ? "border-[#20B8A8] bg-[#E9FBF8]" : "border-black/20 bg-[#F6F0E6] hover:bg-[#EFE8DC]"}`}
      >
        {value ? (
          <div className="flex w-full flex-col items-center gap-3">
            <div className={`flex items-center justify-center rounded-[12px] border border-black/10 bg-white p-4 ${compact ? "h-20 w-20" : "h-28 w-full"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt={`${title} preview`} className="max-h-full max-w-full object-contain" />
            </div>
            <span className="text-xs font-semibold text-[#1E293B]">Click to replace</span>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-white text-xl shadow-sm">
              ↑
            </div>
            <p className="text-sm font-semibold text-[#1E293B]">Drag & drop logo here</p>
            <p className="mt-1 text-xs text-[#6B7280]">or click to browse</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              SVG • PNG • JPG • WebP
            </p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={(event) => handleFile(event.target.files?.[0])}
        className="hidden"
      />

      {error && <p className="mt-2 text-xs font-semibold text-[#9F1239]">{error}</p>}

      <div className="mt-3 flex items-center justify-between rounded-[10px] bg-[#F6F0E6] px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-[#1E293B]">Remove background</p>
          <p className="mt-0.5 text-[11px] text-[#6B7280]">AI cleanup option planned for later.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#6B7280]">
          Coming Soon
        </span>
      </div>
    </div>
  );
}

function ThemePreview({ form }: { form: BrandingForm }) {
  return (
    <div className="rounded-[12px] border border-black/10 bg-white p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#1E293B]">Theme Preview</p>
        <p className="mt-1 text-xs text-[#6B7280]">A quick look at how the selected colors work together.</p>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-black/10 bg-[#F6F0E6]">
        <div className="px-4 py-4 text-white" style={{ backgroundColor: form.primaryColor || "#1E293B" }}>
          <p className="text-sm font-semibold">PlayFlow Preview</p>
          <p className="mt-1 text-xs opacity-80">Header using primary color</p>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-[9px] px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: form.accentColor || "#20B8A8" }}
            >
              Main Action
            </button>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-[#1E293B]"
              style={{ backgroundColor: form.tertiaryColor || "#FFD56B" }}
            >
              Badge
            </span>
          </div>

          <div className="rounded-[10px] border border-black/10 bg-white p-4">
            <p className="text-sm font-semibold text-[#1E293B]">Sample Card</p>
            <p className="mt-1 text-xs text-[#6B7280]">Cards stay clean while brand colors highlight important actions.</p>
            <div className="mt-3 h-2 w-28 rounded-full" style={{ backgroundColor: form.tertiaryColor || "#FFD56B" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandingSettings() {
  const [form, setForm] = useState<BrandingForm>(emptyBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadBranding() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/branding");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load branding.");
      }

      if (data.branding) {
        setForm({ ...emptyBranding, ...data.branding });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load branding.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBranding();
  }, []);

  async function saveBranding() {
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save branding.");
      }

      setForm({ ...emptyBranding, ...data.branding });
      setMessage("Branding saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save branding.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="Branding & Theme"
      description="Upload logos and choose the colors that make PlayFlow feel like this business."
      action={
        <button
          onClick={saveBranding}
          disabled={isSaving || isLoading}
          className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Branding"}
        </button>
      }
    >
      <Message message={message} />

      {isLoading ? (
        <div className="rounded-[10px] bg-white/70 p-6 text-center">
          <p className="font-semibold text-[#1E293B]">Loading branding...</p>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4">
            <LogoUploadCard
              title="Business Logo"
              description="Used on reports, login screens, customer-facing pages, and printed materials."
              value={form.logoUrl}
              onChange={(logoUrl) => setForm((current) => ({ ...current, logoUrl }))}
            />

            <LogoUploadCard
              title="App / Icon Logo"
              description="Used for sidebar icons, mobile views, favicons, and future app icons."
              value={form.iconLogoUrl}
              onChange={(iconLogoUrl) => setForm((current) => ({ ...current, iconLogoUrl }))}
              compact
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[12px] border border-black/10 bg-white p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-[#1E293B]">Theme Colors</p>
                <p className="mt-1 text-xs text-[#6B7280]">Pick a primary color, an accent color, and a tertiary highlight color.</p>
              </div>

              <div className="space-y-4">
                <ColorPickerField
                  label="Primary Color"
                  value={form.primaryColor}
                  onChange={(primaryColor) => setForm((current) => ({ ...current, primaryColor }))}
                />
                <ColorPickerField
                  label="Accent Color"
                  value={form.accentColor}
                  onChange={(accentColor) => setForm((current) => ({ ...current, accentColor }))}
                />
                <ColorPickerField
                  label="Tertiary Color"
                  value={form.tertiaryColor}
                  onChange={(tertiaryColor) => setForm((current) => ({ ...current, tertiaryColor }))}
                />
              </div>
            </div>

            <ThemePreview form={form} />
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
