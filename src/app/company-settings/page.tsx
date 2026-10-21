"use client";
import {BusinessName} from "@/components/StaffIdentity";

import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import { useEffect, useState } from "react";
import AddOnsSettings from "./components/AddOnsSettings";
import AdmissionsSettings from "./components/AdmissionsSettings";
import BrandingSettings from "./components/BrandingSettings";
import BusinessProfileSettings from "./components/BusinessProfileSettings";
import PaymentProvidersSettings from "./components/PaymentProvidersSettings";
import CommerceSettings from "./components/CommerceSettings";
import EventTypesSettings from "./components/EventTypesSettings";
import MembershipsSettings from "./components/MembershipsSettings";
import POSSettings from "./components/POSSettings";
import GettingStarted from "@/components/workspaces/GettingStarted";
import ModulesSettings from "./components/ModulesSettings";
import PackagesSettings from "./components/PackagesSettings";
import StaffRolesSettings from "./components/StaffRolesSettings";
import BookingScheduleSettings from "./components/BookingScheduleSettings";
import StaffAccessSettings from "./components/StaffAccessSettings";
import WaiverSettings from "./components/WaiverSettings";

const settingsTabs = [
  "Getting Started",
  "Modules",
  "Business Profile",
  "Branding",
  "Admissions",
  "Memberships",
  "Party & Event Types",
  "Packages",
  "Booking Schedule",
  "Add-Ons",
  "Waivers",
  "POS & Products",
  "Commerce",
  "Payment Providers",
  "Staff Roles",
  "Staff Access",
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

function renderSettingsSection(activeTab: string,onSelect:(tab:string)=>void) {
  switch (activeTab) {
    case "Getting Started":
      return <GettingStarted onSelect={onSelect}/>;
    case "Modules":
      return <ModulesSettings onSelect={onSelect}/>;
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
    case "Booking Schedule":
      return <BookingScheduleSettings />;
    case "Packages":
      return <PackagesSettings />;
    case "Add-Ons":
      return <AddOnsSettings />;
    case "Waivers":
      return <WaiverSettings />;
    case "POS & Products":
      return <POSSettings onCommerce={()=>onSelect("Commerce")}/>;
    case "Commerce":
      return <CommerceSettings onProviders={()=>onSelect("Payment Providers")}/>;
    case "Payment Providers":
      return <PaymentProvidersSettings/>;
    case "Staff Roles":
      return <StaffRolesSettings />;
    case "Staff Access":
      return <StaffAccessSettings />;
    default:
      return <BusinessProfileSettings />;
  }
}

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState("Modules");

  useEffect(()=>{const section=new URLSearchParams(window.location.search).get("section");if(section&&settingsTabs.includes(section))Promise.resolve(section).then(setActiveTab);},[]);

  return (
    <main className="h-dvh overflow-hidden bg-[#E7E3DA] p-2 sm:p-5 text-[#202633] antialiased">
      <div className="flex h-full min-h-0 overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative hidden lg:block h-full min-h-0 w-[235px] shrink-0 overflow-y-auto border-r border-black/10 bg-[#F2EFE8] px-6 py-7 pb-24">
          <div className="mb-9">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">
                PF
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.03em]">
                  PlayFlow
                </h1>
                <p className="text-xs text-[#6B7280]"><BusinessName/></p>
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
            <SignOutButton />
          </div>
        </aside>

        <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 py-4 sm:px-6 sm:py-6">
          <header className="mb-5 flex shrink-0 items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">
                Admin Configuration
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Company Settings
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={()=>setActiveTab("Modules")} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">
                Review modules
              </button>
            </div>
          </header>

          <label className="mb-3 block shrink-0 text-sm font-semibold md:hidden">Settings section<select value={activeTab} onChange={e=>setActiveTab(e.target.value)} className="mt-2 block w-full rounded-lg border bg-white p-3">{settingsTabs.map(tab=><option key={tab} value={tab}>{tab}</option>)}</select></label>
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)] gap-3">
            <aside className="hidden md:flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-sm font-semibold text-[#1E293B]">
                  Settings Sections
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Customize how this business operates.
                </p>
              </div>

              <div className="min-h-0 space-y-1 overflow-y-auto p-3 pb-10">
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

            <section className="flex min-h-0 flex-col overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/10 p-5">
                <div>
                  <p className="text-sm font-semibold text-[#6B7280]">
                    Current Section
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                    {activeTab}
                  </h2>
                </div>

                <span className="rounded-full bg-[#F6F0E6] px-3 py-1 text-xs font-semibold text-[#1E293B]">
                  Settings
                </span>
              </div>

              <div className="public-scroll min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 pb-12">
                {renderSettingsSection(activeTab,setActiveTab)}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
