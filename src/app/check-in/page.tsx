"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const families = [
  {
    id: "gray-family",
    familyName: "Gray Family",
    primaryPhone: "843-555-0102",
    guardians: [
      { id: "nicole-gray", name: "Nicole Gray", role: "Primary Contact", phone: "843-555-0102" },
      { id: "david-gray", name: "David Gray", role: "Guardian", phone: "843-555-0101" },
    ],
    children: [
      {
        id: "dava-gray",
        name: "Dava Gray",
        age: 9,
        membership: "Monthly Unlimited",
        membershipStatus: "Active",
        waiverStatus: "Valid",
        allergies: "None listed",
        lastVisit: "Today",
        status: "ready",
      },
      {
        id: "emma-gray",
        name: "Emma Gray",
        age: 6,
        membership: "Day Pass",
        membershipStatus: "None",
        waiverStatus: "Missing",
        allergies: "Peanut allergy",
        lastVisit: "No recent visit",
        status: "needs-waiver",
      },
    ],
  },
  {
    id: "smith-family",
    familyName: "Smith Family",
    primaryPhone: "843-555-0198",
    guardians: [
      { id: "ashley-smith", name: "Ashley Smith", role: "Primary Contact", phone: "843-555-0198" },
    ],
    children: [
      {
        id: "taylan-smith",
        name: "Taylan Smith",
        age: 8,
        membership: "Summer Unlimited",
        membershipStatus: "Active",
        waiverStatus: "Valid",
        allergies: "None listed",
        lastVisit: "Yesterday",
        status: "ready",
      },
    ],
  },
];

const checkedInGuests = [
  { name: "Mason Taylor", family: "Taylor Family", time: "9:18 AM", status: "Open Play" },
  { name: "Ava Johnson", family: "Johnson Family", time: "9:42 AM", status: "Member" },
];

function getStatusStyles(status: string) {
  if (status === "ready") {
    return { badge: "bg-[#D7F1EC] text-[#155E75]", label: "Ready", border: "border-[#80DDD5]" };
  }

  if (status === "needs-waiver") {
    return { badge: "bg-[#FFE0E9] text-[#9F1239]", label: "Waiver Needed", border: "border-[#FF91AA]" };
  }

  return { badge: "bg-[#FFF0C4] text-[#92400E]", label: "Review", border: "border-[#FFD772]" };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export default function CheckInPage() {
  const [query, setQuery] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState(families[0].id);
  const [selectedPersonId, setSelectedPersonId] = useState(families[0].children[0].id);

  const filteredFamilies = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return families;
    }

    return families.filter((family) => {
      const guardianMatch = family.guardians.some((guardian) =>
        `${guardian.name} ${guardian.phone}`.toLowerCase().includes(cleanQuery)
      );

      const childMatch = family.children.some((child) =>
        child.name.toLowerCase().includes(cleanQuery)
      );

      return (
        family.familyName.toLowerCase().includes(cleanQuery) ||
        family.primaryPhone.includes(cleanQuery) ||
        guardianMatch ||
        childMatch
      );
    });
  }, [query]);

  const selectedFamily =
    families.find((family) => family.id === selectedFamilyId) ?? families[0];

  function selectFamily(familyId: string) {
    const family = families.find((item) => item.id === familyId);

    if (!family) {
      return;
    }

    setSelectedFamilyId(family.id);
    setSelectedPersonId(family.children[0]?.id ?? family.guardians[0]?.id ?? "");
  }

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
                <h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1>
                <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Party & Events", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
].map((item) => {
              const isActive = item.href === "/check-in";

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

        <section className="h-full flex-1 overflow-y-auto px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">Front Desk Operations</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Check-In
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                title="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-[#1E293B] shadow-sm transition hover:bg-[#FAFAFA]"
              >
                <span className="text-lg leading-none">🔔</span>
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD56B] text-md font-semibold text-[#1E293B]">
                  D
                </div>
                <span className="text-sm font-medium text-[#1E293B]">Devin</span>
              </div>
            </div>
          </header>

          <div className="grid h-[calc(100vh-150px)] grid-cols-[360px_1fr_310px] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-sm font-semibold text-[#1E293B]">Family Search</p>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-3 w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
                  placeholder="Search family, parent, child, phone..."
                />
              </div>

              <div className="h-full space-y-2 overflow-y-auto p-3 pb-24">
                {filteredFamilies.map((family) => (
                  <button
                    key={family.id}
                    onClick={() => selectFamily(family.id)}
                    className={`w-full rounded-[10px] border px-4 py-3 text-left transition ${
                      selectedFamily.id === family.id
                        ? "border-[#1E293B] bg-[#1E293B] text-white"
                        : "border-black/10 bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"
                    }`}
                  >
                    <p className="font-semibold">{family.familyName}</p>
                    <p className={`mt-1 text-xs ${selectedFamily.id === family.id ? "text-white/70" : "text-[#6B7280]"}`}>
                      {family.guardians[0]?.name} • {family.primaryPhone}
                    </p>
                    <p className={`mt-1 text-xs ${selectedFamily.id === family.id ? "text-white/70" : "text-[#6B7280]"}`}>
                      {family.children.length} child{family.children.length === 1 ? "" : "ren"} on file
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-sm font-semibold text-[#6B7280]">Selected Family</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                  {selectedFamily.familyName}
                </h2>
              </div>

              <div className="h-full overflow-y-auto p-4 pb-24">
                <div className="mb-4 rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Parents / Guardians
                    </h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1E293B]">
                      {selectedFamily.guardians.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedFamily.guardians.map((guardian) => {
                      const isSelected = selectedPersonId === guardian.id;

                      return (
                        <button
                          key={guardian.id}
                          onClick={() => setSelectedPersonId(guardian.id)}
                          className={`rounded-[10px] border p-4 text-left transition ${
                            isSelected ? "border-[#1E293B] bg-white" : "border-black/10 bg-white/70 hover:bg-white"
                          }`}
                        >
                          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1E293B] text-sm font-semibold text-white">
                            {getInitials(guardian.name)}
                          </div>
                          <p className="font-semibold text-[#1E293B]">{guardian.name}</p>
                          <p className="mt-1 text-xs text-[#6B7280]">{guardian.role}</p>
                          <p className="mt-2 text-xs text-[#6B7280]">{guardian.phone}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      Children
                    </h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1E293B]">
                      {selectedFamily.children.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedFamily.children.map((child) => {
                      const styles = getStatusStyles(child.status);
                      const isSelected = selectedPersonId === child.id;

                      return (
                        <button
                          key={child.id}
                          onClick={() => setSelectedPersonId(child.id)}
                          className={`rounded-[10px] border p-4 text-left transition ${
                            isSelected ? `${styles.border} bg-white` : "border-black/10 bg-white/70 hover:bg-white"
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E293B] text-sm font-semibold text-white">
                              {getInitials(child.name)}
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}>
                              {styles.label}
                            </span>
                          </div>

                          <p className="font-semibold text-[#1E293B]">{child.name}</p>
                          <p className="mt-1 text-xs text-[#6B7280]">Age {child.age} • {child.membership}</p>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <span className="rounded-[8px] bg-[#F6F0E6] px-2 py-2 text-[#1E293B]">
                              Waiver: {child.waiverStatus}
                            </span>
                            <span className="rounded-[8px] bg-[#F6F0E6] px-2 py-2 text-[#1E293B]">
                              Member: {child.membershipStatus}
                            </span>
                          </div>

                          {child.waiverStatus === "Valid" ? (
                            <div className="mt-4 rounded-[8px] bg-[#7BAE7F] px-4 py-3 text-center text-sm font-semibold text-white">
                              CHECK IN
                            </div>
                          ) : (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <span className="rounded-[8px] bg-[#1E293B] px-3 py-3 text-center text-xs font-semibold text-white">
                                SIGN WAIVER
                              </span>
                              <span className="rounded-[8px] bg-[#E5E7EB] px-3 py-3 text-center text-xs font-semibold text-[#6B7280]">
                                HOLD
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <aside className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <p className="text-sm font-semibold text-[#1E293B]">Currently Checked In</p>
              </div>

              <div className="space-y-2 p-3">
                {checkedInGuests.map((guest) => (
                  <div key={guest.name} className="rounded-[10px] bg-[#F6F0E6] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1E293B]">{guest.name}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">{guest.family}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium">{guest.time}</span>
                    </div>

                    <button className="mt-3 w-full rounded-[8px] border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#1E293B]">
                      Check Out
                    </button>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
