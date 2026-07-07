"use client";

import Link from "next/link";
import { useState } from "react";
import AddOnsSettings from "./components/AddOnsSettings";
import AdmissionsSettings from "./components/AdmissionsSettings";
import BrandingSettings from "./components/BrandingSettings";
import BusinessProfileSettings from "./components/BusinessProfileSettings";
import EventTypesSettings from "./components/EventTypesSettings";
import MembershipsSettings from "./components/MembershipsSettings";
import ModulesSettings from "./components/ModulesSettings";
import PackagesSettings from "./components/PackagesSettings";
import POSSettings from "./components/POSSettings";
import StaffRolesSettings from "./components/StaffRolesSettings";
import WaiverSettings from "./components/WaiverSettings";

const settingsTabs = [
  "Modules",
  "Business Profile",
  "Branding",
  "Admissions",
  "Memberships",
  "Party & Event Types",
  "Packages",
  "Add-Ons",
  "Waivers",
  "POS Settings",
  "Staff Roles",
];

const navItems = [
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Party & Events", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
];

function renderSettingsSection(activeTab: string) {
  switch (activeTab) {
    case "Modules":
      return <ModulesSettings />;
    case "Business Profile":
      return <BusinessProfileSettings />;
    case "Branding":
      return <BrandingSettings />;
    case "Admissions":
      return <AdmissionsSettings />;
    case "Memberships":
      return <MembershipsSettings />;
    case "Party & Event Types":
      return <EventTypesSettings />;
    case "Packages":
      return <PackagesSettings />;
    case "Add-Ons":
      return <AddOnsSettings />;
    case "Waivers":
      return <WaiverSettings />;
    case "POS Settings":
      return <POSSettings />;
    case "Staff Roles":
      return <StaffRolesSettings />;
    default:
      return <BusinessProfileSettings />;
  }
}

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState("Modules");

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">
                PF
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.03em]">
                  PlayFlow
                </h1>
                <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/company-settings";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-7 left-6 right-6">
            <button className="flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-sm font-medium text-[#5B6270] hover:bg-white/70 hover:text-[#111827]">
              <span>↪</span>
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        <section className="h-full flex-1 overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">
                Admin Configuration
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Company Settings
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">
                Preview Setup
              </button>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[280px_1fr] gap-3">
            <aside className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-sm font-semibold text-[#1E293B]">
                  Settings Sections
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Customize how this business operates.
                </p>
              </div>

              <div className="space-y-1 p-3">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTab === tab
                        ? "bg-[#1E293B] text-white"
                        : "text-[#5B6270] hover:bg-[#F6F0E6] hover:text-[#111827]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </aside>

            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
                <div>
                  <p className="text-sm font-semibold text-[#6B7280]">
                    Current Section
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                    {activeTab}
                  </h2>
                </div>

                <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">
                  Configurable
                </span>
              </div>

              <div className="h-full overflow-y-auto p-5 pb-24">
                {renderSettingsSection(activeTab)}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
