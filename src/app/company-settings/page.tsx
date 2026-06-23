"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const settingsTabs = [
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

const configurableSections = [
  {
    title: "Admissions",
    description: "Create open play, toddler time, homeschool play, and other admission types.",
    emptyText: "No admission services created yet.",
    buttonText: "+ New Admission",
  },
  {
    title: "Memberships",
    description: "Create monthly, seasonal, annual, or custom membership plans.",
    emptyText: "No membership plans created yet.",
    buttonText: "+ New Membership",
  },
  {
    title: "Party & Event Types",
    description: "Create birthday parties, field trips, private events, classes, rentals, or custom event types.",
    emptyText: "No event types created yet.",
    buttonText: "+ New Event Type",
  },
  {
    title: "Packages",
    description: "Create package options with pricing, duration, deposit, guest limits, and included services.",
    emptyText: "No packages created yet.",
    buttonText: "+ New Package",
  },
  {
    title: "Add-Ons",
    description: "Create balloon arches, extra time, food, retail extras, services, or anything else a business sells.",
    emptyText: "No add-ons created yet.",
    buttonText: "+ New Add-On",
  },
];

const sampleRoles = [
  { role: "Owner", description: "Full system access" },
  { role: "Manager", description: "Manage operations, events, staff, and reports" },
  { role: "Front Desk", description: "Check-in, POS, waivers, and guest support" },
  { role: "Party Host", description: "Party check-in and event support" },
];

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}

function EmptyConfigCard({
  title,
  description,
  emptyText,
  buttonText,
}: {
  title: string;
  description: string;
  emptyText: string;
  buttonText: string;
}) {
  return (
    <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
        </div>

        <button className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
          {buttonText}
        </button>
      </div>

      <div className="rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6 text-center">
        <p className="font-semibold text-[#1E293B]">{emptyText}</p>
        <p className="mt-2 text-sm text-[#6B7280]">
          New businesses start blank and create their own services, prices, packages, and add-ons.
        </p>
      </div>
    </section>
  );
}

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState("Business Profile");

  const activeConfig = useMemo(() => {
    return configurableSections.find((section) => section.title === activeTab);
  }, [activeTab]);

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
              <button className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
                Save Changes
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
                  Customizable
                </span>
              </div>

              <div className="h-full overflow-y-auto p-5 pb-24">
                {activeTab === "Business Profile" && (
                  <div className="space-y-4">
                    <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                        Business Information
                      </h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        This information identifies the business throughout PlayFlow.
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <Field label="Business Name" placeholder="Palmetto Playhouse" />
                        <Field label="Business Type" placeholder="Indoor Play Center" />
                        <Field label="Phone" placeholder="843-555-0000" />
                        <Field label="Email" placeholder="hello@business.com" />
                        <Field label="Website" placeholder="https://example.com" />
                        <Field label="Timezone" placeholder="America/New_York" />
                      </div>

                      <div className="mt-4">
                        <Field label="Address" placeholder="Street, city, state, ZIP" />
                      </div>
                    </section>

                    <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                        First-Time Setup
                      </h3>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        New businesses begin with no default packages, add-ons, admissions, or memberships. Their setup should be guided, personal, and completely customizable.
                      </p>
                    </section>
                  </div>
                )}

                {activeTab === "Branding" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                      Brand Controls
                    </h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Each business can make PlayFlow feel like their own system.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <Field label="Primary Color" placeholder="#1E293B" />
                      <Field label="Accent Color" placeholder="#20B8A8" />
                      <Field label="Logo Upload" placeholder="Upload logo later" />
                      <Field label="Display Name" placeholder="Business display name" />
                    </div>
                  </section>
                )}

                {activeConfig && <EmptyConfigCard {...activeConfig} />}

                {activeTab === "Waivers" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                      Waiver Settings
                    </h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Waivers act as the intake source of truth for families, parents, children, and future parent portal accounts.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <Field label="Waiver Expiration" placeholder="12 months" />
                      <Field label="Signature Requirement" placeholder="Parent / Guardian" />
                      <Field label="Parent Account Creation" placeholder="Auto-create from waiver email" />
                      <Field label="Child Creation" placeholder="Auto-create children from waiver" />
                    </div>

                    <div className="mt-4 rounded-[10px] border border-dashed border-black/20 bg-white/70 p-6">
                      <p className="font-semibold text-[#1E293B]">
                        Waiver template editor coming later
                      </p>
                      <p className="mt-2 text-sm text-[#6B7280]">
                        The waiver form will feed the Family, Parent, Child, Waiver, and Party Guest records.
                      </p>
                    </div>
                  </section>
                )}

                {activeTab === "POS Settings" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                      Checkout Settings
                    </h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      Configure payments, taxes, gift cards, and checkout behavior.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <Field label="Sales Tax Rate" placeholder="0%" />
                      <Field label="Tax Behavior" placeholder="Tax services / retail separately" />
                      <Field label="Payment Methods" placeholder="Cash, Card, Split" />
                      <Field label="Gift Cards" placeholder="Enabled / Disabled" />
                    </div>
                  </section>
                )}

                {activeTab === "Staff Roles" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#1E293B]">
                          Roles & Permissions
                        </h3>
                        <p className="mt-1 text-sm text-[#6B7280]">
                          Role permissions will control what each staff member can see or change.
                        </p>
                      </div>

                      <button className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
                        + New Role
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sampleRoles.map((role) => (
                        <div
                          key={role.role}
                          className="flex items-center justify-between rounded-[10px] bg-white px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-[#1E293B]">{role.role}</p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              {role.description}
                            </p>
                          </div>

                          <button className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">
                            Configure
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
