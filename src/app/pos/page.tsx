"use client";

import Link from "next/link";
import StaffName from "@/components/StaffName";
import SignOutButton from "@/components/SignOutButton";
import Register from "@/components/counter/Register";

const navigation = [["Dashboard", "▣", "/"], ["Check-In", "✓", "/check-in"], ["Calendar", "◷", "/calendar"], ["Party & Events", "★", "/parties"], ["POS", "$", "/pos"], ["Reports", "▥", "/reports"], ["Company Settings", "⚙", "/company-settings"]];
export default function POSPage() {
  return <main className="h-dvh overflow-hidden bg-[#E7E3DA] p-2 text-[#202633] antialiased sm:p-5">
    <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
      <aside className="hidden w-[235px] shrink-0 flex-col border-r border-black/10 bg-[#F2EFE8] px-5 py-7 lg:flex">
        <Link href="/" className="mb-9 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E293B] text-sm font-semibold text-white">PF</span><span><strong className="block text-lg">PlayFlow</strong><span className="text-xs text-gray-500">Palmetto Playhouse</span></span></Link>
        <nav className="space-y-1">{navigation.map(([label, icon, href]) => <Link key={href} href={href} className={`flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-semibold ${href === "/pos" ? "bg-white shadow-sm" : "text-gray-500 hover:bg-white/70"}`}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav>
        <div className="mt-auto pt-6"><SignOutButton/></div>
      </aside>
      <section className="pos-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        <header className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#8A6D3B]">Point of Sale</p><h1 className="text-2xl font-semibold tracking-tight">POS</h1></div><div className="text-sm font-semibold"><StaffName/></div></header>
        <nav className="mb-3 flex shrink-0 gap-4 overflow-x-auto whitespace-nowrap pb-2 text-sm underline lg:hidden">{navigation.map(([label, , href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <Register/>
      </section>
    </div>
  </main>;
}
