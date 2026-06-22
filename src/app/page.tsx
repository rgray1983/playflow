"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Party & Events", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
];

const statCards = [
  {
    label: "Active Guests",
    value: "18",
    note: "Currently checked in",
    color: "from-[#80DDD5] to-[#63BDEB]",
    textColor: "text-[#155E75]",
  },
  {
    label: "Today’s Revenue",
    value: "$842",
    note: "Open play + parties",
    color: "from-[#FFD772] to-[#FFB768]",
    textColor: "text-[#92400E]",
  },
  {
    label: "Parties Today",
    value: "2",
    note: "1 confirmed, 1 pending",
    color: "from-[#FF91AA] to-[#F96F8F]",
    textColor: "text-[#9F1239]",
  },
  {
    label: "Waiver Alerts",
    value: "7",
    note: "Missing or expiring soon",
    color: "from-[#B99AFF] to-[#8668F2]",
    textColor: "text-[#5B21B6]",
  },
];

const dashboardSuggestions = [
  { icon: "✓", label: "Check-In", description: "Open the front desk check-in workflow" },
  { icon: "🎂", label: "Parties", description: "View parties, balances, guests, and add-ons" },
  { icon: "📋", label: "Waiver Settings", description: "Manage waiver templates and waiver rules" },
  { icon: "🏢", label: "Company Settings", description: "Manage families, children, memberships, and data" },
  { icon: "⚙", label: "System Customization", description: "Colors, logos, dashboard modules, and behavior" },
  { icon: "📊", label: "Reports", description: "View visits, revenue, memberships, and trends" },
];

const schedule = [
  { time: "10:00 AM", title: "Open Play", status: "Active" },
  { time: "12:00 PM", title: "Dava Gray Birthday Party", status: "Confirmed" },
  { time: "3:30 PM", title: "Private Event", status: "Pending" },
];

const activeGuests = [
  { name: "Dava Gray", time: "9:03 AM", status: "Member" },
  { name: "Taylan Smith", time: "9:18 AM", status: "Waiver Valid" },
  { name: "Emma Gray", time: "9:32 AM", status: "Open Play" },
];

const activity = [
  "Dava Gray checked in",
  "Nicole Gray signed a waiver",
  "Birthday party balance updated",
  "Monthly membership payment received",
];

const quickActions = [
  { label: "Start Check-In", icon: "✓" },
  { label: "New Party", icon: "★" },
  { label: "Add Waiver", icon: "📋" },
  { label: "New Membership", icon: "+" },
];

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getFormattedDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function Home() {
  const [greeting, setGreeting] = useState("Good Morning");
  const [today, setToday] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = dashboardSuggestions.filter((item) => {
    const query = dashboardSearch.trim().toLowerCase();
    if (!query) return true;

    return (
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setGreeting(getGreeting());
    setToday(getFormattedDate());
  }, []);

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
            {navItems.map((item, index) => {
              const isActive = item.href === "/";

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
          <header className="mb-5 grid grid-cols-[1fr_480px_auto] items-start gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">
                {today || "Tuesday, June 16"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                {greeting}, Devin 👋
              </h1>
            </div>

            <div className="relative">
              <div className="flex rounded-[10px] border border-black/10 bg-white shadow-sm">
                <input
                  value={dashboardSearch}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(event) => {
                    setDashboardSearch(event.target.value);
                    setShowSuggestions(true);
                  }}
                  className="min-w-0 flex-1 rounded-[10px] bg-transparent px-4 py-3 text-sm outline-none"
                  placeholder="Search pages, settings, reports..."
                />
              </div>

              {showSuggestions && (
                <div className="absolute left-0 right-0 top-[48px] z-30 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-lg">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.slice(0, 6).map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setDashboardSearch(item.label);
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F6F0E6]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F6F0E6] text-sm">
                          {item.icon}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#1E293B]">
                            {item.label}
                          </span>
                          <span className="block text-xs text-[#6B7280]">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-[#6B7280]">
                      No dashboard matches.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                title="System Settings"
                className="flex h-10 w-10 items-center justify-center rounded-[10px] text-lg text-[#1E293B] transition hover:bg-white"
              >
                ⚙
              </button>

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

          <div className="mb-5 grid grid-cols-4 gap-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-[12px] bg-gradient-to-br ${card.color} p-4 shadow-sm`}
              >
                <div className={card.textColor}>
                  <p className="text-sm font-medium opacity-90">{card.label}</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    {card.value}
                  </h3>
                  <p className="mt-1 text-sm font-normal opacity-75">{card.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                Dashboard Modules
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                These blocks will eventually be drag-and-drop per user.
              </p>
            </div>

            <button className="rounded-[10px] bg-white px-4 py-3 text-sm font-semibold text-[#1E293B] shadow-sm">
              Customize Layout
            </button>
          </div>

          <div className="grid grid-cols-[1.2fr_.8fr] gap-3 pb-8">
            <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Active Guests</h3>
                <Link href="/check-in" className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-xs font-medium">
                  Open Check-In
                </Link>
              </div>

              <div className="space-y-2">
                {activeGuests.map((guest) => (
                  <div
                    key={guest.name}
                    className="flex items-center justify-between rounded-[8px] bg-[#F6F0E6] px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-[#1E293B]">{guest.name}</p>
                      <p className="text-xs text-[#6B7280]">Checked in at {guest.time}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1E293B]">
                      {guest.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Quick Actions</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="rounded-[10px] border border-black/10 bg-white px-4 py-4 text-left transition hover:bg-[#F6F0E6]"
                  >
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F6F0E6] text-base">
                      {action.icon}
                    </span>
                    <span className="block text-sm font-semibold text-[#1E293B]">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Today’s Schedule</h3>
                <button className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-xs font-medium">
                  View Calendar
                </button>
              </div>

              <div className="space-y-2">
                {schedule.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between rounded-[8px] bg-[#F6F0E6] px-4 py-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#7438F2]">{item.time}</p>
                      <p className="font-medium">{item.title}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Recent Activity</h3>
              </div>

              <div className="space-y-2">
                {activity.map((item) => (
                  <div
                    key={item}
                    className="rounded-[8px] bg-[#F6F0E6] px-4 py-3 text-sm text-[#1E293B]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
