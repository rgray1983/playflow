"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useId, useRef, useState, type ReactNode} from "react";
import {BusinessName} from "./StaffIdentity";
import StaffName from "./StaffName";
import SignOutButton from "./SignOutButton";
import {isNavigationActive, isStaffPage, staffNavigation} from "@/lib/navigation/staff";

export default function StaffAppShell({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  if (!isStaffPage(pathname)) return children;

  function navigation(onNavigate?: () => void) {
    return staffNavigation.map(item => {
      const active = isNavigationActive(pathname, item.href);
      return <Link key={item.href} href={item.href} onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-white text-[#111827] shadow-sm" : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"}`}>
        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-base">{item.icon}</span>
        <span>{item.label}</span>
      </Link>;
    });
  }

  return <main className="h-dvh overflow-hidden bg-[#E7E3DA] p-2 text-[#202633] antialiased sm:p-5">
    <a href="#staff-content" className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-5 focus:top-5">Skip to page content</a>
    <div className="flex h-full min-h-0 overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
      <aside className="hidden h-full w-[235px] shrink-0 flex-col overflow-y-auto border-r border-black/10 bg-[#F2EFE8] px-5 py-6 md:flex">
        <Link href="/" className="mb-8 flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="PlayFlow dashboard">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E293B] text-sm font-semibold text-white">PF</span>
          <span className="min-w-0"><strong className="block text-lg">PlayFlow</strong><span className="block break-words text-xs text-[#6B7280]"><BusinessName/></span></span>
        </Link>
        <nav aria-label="Main navigation" className="space-y-1">{navigation()}</nav>
        <div className="mt-auto space-y-3 pt-6"><p className="break-words px-1 text-sm font-semibold"><StaffName/></p><SignOutButton/></div>
      </aside>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-[#F2EFE8] px-4 py-3 md:hidden">
          <Link href="/" className="min-w-0"><strong className="block">PlayFlow</strong><span className="block truncate text-xs text-[#6B7280]"><BusinessName/></span></Link>
          <button ref={menuButton} type="button" aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen(open => !open)} className="min-h-11 rounded-lg border bg-white px-4 py-2 text-sm font-semibold">{menuOpen ? "Close menu" : "Menu"}</button>
        </header>
        {menuOpen && <div id={menuId} className="public-scroll absolute inset-x-0 bottom-0 top-[73px] z-40 overflow-y-auto border-b bg-[#F2EFE8] p-4 shadow-lg md:hidden" onKeyDown={event => {if (event.key === "Escape") {setMenuOpen(false); menuButton.current?.focus();}}}>
          <nav aria-label="Main navigation" className="space-y-1">{navigation(() => setMenuOpen(false))}</nav>
          <div className="mt-5 space-y-3 border-t border-black/10 pt-4"><p className="text-sm font-semibold"><StaffName/></p><SignOutButton/></div>
        </div>}
        <div id="staff-content" tabIndex={-1} className="flex min-h-0 min-w-0 flex-1 flex-col outline-none">{children}</div>
      </div>
    </div>
  </main>;
}
