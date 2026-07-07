"use client";

import { SettingsSection } from "./SettingsPrimitives";

export default function WaiverSettings() {
  return (
    <SettingsSection
      title="Waivers"
      description="Waivers are the intake source of truth for families, parents, children, and future parent portal accounts."
    >
      <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6">
        <p className="font-semibold text-[#1E293B]">Waiver settings model comes next</p>
        <p className="mt-2 text-sm text-[#6B7280]">
          Current schema supports waiver records. Global waiver configuration should be added as WaiverSettings or Tenant fields before persistence.
        </p>
      </div>
    </SettingsSection>
  );
}
