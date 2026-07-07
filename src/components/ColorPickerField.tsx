"use client";

import { useEffect, useRef, useState } from "react";

type ColorOption = {
  label: string;
  value: string;
};

type ColorPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  brandColors?: ColorOption[];
  recentColors?: ColorOption[];
};

type PopoverPosition = {
  top: number;
  left: number;
};

const defaultBrandColors: ColorOption[] = [
  { label: "Primary", value: "#1E293B" },
  { label: "Accent", value: "#20B8A8" },
  { label: "Gold", value: "#FFD56B" },
];

const defaultRecentColors: ColorOption[] = [
  { label: "Teal", value: "#20B8A8" },
  { label: "Green", value: "#7BAE7F" },
  { label: "Pink", value: "#FF91AA" },
  { label: "Purple", value: "#B99AFF" },
];

const colorGrid = [
  "#111827", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#F3F4F6",
  "#7F1D1D", "#B91C1C", "#EF4444", "#F97316", "#F59E0B", "#FACC15",
  "#14532D", "#15803D", "#22C55E", "#84CC16", "#A3E635", "#D9F99D",
  "#164E63", "#0891B2", "#06B6D4", "#38BDF8", "#7DD3FC", "#BAE6FD",
  "#1E3A8A", "#2563EB", "#3B82F6", "#6366F1", "#818CF8", "#C7D2FE",
  "#581C87", "#7E22CE", "#A855F7", "#C084FC", "#D8B4FE", "#E9D5FF",
  "#831843", "#BE185D", "#EC4899", "#FB7185", "#FDA4AF", "#FFE4E6",
];

function normalizeHex(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "#000000";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function SwatchButton({
  label,
  value,
  onSelect,
}: {
  label?: string;
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="flex flex-col items-center gap-1 rounded-[7px] px-1.5 py-1.5 transition hover:bg-[#F6F0E6]"
      title={label ? `${label}: ${value}` : value}
    >
      <span
        className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
        style={{ backgroundColor: value }}
      />
      {label && (
        <span className="max-w-[48px] truncate text-[9px] font-semibold text-[#6B7280]">
          {label}
        </span>
      )}
    </button>
  );
}

export default function ColorPickerField({
  label,
  value,
  onChange,
  brandColors = defaultBrandColors,
  recentColors = defaultRecentColors,
}: ColorPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
  });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const swatchButtonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const safeValue = isValidHex(normalizeHex(value || "#20B8A8"))
    ? normalizeHex(value || "#20B8A8")
    : "#20B8A8";

  function updatePopoverPosition() {
    const button = swatchButtonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const popoverWidth = 270;
    const popoverHeight = 440;
    const gap = 10;

    let left = rect.left;
    let top = rect.bottom + gap;

    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    if (top + popoverHeight > window.innerHeight - 12) {
      top = rect.top - popoverHeight - gap;
    }

    if (top < 12) {
      top = 12;
    }

    if (left < 12) {
      left = 12;
    }

    setPopoverPosition({ top, left });
  }

  useEffect(() => {
    if (isOpen) {
      updatePopoverPosition();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleWindowChange() {
      if (isOpen) {
        updatePopoverPosition();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen]);

  function updateColor(nextColor: string) {
    onChange(normalizeHex(nextColor));
  }

  return (
    <div ref={wrapperRef} className="relative">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
        {label}
      </span>

      <div className="mt-2 grid grid-cols-[56px_1fr] gap-2">
        <button
          ref={swatchButtonRef}
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-[46px] items-center justify-center rounded-[10px] border border-black/10 bg-white shadow-sm transition hover:bg-[#F6F0E6]"
          aria-label={`Open ${label} color picker`}
        >
          <span
            className="h-7 w-7 rounded-[8px] border border-black/10"
            style={{ backgroundColor: safeValue }}
          />
        </button>

        <input
          value={value}
          onChange={(event) => updateColor(event.target.value)}
          className="w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
          placeholder="#20B8A8"
        />
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-[9999] w-[270px] rounded-[14px] border border-black/10 bg-white p-3 shadow-2xl"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
          }}
        >
          <div className="grid grid-cols-6 gap-1.5">
            {colorGrid.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateColor(color)}
                className={`h-8 rounded-[7px] border transition hover:scale-105 ${
                  safeValue.toLowerCase() === color.toLowerCase()
                    ? "border-[#1E293B] ring-2 ring-[#1E293B]/20"
                    : "border-black/10"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select ${color}`}
              />
            ))}
          </div>

          <div className="mt-3">
            <input
              value={value}
              onChange={(event) => updateColor(event.target.value)}
              className="w-full rounded-[9px] border border-black/10 bg-[#F6F0E6] px-3 py-2.5 text-sm font-semibold outline-none"
              placeholder="#20B8A8"
            />
          </div>

          {brandColors.length > 0 && (
            <div className="mt-3 border-t border-black/10 pt-3">
              <p className="mb-1.5 text-[11px] font-semibold text-[#1E293B]">
                Brand Colors
              </p>
              <div className="flex flex-wrap gap-1.5">
                {brandColors.map((option) => (
                  <SwatchButton
                    key={`${option.label}-${option.value}`}
                    label={option.label}
                    value={option.value}
                    onSelect={updateColor}
                  />
                ))}
              </div>
            </div>
          )}

          {recentColors.length > 0 && (
            <div className="mt-3 border-t border-black/10 pt-3">
              <p className="mb-1.5 text-[11px] font-semibold text-[#1E293B]">
                Recent Colors
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((option) => (
                  <SwatchButton
                    key={`${option.label}-${option.value}`}
                    label={option.label}
                    value={option.value}
                    onSelect={updateColor}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
              <input
                type="color"
                value={safeValue}
                onChange={(event) => updateColor(event.target.value)}
                className="h-7 w-7 cursor-pointer rounded border border-black/10 bg-transparent"
              />
              More colors
            </label>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-[8px] bg-[#1E293B] px-3 py-2 text-xs font-semibold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
