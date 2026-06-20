"use client";

import { useEffect, useState } from "react";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SearchResult = {
  id: string;
  type: "Child" | "Parent" | "Family" | "Party" | "Employee";
  name: string;
  details: string;
  initials: string;
  meta?: {
    waiverStatus?: string;
    membershipStatus?: string;
    lastVisit?: string;
    totalVisits?: number;
  };
};

const navItems = [
  { label: "Dashboard", icon: "▣" },
  { label: "Check-In", icon: "✓" },
  { label: "Calendar", icon: "◷" },
  { label: "Parties", icon: "★" },
  { label: "POS", icon: "$" },
  { label: "Reports", icon: "▥" },
  { label: "Company Settings", icon: "⚙" },
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

const schedule = [
  { time: "10:00 AM", title: "Open Play", status: "Active" },
  { time: "12:00 PM", title: "Gray Birthday Party", status: "Confirmed" },
  { time: "3:30 PM", title: "Private Event", status: "Pending" },
];

const activity = [
  "Emma Gray checked in",
  "Mason Taylor waiver signed",
  "Birthday party booked for Saturday",
  "Summer Membership renewed",
];

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

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
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [greeting, setGreeting] = useState("Good Morning");
  const [today, setToday] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");

  function handleVoiceSearch() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceMessage("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMessage("Listening...");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceMessage("I couldn't hear that. Try again.");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;

      setSearchQuery(transcript);
      setVoiceMessage(`Heard: "${transcript}"`);
    };

    recognition.start();
  }

  useEffect(() => {
    setGreeting(getGreeting());
    setToday(getFormattedDate());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadResults() {
      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}`,
          {
            signal: controller.signal,
          }
        );

        const data = await response.json();
        const results = data.results ?? [];

        setSearchResults(results);

        if (results.length > 0) {
          setSelectedResult((current) => current ?? results[0]);
        }

        if (results.length === 0) {
          setSelectedResult(null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Search failed:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }

    const timeout = window.setTimeout(loadResults, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  return (
    <main className="h-screen overflow-hidden bg-[#F6F0E6] text-[#202633] antialiased">
      <div className="flex h-screen">
        <aside className="sticky top-0 h-screen w-[270px] shrink-0 bg-[#1E293B] px-7 py-8 text-white">
          <div className="mb-12">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/14 text-sm font-semibold">
                PF
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-[-0.03em]">
                  PlayFlow
                </h1>
                <p className="text-xs text-white/60">Palmetto Playhouse</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item, index) => {
              const isActive = index === 0;

              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left text-md font-semibold transition ${
                    isActive
                      ? "bg-white font-semibold text-[#1E293B] shadow-md"
                      : "text-white/72 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-8 left-7 right-7">
            <button className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-sm font-medium text-white/72 hover:bg-white/10 hover:text-white">
              <span>↪</span>
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        <section className="h-screen flex-1 overflow-y-auto px-10 py-8">
          <header className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">
                {today || "Tuesday, June 16"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                {greeting}, Devin 👋
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                title="System Settings"
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-[#1E293B] transition hover:bg-white/70"
              >
                ⚙
              </button>

              <button className="rounded-2xl bg-white px-4 py-3 text-sm text-[#1E293B] font-medium shadow-sm">
                Notifications
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD56B]  text-[#1E293B] text-md font-semibold">
                  D
                </div>
                <span className="text-sm font-medium text-[#1E293B]">
                  Devin
                </span>
              </div>
            </div>
          </header>

          <div className="mb-8 grid grid-cols-4 gap-5">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-[28px] bg-gradient-to-br ${card.color} p-6 text-white shadow-sm`}
              >
                <div className={card.textColor}>
                  <p className="text-sm font-medium opacity-90">
                    {card.label}
                  </p>
                  <h3 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">
                    {card.value}
                  </h3>
                  <p className="mt-2 text-sm font-normal opacity-75">
                    {card.note}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-8 grid grid-cols-[1.2fr_.8fr] gap-6">
            <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#FFE4A7] to-[#FFF0D0] p-8 shadow-sm">
              <div className="relative z-10 max-w-[680px]">
                <p className="text-sm font-semibold text-[#B97835]">
                  Check-In
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#2B2F38]">
                  Search parents, children, parties, or phone numbers.
                </h2>

                <div className="mt-6">
                  <div className="flex rounded-2xl border border-black/5 bg-white/85 shadow-sm">
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="min-w-0 flex-1 rounded-l-2xl bg-transparent px-5 py-5 text-base outline-none"
                      placeholder="Start typing a name, phone number, or party..."
                    />

                    <button
                      type="button"
                      onClick={handleVoiceSearch}
                      className={`m-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl transition ${
                        isListening
                          ? "bg-[#7BAE7F] text-white"
                          : "bg-[#1E293B] text-white hover:bg-[#334155]"
                      }`}
                      title="Voice search"
                    >
                      {isListening ? "●" : "🎙"}
                    </button>
                  </div>

                  {voiceMessage && (
                    <p className="mt-3 text-sm font-medium text-[#8A6D3B]">
                      {voiceMessage}
                    </p>
                  )}
                </div>

                <button className="mt-5 rounded-2xl bg-[#1E293B] px-6 py-4 text-sm font-semibold text-white shadow-md">
                  + New Walk-In
                </button>
              </div>

              <div className="absolute right-16 top-14 text-[110px] opacity-20">
                🎈
              </div>
              <div className="absolute bottom-8 right-40 text-[72px] opacity-20">
                ✨
              </div>
            </section>

            <section className="rounded-[32px] bg-white/85 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-[-0.03em]">
                  Today’s Schedule
                </h2>
                <button className="rounded-xl bg-[#F6F0E6] px-3 py-2 text-xs font-medium">
                  View Calendar
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {schedule.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between rounded-2xl bg-[#F6F0E6] px-4 py-4"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#7438F2]">
                        {item.time}
                      </p>
                      <p className="font-medium">{item.title}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-[1.35fr_420px] gap-6 pb-10">
            <section className="rounded-[32px] bg-white/85 p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#7438F2]">
                  Search Results
                </p>

                {isSearching && (
                  <p className="text-xs font-medium text-[#6B7280]">
                    Searching...
                  </p>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => setSelectedResult(result)}
                      className={`w-full rounded-3xl p-4 text-left transition ${
                        selectedResult?.id === result.id
                          ? "bg-[#1E293B] text-white shadow-md"
                          : "bg-[#F6F0E6] hover:bg-[#EEE4D5]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-base font-semibold text-[#1E293B]">
                          {result.initials}
                        </div>

                        <div>
                          <p className="text-lg font-semibold tracking-[-0.03em]">
                            {result.name}
                          </p>
                          <p
                            className={`text-sm ${
                              selectedResult?.id === result.id
                                ? "text-blue-100"
                                : "text-[#6B7280]"
                            }`}
                          >
                            {result.type} • {result.details}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-3xl bg-[#F6F0E6] p-5 text-sm text-[#6B7280]">
                    No matching results yet.
                  </div>
                )}
              </div>

              <div className="mt-7 rounded-3xl bg-[#F6F0E6] p-5">
                <h3 className="font-semibold tracking-[-0.03em]">
                  Recent Activity
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {activity.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-white px-4 py-3 text-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="rounded-[32px] bg-white/85 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#7438F2]">
                    {selectedResult?.type ?? "Result"} Profile
                  </p>
                  <h3 className="mt-1 text-3xl font-semibold leading-9 tracking-[-0.05em]">
                    {selectedResult?.name ?? "Select a result"}
                  </h3>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F6F0E6] text-xl font-semibold text-[#1E293B]">
                  {selectedResult?.initials ?? "?"}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-3xl bg-[#F6F0E6] p-4">
                  <p className="text-xs font-semibold text-[#7438F2]">
                    Waiver
                  </p>
                  <p className="mt-1 font-semibold text-[#3E7C59]">
                    {selectedResult?.meta?.waiverStatus ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl bg-[#F6F0E6] p-4">
                  <p className="text-xs font-semibold text-[#7438F2]">
                    Membership
                  </p>
                  <p className="mt-1 font-semibold text-[#3E7C59]">
                    {selectedResult?.meta?.membershipStatus ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl bg-[#F6F0E6] p-4">
                  <p className="text-xs font-semibold text-[#7438F2]">
                    Last Visit
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedResult?.meta?.lastVisit ?? "—"}
                  </p>
                </div>

                <div className="rounded-3xl bg-[#F6F0E6] p-4">
                  <p className="text-xs font-semibold text-[#7438F2]">
                    Total Visits
                  </p>
                  <p className="mt-1 font-semibold">
                    {selectedResult?.meta?.totalVisits ?? 0}
                  </p>
                </div>
              </div>

              <button className="mt-6 w-full rounded-3xl bg-[#7BAE7F] px-5 py-5 text-lg font-semibold text-white shadow-md">
                CHECK IN
              </button>

              <div className="mt-5 space-y-3">
                {[
                  "Edit Profile",
                  "View Parent / Family",
                  "Visit History",
                  "Open POS for This Guest",
                ].map((item) => (
                  <button
                    key={item}
                    className="w-full rounded-2xl bg-[#F6F0E6] px-4 py-4 text-left text-sm font-medium"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
