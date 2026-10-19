"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SigningDialog from "@/components/forms/SigningDialog";
import CounterPanel from "./CounterPanel";
import ReceiptView from "./ReceiptView";
import {addCheckoutSale,checkoutSummary} from "@/lib/counter/basket";
import { registerKey } from "@/lib/counter/register-input";
import { dollars, paidCents, type CounterReceipt } from "@/lib/counter/receipt";
import type { DeskFamily, DeskSearchResult } from "@/components/check-in/types";

type Overview = {
  sales: CounterReceipt[]; hasMore: boolean;
  unbilled: { id: string; visitType: string; admissionSnapshot: { listedPrice: number }; child: { firstName: string; lastName: string } }[];
  paymentMethods: { key: string; label: string; requiresNote: boolean }[];
  allowPartialPayments: boolean; allowSplitPayments: boolean;
};
const dark = "rounded-xl bg-[#1E293B] px-4 py-3 font-semibold text-white disabled:opacity-40";
const categories = ["Open sales", "Admissions", "Memberships"];
async function post(body: object) {
  const response = await fetch("/api/counter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to save.");
  return result;
}

export default function Register() {
  const [family, setFamily] = useState<DeskFamily | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [cart, setCart] = useState<CounterReceipt[]>([]);
  const sale = checkoutSummary(cart);
  const [category, setCategory] = useState("Open sales");
  const [familyOpen, setFamilyOpen] = useState(false), [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState(""), [results, setResults] = useState<DeskSearchResult[]>([]), [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [amount, setAmount] = useState(""), [method, setMethod] = useState("cash"), [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false), [collected, setCollected] = useState(false);
  const [receipt, setReceipt] = useState<CounterReceipt | null>(null);
  const replaceEntry = useRef(true);
  const selectedFamily = useRef(""), paymentId = useRef(""), billRequest = useRef<{ visit: string; id: string } | null>(null);

  useEffect(() => {
    if (!familyOpen || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/check-in?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" }).then(async r => {
        const result = await r.json(); if (!r.ok) throw new Error(result.error || "Search failed."); return result.families;
      }).then(result => { setResults(result); setSearching(false); }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setSearching(false); } });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, familyOpen]);

  async function load(id: string) {
    const [familyResponse, salesResponse] = await Promise.all([
      fetch(`/api/check-in?familyId=${encodeURIComponent(id)}`, { cache: "no-store" }),
      fetch(`/api/counter?familyId=${encodeURIComponent(id)}`, { cache: "no-store" }),
    ]);
    const [f, d] = await Promise.all([familyResponse.json(), salesResponse.json()]);
    if (!familyResponse.ok || !salesResponse.ok) throw new Error(f.error || d.error || "Unable to load the family.");
    if (selectedFamily.current === id) { setFamily(f.family); setData(d); }
    return d as Overview;
  }
  function updateCart(next: CounterReceipt[]) {
    const summary=checkoutSummary(next);
    replaceEntry.current=true;setCart(next);
    setAmount(summary?((summary.totalCents-paidCents(summary))/100).toFixed(2):"");
    setNotes("");setCollected(false);paymentId.current="";setError("");
  }
  function toggleSale(next:CounterReceipt){
    updateCart(cart.some(s=>s.id===next.id)?cart.filter(s=>s.id!==next.id):addCheckoutSale(cart,next));
  }
  async function choose(id: string) {
    selectedFamily.current = id; setBusy(true); setError("");
    try { const d = await load(id); updateCart([]); setMethod(d.paymentMethods[0]?.key ?? ""); setFamilyOpen(false); setNotice(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load family."); }
    finally { setBusy(false); }
  }
  async function refresh() {
    if (!family) return;
    const d = await load(family.id);
    updateCart(cart.map(s=>d.sales.find(current=>current.id===s.id)??s).filter(s=>s.status==="OPEN"));
  }
  async function addVisit(id: string) {
    if (!family) return;
    setBusy(true); setError("");
    if (billRequest.current?.visit !== id) billRequest.current = { visit: id, id: crypto.randomUUID() };
    try {
      const result = await post({ action: "bill-admissions", familyId: family.id, visitIds: [id], requestId: billRequest.current.id });
      const d = await load(family.id); const added=d.sales.find(s=>s.id===result.saleId); if(added)updateCart(addCheckoutSale(cart,added)); billRequest.current = null;
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to add admission."); }
    finally { setBusy(false); }
  }
  function editAmount(value: string) {
    if (/^\d{0,7}(\.\d{0,2})?$/.test(value)) { replaceEntry.current = false; setAmount(value); paymentId.current = ""; setCollected(false); }
  }
  function press(key: string) {
    editAmount(registerKey(amount, key, replaceEntry.current));
  }
  const due = sale ? Math.max(0, sale.totalCents - paidCents(sale)) : 0;
  const amountCents = /^\d+(\.\d{1,2})?$/.test(amount) ? Math.round(Number(amount) * 100) : 0;
  const canPay = cart.length<=20 && !!sale && sale.status === "OPEN" && amountCents > 0 && amountCents <= due && !!method && (data?.allowPartialPayments || amountCents === due);
  const visibleSales = data?.sales.filter(s => s.status === "OPEN" && (category === "Open sales" || s.kind === (category === "Memberships" ? "MEMBERSHIP" : "ADMISSION"))) ?? [];

  async function pay() {
    if (!sale || !canPay || !collected || !family) return;
    setBusy(true); setError("");
    if (!paymentId.current) paymentId.current = crypto.randomUUID();
    try {
      const reference=paymentId.current;
      const result=await post({ action: "checkout-payment", familyId:family.id, bills:cart.map(s=>({id:s.id,dueCents:s.totalCents-paidCents(s)})), amountCents, method, notes, requestId: reference, collectedAcknowledged: true });
      // The successful response is durable even if refreshing the screen fails.
      setConfirming(false); setNotice("Payment recorded. Refresh or open receipts to view the updated balance.");
      const receipts=result.receipts as CounterReceipt[];
      updateCart(receipts.filter(s=>s.status==="OPEN"));
      setReceipt(checkoutSummary(receipts,`checkout-${reference}`));
      await load(family.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save. Retry the same payment."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => { setError(""); setFamilyOpen(true); }} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold">{family ? family.name : "Select customer / family"} <span aria-hidden="true">⌄</span></button>
        <button disabled={busy || !family} onClick={() => { setError(""); setHistoryOpen(true); }} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40">Family history & memberships</button>
      </div>
      <Link href="/check-in" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold">+ Admission / check-in</Link>
    </div>
    {error && <p role="alert" className="mb-3 rounded-xl bg-white p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mb-3 rounded-xl bg-white p-3 text-sm text-green-800">{notice}</p>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="min-w-0 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 p-5"><div><p className="text-sm text-gray-500">Products & Services</p><h2 className="mt-1 text-xl font-semibold">General Checkout</h2></div><button disabled={busy || !family} onClick={() => refresh().catch(e => setError(e.message))} className="rounded-lg bg-[#F6F0E6] px-4 py-3 text-sm font-semibold disabled:opacity-40">Refresh</button></div>
        <div className="public-scroll max-h-[70dvh] space-y-5 overflow-y-auto p-5">
          <div className="rounded-xl bg-[#F6F0E6] p-4 text-sm"><p className="font-semibold">Select the children / sales to add to this checkout</p><p className="mt-2 text-gray-600">Admission bills come from check-in. Memberships and receipts are available in the family panel.</p></div>
          <div className="flex flex-wrap gap-2">{categories.map(c => <button key={c} disabled={busy} onClick={() => setCategory(c)} className={`rounded-lg px-4 py-3 text-sm font-semibold ${category === c ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6]"}`}>{c}</button>)}</div>
          {!family ? <button onClick={() => setFamilyOpen(true)} className="w-full rounded-xl border border-dashed p-8 text-center font-semibold">Choose a family to see their open sales</button> : <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">{visibleSales.map(s => <button key={s.id} disabled={busy} aria-pressed={cart.some(item=>item.id===s.id)} onClick={() => toggleSale(s)} className={`min-h-36 rounded-xl border p-4 text-left ${cart.some(item=>item.id===s.id) ? "border-[#20B8A8] bg-[#E8F8F5] ring-1 ring-[#20B8A8]" : "border-black/10 bg-[#F6F0E6]"}`}><span className="block text-sm font-semibold">{s.quoteSnapshot.lines.map(l => l.label).join(", ")}</span><span className="mt-2 block text-xs text-gray-500">{s.kind === "MEMBERSHIP" ? "Membership / visit pack" : "Admission"}</span><span className="mt-4 block text-xl font-semibold">{dollars(s.totalCents - paidCents(s))}</span><span className="mt-2 block text-xs font-semibold">{cart.some(item=>item.id===s.id)?"✓ Added to checkout · tap to remove":"+ Add to checkout"}</span></button>)}</div>
            {!visibleSales.length && <p className="py-5 text-sm text-gray-600">No open sales in this category.</p>}
            {data?.hasMore && <button onClick={() => setHistoryOpen(true)} className="text-sm underline">View older sales in family history</button>}
            {category !== "Memberships" && !!data?.unbilled.length && <section className="space-y-3"><h3 className="font-semibold">Admissions ready to bill</h3><div className="grid gap-3 sm:grid-cols-2">{data.unbilled.map(v => <button key={v.id} disabled={busy} onClick={() => addVisit(v.id)} className="rounded-xl border bg-[#F6F0E6] p-4 text-left"><strong className="block text-sm">{v.child.firstName} {v.child.lastName} · {v.visitType}</strong><span className="mt-2 block text-sm">{dollars(Math.round(v.admissionSnapshot.listedPrice * 100))} before configured tax / fees</span><span className="mt-3 block text-sm font-semibold">+ Add to checkout</span></button>)}</div></section>}
            {category === "Memberships" && <button onClick={() => setHistoryOpen(true)} className={dark}>+ Enroll membership / visit pack</button>}
          </>}
        </div>
      </section>
      <aside className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-semibold">Checkout</h2><p className="mt-1 max-w-60 truncate text-xs text-gray-500">{sale ? `Order: ${sale.id}` : "No sale selected"}</p></div><button disabled={busy} onClick={() => updateCart([])} className="rounded-lg bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Clear</button></div>
        <div className="space-y-4 p-4">
          <div className="public-scroll max-h-48 space-y-3 overflow-y-auto"><h3 className="text-sm font-semibold">Ordered Items{cart.length?` · ${cart.length} selected ${cart.length===1?"sale":"sales"}`:""}</h3>{sale ? cart.map(item=><div key={item.id} className="space-y-2 border-b pb-3">{item.quoteSnapshot.lines.map(l => <div key={l.id} className="flex justify-between gap-3 text-sm"><span><strong className="mr-2">1×</strong>{l.label}</span><span className="shrink-0 font-semibold">{dollars(l.priceCents)}</span></div>)}<button disabled={busy} onClick={()=>updateCart(cart.filter(s=>s.id!==item.id))} className="text-xs font-semibold text-rose-800 underline">Remove from checkout</button></div>) : <p className="rounded-lg border border-dashed bg-[#F6F0E6] p-5 text-center text-sm text-gray-500">Cart is empty. Select one or more children / sales to begin.</p>}</div>
          <dl className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{dollars(sale?.quoteSnapshot.subtotalCents ?? 0)}</dd></div><div className="flex justify-between"><dt>Fees</dt><dd>{dollars(sale?.quoteSnapshot.feeCents ?? 0)}</dd></div><div className="flex justify-between"><dt>Added tax</dt><dd>{dollars(sale?.quoteSnapshot.taxCents ?? 0)}</dd></div>{!!sale?.quoteSnapshot.includedTaxCents && <div className="flex justify-between"><dt>Tax included</dt><dd>{dollars(sale.quoteSnapshot.includedTaxCents)}</dd></div>}{!!sale && paidCents(sale) > 0 && <div className="flex justify-between"><dt>Already paid</dt><dd>{dollars(paidCents(sale))}</dd></div>}<div className="flex items-center justify-between border-t pt-3"><dt className="font-semibold">Total Payable</dt><dd className="text-3xl font-semibold tracking-tight">{dollars(due)}</dd></div></dl>
          <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-semibold">Payment Method</legend><div className="grid grid-cols-3 gap-2">{(data?.paymentMethods ?? [{ key: "cash", label: "Cash" }, { key: "card", label: "Card" }]).map(m => <button key={m.key} type="button" aria-pressed={method === m.key} onClick={() => { setMethod(m.key); paymentId.current = ""; }} className={`rounded-xl border px-2 py-3 text-sm font-semibold ${method === m.key ? "border-[#20B8A8] bg-[#E8F8F5]" : "border-black/10 bg-[#F6F0E6]"}`}><span className="mb-1 block text-lg" aria-hidden="true">{m.key === "cash" ? "💵" : m.key === "card" ? "💳" : "⇄"}</span>{m.label}</button>)}{data?.allowPartialPayments && data.allowSplitPayments && <button type="button" onClick={() => { editAmount(""); setNotice("Split payment: enter the first amount and payment method. After recording it, pay the remaining balance with the next method."); }} className="rounded-xl border border-[#B99AFF] bg-[#EEE7FF] px-2 py-3 text-sm font-semibold">⇄ Split</button>}</div></fieldset>
          <label className="block text-sm font-semibold">Payment amount (USD)<input inputMode="decimal" aria-label="Payment amount in dollars" disabled={busy || !!data && !data.allowPartialPayments} value={amount} onChange={e => editAmount(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#F6F0E6] px-4 py-3 text-right text-2xl font-semibold" placeholder="0.00"/></label>
          <div className="grid grid-cols-3 gap-2" aria-label="Onscreen number pad">{["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "Backspace"].map(key => <button key={key} aria-label={key === "Backspace" ? "Delete last digit" : key === "." ? "Decimal point" : key} disabled={busy || !!data && !data.allowPartialPayments} onClick={() => press(key)} className="rounded-xl bg-[#1E293B] py-3 text-xl font-semibold text-white hover:bg-[#334155] disabled:opacity-40">{key === "Backspace" ? "⌫" : key}</button>)}</div>
          <div className="flex gap-2"><button disabled={busy} onClick={() => editAmount((due / 100).toFixed(2))} className="flex-1 rounded-lg bg-[#F6F0E6] py-2 text-sm font-semibold">Exact amount</button><button disabled={busy || !!data && !data.allowPartialPayments} onClick={() => press("Clear")} className="flex-1 rounded-lg bg-[#F6F0E6] py-2 text-sm font-semibold">Clear amount</button></div>
          {cart.length>20 && <p className="text-sm text-red-700">Select up to 20 bills per checkout.</p>}
          {amountCents > due && sale && <p className="text-sm text-red-700">Amount exceeds the balance. Enter the amount to apply, excluding cash change.</p>}
          <button disabled={busy || !canPay} onClick={() => { setCollected(false); setError(""); setConfirming(true); }} className="w-full rounded-xl bg-[#20B8A8] px-4 py-4 text-lg font-semibold text-white shadow-sm disabled:opacity-40">{busy ? "Saving…" : `Pay ${dollars(amountCents)}`}</button>
          <p className="text-xs text-gray-500">Cash or payment collected on an external terminal. Square charging is not connected yet.</p>
        </div>
      </aside>
    </div>
    {familyOpen && <SigningDialog title="Select customer / family" busy={busy} onClose={() => setFamilyOpen(false)}><div className="space-y-4">{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block text-sm font-semibold">Name, email, or last four phone digits<input autoFocus value={query} maxLength={254} onChange={e => { setQuery(e.target.value); setResults([]); setSearching(e.target.value.trim().length >= 2); }} className="mt-2 w-full rounded-xl border p-3"/></label>{searching && <p>Searching…</p>}{!searching && query.trim().length >= 2 && !results.length && <p>No active families found.</p>}{results.map(f => <button key={f.id} disabled={busy} onClick={() => choose(f.id)} className="block w-full rounded-xl border p-4 text-left"><strong>{f.name}</strong>{f.parents.map((p, i) => <span key={i} className="mt-1 block text-sm text-gray-500">{p.firstName} {p.lastName} · {p.phone}</span>)}</button>)}</div></SigningDialog>}
    {historyOpen && family && <SigningDialog title={`${family.name} · History & memberships`} busy={false} onClose={() => { setHistoryOpen(false); refresh().catch(e => setError(e.message)); }}><CounterPanel key={family.id} family={family} refreshKey={0} initiallyOpen onChanged={async () => { await refresh(); }}/></SigningDialog>}
    {confirming && sale && <SigningDialog title="Confirm payment" busy={busy} onClose={() => setConfirming(false)}><form className="space-y-5" onSubmit={e => { e.preventDefault(); pay(); }}><p className="text-3xl font-semibold">{dollars(amountCents)} · {data?.paymentMethods.find(m => m.key === method)?.label}</p><p className="text-sm">{family?.name} · Remaining after this payment: {dollars(due - amountCents)}</p>{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block text-sm font-semibold">Receipt reference / notes (no card details)<textarea maxLength={2000} value={notes} disabled={busy} onChange={e => { setNotes(e.target.value); paymentId.current = ""; setCollected(false); }} className="mt-2 w-full rounded-xl border p-3"/></label><label className="flex items-start gap-3 text-sm"><input required type="checkbox" checked={collected} disabled={busy} onChange={e => setCollected(e.target.checked)}/><span>I confirm this money has already been collected {method === "card" ? "on the external terminal" : "from the customer"}. This records the payment.</span></label><button disabled={busy || !collected} className="w-full rounded-xl bg-[#20B8A8] p-4 font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Confirm payment"}</button></form></SigningDialog>}
    {receipt && <SigningDialog title="Payment receipt" busy={false} onClose={() => setReceipt(null)}><ReceiptView sale={receipt}/></SigningDialog>}
  </>;
}
