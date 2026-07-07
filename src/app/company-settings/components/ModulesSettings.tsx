"use client";

import { SettingsSection } from "./SettingsPrimitives";

const modules = [
  { key: "admissions", label: "Admissions", enabled: true },
  { key: "parties", label: "Parties", enabled: true },
  { key: "calendar", label: "Calendar", enabled: true },
  { key: "pos", label: "POS", enabled: true },
  { key: "memberships", label: "Memberships", enabled: false },
  { key: "retail", label: "Retail", enabled: false },
  { key: "cafe", label: "Café", enabled: false },
  { key: "camps", label: "Camps", enabled: false },
  { key: "classes", label: "Classes", enabled: false },
  { key: "field_trips", label: "Field Trips", enabled: false },
  { key: "rentals", label: "Rentals", enabled: false },
  { key: "reports", label: "Reports", enabled: false },
];

export default function ModulesSettings() {
  return (
    <SettingsSection
      title="Modules"
      description="Choose which parts of PlayFlow this business uses. Database persistence comes after the TenantModule schema is added."
    >
      <div className="grid grid-cols-3 gap-3">
        {modules.map((module) => (
          <div key={module.key} className="rounded-[10px] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[#1E293B]">{module.label}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${module.enabled ? "bg-[#E9F8EC] text-[#245B35]" : "bg-[#F6F0E6] text-[#6B7280]"}`}>
                {module.enabled ? "Enabled" : "Off"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
