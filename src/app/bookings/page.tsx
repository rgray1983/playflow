"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventTypeOption = {
  id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
};

type PackageOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  depositAmount: number;
  guestLimit: number | null;
  durationMinutes: number | null;
  active: boolean;
};

type AddOnOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
};

type BookingStep = "details" | "addons" | "date" | "customer" | "deposit";
type DepositStatus = "pending" | "cash" | "card" | "waived";

const fallbackEventTypes: EventTypeOption[] = [
  { id: "birthday-party", name: "Birthday Party", description: "", color: "#FFB768", active: true },
  { id: "private-event", name: "Private Event", description: "", color: "#3B82F6", active: true },
  { id: "field-trip", name: "Field Trip", description: "", color: "#7BAE7F", active: true },
];

const fallbackPackages: PackageOption[] = [
  {
    id: "birthday-party-package",
    name: "Birthday Party Package",
    description: "Standard party package.",
    price: 300,
    depositAmount: 100,
    guestLimit: 20,
    durationMinutes: 120,
    active: true,
  },
  {
    id: "private-party-package",
    name: "Private Party Package",
    description: "Private room and extended party time.",
    price: 375,
    depositAmount: 100,
    guestLimit: 25,
    durationMinutes: 120,
    active: true,
  },
];

const fallbackAddOns: AddOnOption[] = [
  { id: "balloon-arch", name: "Balloon Arch", description: "Decorative balloon arch.", price: 75, active: true },
  { id: "balloon-columns", name: "Balloon Columns", description: "Pair of balloon columns.", price: 100, active: true },
  { id: "extra-time", name: "Extra 30 Minutes", description: "Extend party time.", price: 50, active: true },
  { id: "pizza", name: "Pizza Package", description: "Food add-on for guests.", price: 60, active: true },
];

const years = [2026, 2027, 2028];

const monthsByYear: Record<number, string[]> = {
  2026: ["July", "August", "September", "October", "November", "December"],
  2027: ["January", "February", "March", "April", "May", "June"],
  2028: ["January", "February", "March", "April", "May", "June"],
};

const daysByMonth: Record<string, { label: string; availability: "plenty" | "limited" | "booked"; slots: number }[]> = {
  "July 2026": [
    { label: "Sat Jul 11", availability: "plenty", slots: 4 },
    { label: "Sun Jul 12", availability: "limited", slots: 2 },
    { label: "Sat Jul 18", availability: "plenty", slots: 3 },
    { label: "Sun Jul 19", availability: "booked", slots: 0 },
    { label: "Sat Jul 25", availability: "limited", slots: 1 },
    { label: "Sun Jul 26", availability: "plenty", slots: 4 },
  ],
  "August 2026": [
    { label: "Sat Aug 1", availability: "plenty", slots: 4 },
    { label: "Sun Aug 2", availability: "plenty", slots: 3 },
    { label: "Sat Aug 8", availability: "limited", slots: 2 },
    { label: "Sun Aug 9", availability: "booked", slots: 0 },
    { label: "Sat Aug 15", availability: "plenty", slots: 4 },
    { label: "Sun Aug 16", availability: "limited", slots: 1 },
  ],
  "September 2026": [
    { label: "Sat Sep 5", availability: "plenty", slots: 4 },
    { label: "Sun Sep 6", availability: "limited", slots: 2 },
    { label: "Sat Sep 12", availability: "plenty", slots: 3 },
    { label: "Sun Sep 13", availability: "plenty", slots: 4 },
    { label: "Sat Sep 19", availability: "limited", slots: 1 },
    { label: "Sun Sep 20", availability: "booked", slots: 0 },
  ],
  "October 2026": [
    { label: "Sat Oct 3", availability: "plenty", slots: 4 },
    { label: "Sun Oct 4", availability: "plenty", slots: 4 },
    { label: "Sat Oct 10", availability: "limited", slots: 2 },
    { label: "Sun Oct 11", availability: "plenty", slots: 3 },
    { label: "Sat Oct 17", availability: "booked", slots: 0 },
    { label: "Sun Oct 18", availability: "limited", slots: 1 },
  ],
};

const timeSlots = [
  { label: "9:00 AM - 11:00 AM", available: true },
  { label: "12:00 PM - 2:00 PM", available: true },
  { label: "3:00 PM - 5:00 PM", available: true },
  { label: "6:00 PM - 8:00 PM", available: false },
];

const navItems = [
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Bookings", icon: "✎", href: "/bookings" },
  { label: "Party & Event Manager", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
];

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function makeSoftColor(hexColor: string) {
  if (!hexColor.startsWith("#") || hexColor.length !== 7) return "#F6F0E6";
  return `${hexColor}22`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "No duration";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours} hr ${remainingMinutes} min`;
  if (hours) return `${hours} hr`;
  return `${minutes} min`;
}

function getEventIcon(eventTypeName: string) {
  const name = normalizeName(eventTypeName);
  if (name.includes("party")) return "🎂";
  if (name.includes("field")) return "🚌";
  if (name.includes("camp")) return "🏕️";
  if (name.includes("class")) return "●";
  if (name.includes("rental")) return "🔑";
  return "★";
}

function getDepositLabel(status: DepositStatus) {
  if (status === "cash") return "Cash Deposit Collected";
  if (status === "card") return "Card Deposit Collected";
  if (status === "waived") return "Deposit Waived";
  return "Deposit Pending";
}

function getAvailabilityStyles(availability: "plenty" | "limited" | "booked") {
  if (availability === "plenty") return "bg-[#E9F8EC] text-[#245B35]";
  if (availability === "limited") return "bg-[#FFF0C4] text-[#92400E]";
  return "bg-[#FFE0E9] text-[#9F1239]";
}

export default function BookingsPage() {
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>(fallbackEventTypes);
  const [packages, setPackages] = useState<PackageOption[]>(fallbackPackages);
  const [addOns, setAddOns] = useState<AddOnOption[]>(fallbackAddOns);

  const [selectedEventTypeId, setSelectedEventTypeId] = useState(fallbackEventTypes[0].id);
  const [selectedPackageId, setSelectedPackageId] = useState(fallbackPackages[0].id);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [step, setStep] = useState<BookingStep>("details");

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [notes, setNotes] = useState("");

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>("pending");
  const [bookingComplete, setBookingComplete] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [eventTypesResponse, packagesResponse, addOnsResponse] = await Promise.all([
          fetch("/api/event-types"),
          fetch("/api/packages"),
          fetch("/api/add-ons"),
        ]);

        const [eventTypesData, packagesData, addOnsData] = await Promise.all([
          eventTypesResponse.json(),
          packagesResponse.json(),
          addOnsResponse.json(),
        ]);

        const activeEventTypes = (eventTypesData.eventTypes ?? []).filter((eventType: EventTypeOption) => eventType.active);
        const activePackages = (packagesData.packages ?? []).filter((packageItem: PackageOption) => packageItem.active);
        const activeAddOns = (addOnsData.addOns ?? []).filter((addOn: AddOnOption) => addOn.active);

        if (activeEventTypes.length > 0) {
          setEventTypes(activeEventTypes);
          setSelectedEventTypeId(activeEventTypes[0].id);
        }
        if (activePackages.length > 0) {
          setPackages(activePackages);
          setSelectedPackageId(activePackages[0].id);
        }
        if (activeAddOns.length > 0) setAddOns(activeAddOns);
      } catch {
        setEventTypes(fallbackEventTypes);
        setPackages(fallbackPackages);
        setAddOns(fallbackAddOns);
      }
    }

    loadSettings();
  }, []);

  const selectedEventType =
    eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? eventTypes[0] ?? fallbackEventTypes[0];

  const selectedPackage =
    packages.find((packageItem) => packageItem.id === selectedPackageId) ?? packages[0] ?? fallbackPackages[0];

  const selectedAddOns = addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));
  const addOnsTotal = selectedAddOns.reduce((total, addOn) => total + addOn.price, 0);
  const total = selectedPackage.price + addOnsTotal;
  const depositDue = depositStatus === "waived" ? 0 : selectedPackage.depositAmount;
  const balanceDue = Math.max(total - depositDue, 0);

  const selectedDateSummary = selectedDay && selectedTime ? `${selectedDay} • ${selectedTime}` : "Select Date";
  const customerName = `${parentFirstName} ${parentLastName}`.trim();
  const hasDateTime = Boolean(selectedDay && selectedTime);
  const hasCustomer = Boolean(parentFirstName.trim() && parentLastName.trim() && phone.trim());
  const canCreateBooking = hasDateTime && hasCustomer && depositStatus !== "pending";
  const completionPercent = step === "details" ? 20 : step === "addons" ? 40 : step === "date" ? 60 : step === "customer" ? 80 : 100;

  const stepSummary = {
    details: `${selectedEventType.name} • ${selectedPackage.name}`,
    addons: selectedAddOns.length ? `${selectedAddOns.length} add-on${selectedAddOns.length === 1 ? "" : "s"} selected` : "No add-ons selected",
    date: hasDateTime ? selectedDateSummary : "Date not selected",
    customer: customerName || "Customer not entered",
    deposit: getDepositLabel(depositStatus),
  };

  function toggleAddOn(addOnId: string) {
    setSelectedAddOnIds((current) =>
      current.includes(addOnId) ? current.filter((id) => id !== addOnId) : [...current, addOnId]
    );
  }

  async function completeBooking() {
    if (!canCreateBooking) return;

    const [startTime, endTime] = selectedTime.split(" - ");
    const eventDate = selectedDay && selectedYear ? `${selectedDay} ${selectedYear}` : selectedDay;

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventTypeId: selectedEventType.id,
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          title: childName.trim()
            ? `${childName.trim()} ${selectedEventType.name}`
            : `${customerName} ${selectedEventType.name}`,
          eventDate,
          startTime,
          endTime,
          guestOfHonor: childName,
          parentFirstName,
          parentLastName,
          email,
          phone,
          notes,
          packagePrice: selectedPackage.price,
          depositAmount: selectedPackage.depositAmount,
          balanceDue,
          depositStatus,
          addOns: selectedAddOns.map((addOn) => ({
            id: addOn.id,
            name: addOn.name,
            price: addOn.price,
          })),
        }),
      });

      const responseText = await response.text();
      let data: { error?: string } = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText) as { error?: string };
        } catch {
          data = {
            error: responseText,
          };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || "Unable to create booking.");
      }

      setBookingComplete(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create booking.");
    }
  }

  function selectDeposit(status: DepositStatus) {
    setDepositStatus(status);
    setDepositModalOpen(false);
    setStep("deposit");
  }

  function createAnotherBooking() {
    setSelectedAddOnIds([]);
    setSelectedDay("");
    setSelectedTime("");
    setParentFirstName("");
    setParentLastName("");
    setEmail("");
    setPhone("");
    setChildName("");
    setNotes("");
    setDepositStatus("pending");
    setBookingComplete(false);
    setStep("details");
  }

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">PF</div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1>
                <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === "/bookings";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive ? "bg-white text-[#111827] shadow-sm" : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="h-full flex-1 overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">Manual Booking</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">Bookings</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/parties" className="rounded-[10px] border border-[#B7D4FF] bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0B55C6]">Party Manager</Link>
              <Link href="/calendar" className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#1E293B]">Calendar</Link>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[1fr_350px] gap-3">
            <section className="overflow-y-auto rounded-[12px] border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-5 rounded-[12px] bg-[#F6F0E6] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1E293B]">Booking Progress</p>
                  <span className="text-sm font-semibold text-[#6B7280]">{completionPercent}% Complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#1E293B] transition-all duration-300" style={{ width: `${completionPercent}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] font-semibold text-[#6B7280]">
                  {["Event", "Add-ons", "Date", "Customer", "Deposit"].map((label, index) => (
                    <span key={label} className={completionPercent >= (index + 1) * 20 ? "text-[#1E293B]" : ""}>
                      {completionPercent >= (index + 1) * 20 ? "✓ " : "○ "}{label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-5 space-y-2">
                {[
                  ["details", "1", "Event + Package", stepSummary.details],
                  ["addons", "2", "Add-Ons", stepSummary.addons],
                  ["date", "3", "Date + Time", stepSummary.date],
                  ["customer", "4", "Customer", stepSummary.customer],
                  ["deposit", "5", "Deposit", stepSummary.deposit],
                ].map(([key, number, label, summary]) => (
                  <button
                    key={key}
                    onClick={() => setStep(key as BookingStep)}
                    className={`flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-left transition ${
                      step === key ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#5B6270] hover:bg-[#EFE8DC]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold opacity-80">Step {number}</p>
                      <p className="mt-1 text-sm font-semibold">{label}</p>
                    </div>
                    <span className={`max-w-[55%] truncate text-right text-xs ${step === key ? "text-white/70" : "text-[#6B7280]"}`}>
                      {summary}
                    </span>
                  </button>
                ))}
              </div>

              <div className="transition-all duration-300">
                {step === "details" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-4">
                      <p className="text-lg font-semibold text-[#1E293B]">Event & Package</p>
                      <p className="mt-1 text-sm text-[#6B7280]">Choose what the customer is booking. These options come from Company Settings.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <label>
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Event Type</span>
                        <select value={selectedEventTypeId} onChange={(event) => setSelectedEventTypeId(event.target.value)} className="mt-2 w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none">
                          {eventTypes.map((eventType) => <option key={eventType.id} value={eventType.id}>{eventType.name}</option>)}
                        </select>
                      </label>

                      <label>
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Package</span>
                        <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)} className="mt-2 w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none">
                          {packages.map((packageItem) => <option key={packageItem.id} value={packageItem.id}>{packageItem.name}</option>)}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-3">
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Price</p><p className="mt-2 font-semibold text-[#1E293B]">{formatCurrency(selectedPackage.price)}</p></div>
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Deposit</p><p className="mt-2 font-semibold text-[#155E75]">{formatCurrency(selectedPackage.depositAmount)}</p></div>
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Guests</p><p className="mt-2 font-semibold text-[#1E293B]">{selectedPackage.guestLimit ?? "No limit"}</p></div>
                      <div className="rounded-[10px] bg-white p-4"><p className="text-xs font-semibold text-[#6B7280]">Duration</p><p className="mt-2 font-semibold text-[#1E293B]">{formatDuration(selectedPackage.durationMinutes)}</p></div>
                    </div>

                    <button onClick={() => setStep("addons")} className="mt-4 rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">Next: Add-Ons</button>
                  </section>
                )}

                {step === "addons" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div><p className="text-lg font-semibold text-[#1E293B]">Add-Ons</p><p className="mt-1 text-sm text-[#6B7280]">Tap to select. Selected add-ons are highlighted.</p></div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">{selectedAddOns.length} selected</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {addOns.map((addOn) => {
                        const isSelected = selectedAddOnIds.includes(addOn.id);
                        return (
                          <button key={addOn.id} onClick={() => toggleAddOn(addOn.id)} className={`rounded-[10px] border p-4 text-left transition ${isSelected ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-white text-[#1E293B] hover:bg-[#EFE8DC]"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div><p className="font-semibold">{addOn.name}</p><p className={`mt-1 text-xs ${isSelected ? "text-white/70" : "text-[#6B7280]"}`}>{addOn.description || "Optional booking add-on"}</p></div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? "bg-white/15 text-white" : "bg-[#F6F0E6] text-[#1E293B]"}`}>{formatCurrency(addOn.price)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button onClick={() => setStep("date")} className="mt-4 rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">Next: Select Date</button>
                  </section>
                )}

                {step === "date" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-4"><p className="text-lg font-semibold text-[#1E293B]">Date & Time</p><p className="mt-1 text-sm text-[#6B7280]">Pick a year, month, day, and available time slot.</p></div>
                    <button onClick={() => setDatePickerOpen(true)} className="w-full rounded-[12px] border border-black/10 bg-white px-5 py-5 text-left transition hover:bg-[#FAFAFA]">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Selected Date</p>
                      <p className="mt-2 text-xl font-semibold text-[#1E293B]">{selectedDateSummary}</p>
                    </button>
                    <button onClick={() => setStep("customer")} disabled={!hasDateTime} className="mt-4 rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Next: Customer Info</button>
                  </section>
                )}

                {step === "customer" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-4"><p className="text-lg font-semibold text-[#1E293B]">Customer Info</p><p className="mt-1 text-sm text-[#6B7280]">This will be attached to the booking and shown in Party & Event Manager.</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <input value={parentFirstName} onChange={(event) => setParentFirstName(event.target.value)} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Parent First Name" />
                      <input value={parentLastName} onChange={(event) => setParentLastName(event.target.value)} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Parent Last Name" />
                      <input value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Email" />
                      <input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Phone Number" />
                    </div>
                    <input value={childName} onChange={(event) => setChildName(event.target.value)} className="mt-3 w-full rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Child / Guest of Honor Name" />
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-3 min-h-[90px] w-full resize-none rounded-[10px] border border-black/10 bg-white px-4 py-3 text-sm outline-none" placeholder="Notes, balloon colors, special requests..." />
                    <button onClick={() => setStep("deposit")} disabled={!hasCustomer} className="mt-4 rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Next: Deposit</button>
                  </section>
                )}

                {step === "deposit" && (
                  <section className="rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                    <div className="mb-4"><p className="text-lg font-semibold text-[#1E293B]">Deposit Decision</p><p className="mt-1 text-sm text-[#6B7280]">Collect the deposit now or waive it before creating the booking.</p></div>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => setDepositModalOpen(true)} className="rounded-[12px] border border-black/10 bg-white p-5 text-left transition hover:bg-[#EFE8DC]">
                        <p className="text-lg font-semibold text-[#1E293B]">Collect Deposit</p>
                        <p className="mt-1 text-sm text-[#6B7280]">Cash or card</p>
                        <p className="mt-4 text-xl font-semibold text-[#155E75]">{formatCurrency(selectedPackage.depositAmount)}</p>
                      </button>
                      <button onClick={() => selectDeposit("waived")} className={`rounded-[12px] border p-5 text-left transition ${depositStatus === "waived" ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-white text-[#1E293B] hover:bg-[#EFE8DC]"}`}>
                        <p className="text-lg font-semibold">Waive Deposit</p>
                        <p className={`mt-1 text-sm ${depositStatus === "waived" ? "text-white/70" : "text-[#6B7280]"}`}>Allow booking without payment</p>
                      </button>
                      <div className="rounded-[12px] border border-black/10 bg-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Status</p>
                        <p className="mt-2 text-lg font-semibold text-[#1E293B]">{getDepositLabel(depositStatus)}</p>
                      </div>
                    </div>
                    <button onClick={completeBooking} disabled={!canCreateBooking} className="mt-4 w-full rounded-[10px] bg-[#7BAE7F] px-4 py-4 text-sm font-semibold text-white disabled:opacity-40">Create Booking & Send Confirmation</button>
                  </section>
                )}
              </div>
            </section>

            <aside className="space-y-3 overflow-y-auto">
              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#6B7280]">Final Review</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${depositStatus === "pending" ? "bg-[#FFF0C4] text-[#92400E]" : "bg-[#D7F1EC] text-[#155E75]"}`}>{getDepositLabel(depositStatus)}</span>
                </div>
                <div className="mt-3 rounded-[12px] border p-4" style={{ borderColor: selectedEventType.color, backgroundColor: makeSoftColor(selectedEventType.color) }}>
                  <p className="text-sm font-semibold text-[#1E293B]">{getEventIcon(selectedEventType.name)} {selectedEventType.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">{selectedPackage.name}</p>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#6B7280]">Package</span><span className="font-semibold text-[#1E293B]">{formatCurrency(selectedPackage.price)}</span></div>
                  {selectedAddOns.map((addOn) => <div key={addOn.id} className="flex justify-between"><span className="text-[#6B7280]">{addOn.name}</span><span className="font-semibold text-[#1E293B]">{formatCurrency(addOn.price)}</span></div>)}
                  <div className="border-t border-black/10 pt-2">
                    <div className="flex justify-between"><span className="font-semibold text-[#1E293B]">Total</span><span className="font-semibold text-[#1E293B]">{formatCurrency(total)}</span></div>
                    <div className="mt-2 flex justify-between"><span className="text-[#6B7280]">Deposit Due</span><span className="font-semibold text-[#155E75]">{formatCurrency(depositDue)}</span></div>
                    <div className="mt-2 flex justify-between"><span className="text-[#6B7280]">Remaining Balance</span><span className="font-semibold text-[#9F1239]">{formatCurrency(balanceDue)}</span></div>
                  </div>
                </div>
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#6B7280]">Selected Date</p>
                <p className="mt-2 text-lg font-semibold text-[#1E293B]">{selectedDateSummary}</p>
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#6B7280]">Customer</p>
                <p className="mt-2 font-semibold text-[#1E293B]">{customerName || "Not entered yet"}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{childName || "No child / guest of honor yet"}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{phone || "No phone yet"}</p>
                <p className="mt-1 text-xs text-[#6B7280]">{email || "No email yet"}</p>
                {notes && <p className="mt-3 rounded-[8px] bg-[#F6F0E6] p-3 text-xs text-[#6B7280]">{notes}</p>}
              </section>

              <section className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
                <button onClick={() => setStep("deposit")} disabled={!hasDateTime || !hasCustomer} className="w-full rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Go To Deposit</button>
                <button onClick={completeBooking} disabled={!canCreateBooking} className="mt-2 w-full rounded-[10px] bg-[#7BAE7F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Create Booking & Send Confirmation</button>
              </section>
            </aside>
          </div>
        </section>
      </div>

      {datePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="max-h-[86vh] w-full max-w-[880px] overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-xl">
            <div className="flex items-start justify-between border-b border-black/10 bg-white p-5">
              <div>
                <p className="text-sm font-semibold text-[#8A6D3B]">Select Date</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">Choose Year, Month, Day, and Time</h2>
              </div>
              <button onClick={() => setDatePickerOpen(false)} className="rounded-[10px] bg-[#F6F0E6] px-4 py-3 text-sm font-semibold">Close</button>
            </div>

            <div className="grid grid-cols-[150px_190px_1fr] gap-0">
              <div className="border-r border-black/10 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Years</p>
                <div className="space-y-2">
                  {years.map((year) => <button key={year} onClick={() => { setSelectedYear(year); setSelectedMonth(""); setSelectedDay(""); setSelectedTime(""); }} className={`w-full rounded-[10px] px-4 py-3 text-left text-sm font-semibold transition ${selectedYear === year ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}>{year}</button>)}
                </div>
              </div>

              <div className="border-r border-black/10 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Months</p>
                <div className="space-y-2">
                  {selectedYear ? monthsByYear[selectedYear].map((month) => {
                    const monthKey = `${month} ${selectedYear}`;
                    return <button key={monthKey} onClick={() => { setSelectedMonth(monthKey); setSelectedDay(""); setSelectedTime(""); }} className={`w-full rounded-[10px] px-4 py-3 text-left text-sm font-semibold transition ${selectedMonth === monthKey ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6] text-[#1E293B] hover:bg-[#EFE8DC]"}`}>{month}</button>;
                  }) : <p className="rounded-[10px] bg-[#F6F0E6] p-4 text-sm text-[#6B7280]">Select a year.</p>}
                </div>
              </div>

              <div className="max-h-[66vh] overflow-y-auto p-5">
                {!selectedMonth ? (
                  <div className="rounded-[12px] border border-dashed border-black/20 bg-white/70 p-8 text-center"><p className="font-semibold text-[#1E293B]">Select a month to see available days.</p></div>
                ) : !selectedDay ? (
                  <>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Available Days</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(daysByMonth[selectedMonth] ?? []).map((day) => (
                        <button key={day.label} disabled={day.availability === "booked"} onClick={() => setSelectedDay(day.label)} className="rounded-[12px] border border-black/10 bg-white p-5 text-left transition hover:bg-[#EFE8DC] disabled:cursor-not-allowed disabled:opacity-45">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-lg font-semibold text-[#1E293B]">{day.label}</p>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getAvailabilityStyles(day.availability)}`}>{day.availability === "plenty" ? "Plenty" : day.availability === "limited" ? "Limited" : "Booked"}</span>
                          </div>
                          <p className="mt-2 text-xs text-[#6B7280]">{day.slots} slot{day.slots === 1 ? "" : "s"} open</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setSelectedDay(""); setSelectedTime(""); }} className="mb-4 rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-[#1E293B]">← Back to days</button>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Available Times for {selectedDay}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {timeSlots.map((slot) => (
                        <button key={slot.label} disabled={!slot.available} onClick={() => setSelectedTime(slot.label)} className={`rounded-[12px] border p-5 text-left transition ${selectedTime === slot.label ? "border-[#1E293B] bg-[#1E293B] text-white" : "border-black/10 bg-white text-[#1E293B] hover:bg-[#EFE8DC]"} disabled:cursor-not-allowed disabled:bg-[#F1F1F1] disabled:text-[#9CA3AF]`}>
                          <p className="text-lg font-semibold">{slot.label}</p>
                          <p className={`mt-1 text-xs ${selectedTime === slot.label ? "text-white/70" : "text-[#6B7280]"}`}>{slot.available ? "Available" : "Booked"}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { if (selectedDay && selectedTime) { setDatePickerOpen(false); setStep("customer"); } }} disabled={!selectedTime} className="mt-5 w-full rounded-[12px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white disabled:opacity-40">Use This Date & Time</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {depositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="w-full max-w-[520px] rounded-[18px] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#8A6D3B]">Collect Deposit</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">Payment Method</h2>
                <p className="mt-2 text-sm text-[#6B7280]">Deposit due: {formatCurrency(selectedPackage.depositAmount)}</p>
              </div>
              <button onClick={() => setDepositModalOpen(false)} className="rounded-[10px] bg-[#F6F0E6] px-4 py-3 text-sm font-semibold">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => selectDeposit("cash")} className="rounded-[12px] border border-black/10 bg-[#E9F8EC] p-5 text-left transition hover:bg-[#D7F1EC]"><p className="text-xl font-semibold text-[#245B35]">Cash</p><p className="mt-2 text-sm text-[#245B35]">Customer is standing there in person.</p></button>
              <button onClick={() => selectDeposit("card")} className="rounded-[12px] border border-black/10 bg-[#EEF5FF] p-5 text-left transition hover:bg-[#DCEBFF]"><p className="text-xl font-semibold text-[#0B55C6]">Card</p><p className="mt-2 text-sm text-[#0B55C6]">Customer is paying by card or over the phone.</p></button>
            </div>
          </div>
        </div>
      )}

      {bookingComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
          <div className="w-full max-w-[560px] rounded-[18px] bg-white p-6 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E9F8EC] text-3xl">✓</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">Booking Created!</h2>
            <p className="mt-2 text-sm text-[#6B7280]">Confirmation sent, deposit recorded, and the booking is ready for Party & Event Manager.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href="/parties" className="rounded-[10px] bg-[#1E293B] px-4 py-4 text-sm font-semibold text-white">View Booking</Link>
              <button onClick={createAnotherBooking} className="rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-4 text-sm font-semibold text-[#1E293B]">Create Another Booking</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
