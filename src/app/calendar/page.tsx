"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const days = [
  { label: "SUN", date: "Jun 21", key: "sun" },
  { label: "MON", date: "Jun 22", key: "mon" },
  { label: "TUE", date: "Jun 23", key: "tue" },
  { label: "WED", date: "Jun 24", key: "wed" },
  { label: "THU", date: "Jun 25", key: "thu" },
  { label: "FRI", date: "Jun 26", key: "fri" },
  { label: "SAT", date: "Jun 27", key: "sat" },
];

const timeRows = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];

const events = [
  { id: 1, day: "mon", start: "9:00 AM", end: "12:00 PM", title: "Open Play", type: "open", rowStart: 2, rowSpan: 3 },
  { id: 2, day: "mon", start: "12:00 PM", end: "1:00 PM", title: "Closed for Cleaning", type: "closed", rowStart: 5, rowSpan: 1 },
  { id: 3, day: "mon", start: "1:00 PM", end: "5:00 PM", title: "Open Play", type: "open", rowStart: 6, rowSpan: 4 },

  { id: 4, day: "tue", start: "9:00 AM", end: "12:00 PM", title: "Open Play", type: "open", rowStart: 2, rowSpan: 3 },
  { id: 5, day: "tue", start: "12:00 PM", end: "1:00 PM", title: "Closed for Cleaning", type: "closed", rowStart: 5, rowSpan: 1 },
  { id: 6, day: "tue", start: "1:00 PM", end: "5:00 PM", title: "Open Play", type: "open", rowStart: 6, rowSpan: 4 },

  { id: 7, day: "wed", start: "9:30 AM", end: "11:30 AM", title: "Toddler Time", type: "class", rowStart: 2, rowSpan: 2 },
  { id: 8, day: "wed", start: "12:00 PM", end: "1:00 PM", title: "Closed for Cleaning", type: "closed", rowStart: 5, rowSpan: 1 },
  { id: 9, day: "wed", start: "6:00 PM", end: "8:00 PM", title: "Birthday Party - Emma R.", type: "party", rowStart: 11, rowSpan: 2 },

  { id: 10, day: "thu", start: "9:00 AM", end: "12:00 PM", title: "Open Play", type: "open", rowStart: 2, rowSpan: 3 },
  { id: 11, day: "thu", start: "12:00 PM", end: "1:00 PM", title: "Closed for Cleaning", type: "closed", rowStart: 5, rowSpan: 1 },
  { id: 12, day: "thu", start: "1:00 PM", end: "5:00 PM", title: "Open Play", type: "open", rowStart: 6, rowSpan: 4 },

  { id: 13, day: "fri", start: "9:00 AM", end: "12:00 PM", title: "Open Play", type: "open", rowStart: 2, rowSpan: 3 },
  { id: 14, day: "fri", start: "12:00 PM", end: "1:00 PM", title: "Closed for Cleaning", type: "closed", rowStart: 5, rowSpan: 1 },
  { id: 15, day: "fri", start: "1:00 PM", end: "5:00 PM", title: "Open Play", type: "open", rowStart: 6, rowSpan: 4 },
  { id: 16, day: "fri", start: "6:00 PM", end: "8:00 PM", title: "Birthday Party - Mason T.", type: "party", rowStart: 11, rowSpan: 2 },

  { id: 17, day: "sat", start: "9:00 AM", end: "11:00 AM", title: "Birthday Party - Sophia L.", type: "party", rowStart: 2, rowSpan: 2 },
  { id: 18, day: "sat", start: "11:30 AM", end: "2:30 PM", title: "Open Play", type: "open", rowStart: 4, rowSpan: 3 },
  { id: 19, day: "sat", start: "2:30 PM", end: "3:30 PM", title: "Closed for Cleaning", type: "closed", rowStart: 7, rowSpan: 1 },
  { id: 20, day: "sat", start: "3:30 PM", end: "6:30 PM", title: "Open Play", type: "open", rowStart: 8, rowSpan: 3 },
];

const upcomingEvents = [
  { title: "Emma R. Birthday Party", date: "Wed, Jun 24", time: "6:00 - 8:00 PM", type: "party" },
  { title: "Mason T. Birthday Party", date: "Fri, Jun 26", time: "6:00 - 8:00 PM", type: "party" },
  { title: "Sophia L. Birthday Party", date: "Sat, Jun 27", time: "9:00 - 11:00 AM", type: "party" },
];

function getEventStyle(type: string) {
  if (type === "open") {
    return "border-[#7BAE7F] bg-[#E9F8EC] text-[#245B35]";
  }

  if (type === "party") {
    return "border-[#FFB768] bg-[#FFF1D8] text-[#92400E]";
  }

  if (type === "class") {
    return "border-[#FF91AA] bg-[#FFE0E9] text-[#9F1239]";
  }

  if (type === "closed") {
    return "border-black/10 bg-[#F1F1F1] text-[#4B5563]";
  }

  return "border-[#B99AFF] bg-[#EEE7FF] text-[#5B21B6]";
}

function getEventIcon(type: string) {
  if (type === "open") return "👥";
  if (type === "party") return "🎂";
  if (type === "class") return "●";
  if (type === "closed") return "🧹";
  return "•";
}

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState("sun");

  const selectedDayInfo = days.find((day) => day.key === selectedDay) ?? days[0];

  const selectedDayEvents = useMemo(() => {
    return events.filter((event) => event.day === selectedDay);
  }, [selectedDay]);

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
              const isActive = item.href === "/calendar";

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
              <p className="text-sm font-semibold text-[#8A6D3B]">Scheduling</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                Calendar
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

          <div className="grid h-[calc(100vh-125px)] grid-cols-[1fr_300px] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <div className="flex items-center gap-3">
                  <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
                    Week View ▾
                  </button>
                  <button className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold">
                    Today
                  </button>
                  <div className="flex overflow-hidden rounded-[10px] border border-black/10">
                    <button className="bg-white px-4 py-3 text-sm font-semibold">‹</button>
                    <button className="border-l border-black/10 bg-white px-4 py-3 text-sm font-semibold">›</button>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-[-0.03em]">
                    June 21 – June 27, 2026
                  </h2>

                  <div className="flex items-center gap-3 text-[11px] font-semibold text-[#5B6270]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#7BAE7F] bg-[#E9F8EC]" />
                      Open Play
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#FFB768] bg-[#FFF1D8]" />
                      Party
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-[#FF91AA] bg-[#FFE0E9]" />
                      Class
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full border border-black/10 bg-[#F1F1F1]" />
                      Closed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">
                    Generate Next Week
                  </button>
                  <button className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">
                    + New Event
                  </button>
                </div>
              </div>

              <div className="grid h-full grid-cols-[70px_1fr]">
                <div className="border-r border-black/10 pt-[56px]">
                  {timeRows.map((time) => (
                    <div key={time} className="h-[54px] px-3 text-right text-xs font-medium text-[#6B7280]">
                      {time}
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden">
                  <div className="grid h-[56px] grid-cols-7 border-b border-black/10">
                    {days.map((day) => (
                      <button
                        key={day.key}
                        onClick={() => setSelectedDay(day.key)}
                        className={`border-r border-black/10 text-center transition last:border-r-0 ${
                          selectedDay === day.key ? "bg-[#F6F0E6]" : "bg-white"
                        }`}
                      >
                        <p className="mt-3 text-xs font-semibold text-[#1E293B]">{day.label}</p>
                        <p className="text-xs text-[#6B7280]">{day.date}</p>
                      </button>
                    ))}
                  </div>

                  <div className="relative grid h-[702px] grid-cols-7">
                    {days.map((day) => (
                      <div key={day.key} className="relative border-r border-black/10 last:border-r-0">
                        {timeRows.map((time) => (
                          <div key={time} className="h-[54px] border-b border-black/5" />
                        ))}

                        {events
                          .filter((event) => event.day === day.key)
                          .map((event) => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedDay(event.day)}
                              className={`absolute left-2 right-2 overflow-hidden rounded-[8px] border p-2 text-left text-xs shadow-sm ${getEventStyle(event.type)}`}
                              style={{
                                top: `${(event.rowStart - 1) * 54 + 8}px`,
                                height: `${event.rowSpan * 54 - 10}px`,
                              }}
                            >
                              <p className="font-semibold">{event.start} – {event.end}</p>
                              <p className="mt-1 font-bold">
                                {getEventIcon(event.type)} {event.title}
                              </p>
                            </button>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-3 overflow-hidden">
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#6B7280]">Selected Day</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#1E293B]">
                      {selectedDayInfo.label}, {selectedDayInfo.date}
                    </h3>
                  </div>
                  <button className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-xs font-semibold">
                    Add Event
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map((event) => (
                      <div key={event.id} className={`rounded-[10px] border p-3 ${getEventStyle(event.type)}`}>
                        <p className="text-xs font-semibold">
                          {event.start} – {event.end}
                        </p>
                        <p className="mt-1 font-semibold">
                          {getEventIcon(event.type)} {event.title}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[10px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">
                      No events scheduled.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">Upcoming Events</h3>
                  <button className="text-sm font-semibold text-[#0B55C6]">View All</button>
                </div>

                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.title} className="flex gap-3 border-b border-black/10 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FFF1D8] text-base">
                        🎂
                      </div>
                      <div>
                        <p className="font-semibold text-[#1E293B]">{event.title}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {event.date} • {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">Quick Actions</h3>

                <div className="mt-4 space-y-2">
                  <button className="w-full rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-[#0B55C6]">Generate Next Week Schedule</p>
                    <p className="mt-1 text-xs text-[#5B6270]">Create events from a saved template</p>
                  </button>

                  <button className="w-full rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-[#0B55C6]">Manage Schedule Templates</p>
                    <p className="mt-1 text-xs text-[#5B6270]">Edit open play and seasonal templates</p>
                  </button>

                  <button className="w-full rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-[#0B55C6]">Calendar Settings</p>
                    <p className="mt-1 text-xs text-[#5B6270]">Hours, closures, and event preferences</p>
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
