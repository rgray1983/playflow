"use client";

import { SettingsSection } from "./SettingsPrimitives";

export default function POSSettings() {
  return (
    <SettingsSection
      title="POS Settings"
      description="Configure checkout behavior, taxes, receipts, gift cards, and payment methods."
    >
      <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6">
        <p className="font-semibold text-[#1E293B]">POS settings model comes next</p>
        <p className="mt-2 text-sm text-[#6B7280]">
          Current schema does not yet have POSSettings. Add that model before making these settings persistent.
        </p>
      </div>
    </SettingsSection>
  );
}
