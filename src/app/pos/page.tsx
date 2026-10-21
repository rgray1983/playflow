"use client";

import StaffName from "@/components/StaffName";
import Register from "@/components/counter/Register";

export default function POSPage() {
  return <>

      <section className="pos-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        <header className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#8A6D3B]">Point of Sale</p><h1 className="text-2xl font-semibold tracking-tight">POS</h1></div><div className="text-sm font-semibold"><StaffName/></div></header>

        <Register/>
      </section>

  </>;
}
