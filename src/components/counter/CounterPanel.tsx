"use client";
import { useEffect, useRef, useState } from "react";
import SigningDialog from "@/components/forms/SigningDialog";
import ReceiptView from "./ReceiptView";
import { saleLabel, dollars, paidCents, type CounterReceipt } from "@/lib/counter/receipt";
import type { CounterQuote } from "@/lib/counter/quote";
import type { DeskFamily } from "@/components/check-in/types";
type Plan = {
    id: string;
    name: string;
    price: number;
    visitLimit: number | null;
    durationDays: number | null;
    billingInterval: string;
};
type Overview = {
    sales: CounterReceipt[];
    hasMore: boolean;
    page: number;
    unbilled: {
        id: string;
        checkedInAt: string;
        visitType: string;
        admissionSnapshot: {
            listedPrice: number;
        };
        child: {
            firstName: string;
            lastName: string;
        };
    }[];
    moreUnbilled: boolean;
    plans: Plan[];
    paymentMethods: {
        key: string;
        label: string;
        requiresNote: boolean;
    }[];
    allowPartialPayments: boolean;
};
const button = "rounded-lg bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40";
async function post(body: object) { const response = await fetch("/api/counter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok)
    throw new Error(result.error || "Unable to save."); return result; }
export default function CounterPanel({ family, refreshKey, onChanged, initiallyOpen = false }: {
    family: DeskFamily;
    refreshKey: number;
    initiallyOpen?: boolean;
    onChanged: () => Promise<void>;
}) {
    const [open, setOpen] = useState(initiallyOpen), [data, setData] = useState<Overview | null>(null), [page, setPage] = useState(1), [reload, setReload] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [selected, setSelected] = useState<string[]>([]), [view, setView] = useState<CounterReceipt | null>(null), [pay, setPay] = useState<CounterReceipt | null>(null), [voiding, setVoiding] = useState<CounterReceipt | null>(null), [reason, setReason] = useState("");
    const [amount, setAmount] = useState(""), [method, setMethod] = useState("cash"), [notes, setNotes] = useState(""), [collected, setCollected] = useState(false), [enrolling, setEnrolling] = useState(false), [planId, setPlanId] = useState(""), [childId, setChildId] = useState(""), [quote, setQuote] = useState<{
        quote: CounterQuote;
        quoteHash: string;
    } | null>(null);
    const paymentRequest = useRef(""), billRequest = useRef(""), enrollRequest = useRef("");
    useEffect(() => { if (!open)
        return; const controller = new AbortController(); fetch(`/api/counter?familyId=${encodeURIComponent(family.id)}&page=${page}`, { cache: "no-store", signal: controller.signal }).then(async (response) => { const result = await response.json(); if (!response.ok)
        throw new Error(result.error || "Unable to load sales."); return result as Overview; }).then(setData).catch(error => { if (!controller.signal.aborted)
        setError(error.message); }); return () => controller.abort(); }, [family.id, page, open, reload, refreshKey]);
    function refresh() { setSelected([]); billRequest.current = ""; setReload(n => n + 1); }
    async function run(action: () => Promise<void>) { setBusy(true); setError(""); setNotice(""); try {
        await action();
    }
    catch (error) {
        setError(error instanceof Error ? error.message : "Unable to save.");
    }
    finally {
        setBusy(false);
    } }
    async function bill() { await run(async () => { if (!billRequest.current)
        billRequest.current = crypto.randomUUID(); await post({ action: "bill-admissions", familyId: family.id, visitIds: selected, requestId: billRequest.current }); setNotice("Admission bill saved. Review its total before recording payment."); refresh(); await onChanged(); }); }
    function startPay(sale: CounterReceipt) { setPay(sale); setError(""); setAmount(((sale.totalCents - paidCents(sale)) / 100).toFixed(2)); setMethod(data?.paymentMethods[0]?.key ?? ""); setNotes(""); setCollected(false); paymentRequest.current = ""; }
    function paymentChanged() { paymentRequest.current = ""; setCollected(false); }
    async function record() { await run(async () => { if (!/^\d{1,6}(\.\d{1,2})?$/.test(amount))
        throw new Error("Enter an amount with no more than two decimals."); if (!paymentRequest.current)
        paymentRequest.current = crypto.randomUUID(); const result = await post({ action: "payment", saleId: pay!.id, requestId: paymentRequest.current, amountCents: Math.round(Number(amount) * 100), method, notes, collectedAcknowledged: collected }); setNotice(result.replayed ? "This payment was already saved." : "Payment recorded. A paid membership is now available for check-in."); setPay(null); refresh(); await onChanged(); }); }
    function changePlan(id: string) { setPlanId(id); setQuote(null); enrollRequest.current = ""; }
    async function reviewPlan() { await run(async () => { const result = await post({ action: "quote-membership", familyId: family.id, planId, childId: childId || null }); setQuote(result); enrollRequest.current = ""; }); }
    async function enroll() { await run(async () => { if (!enrollRequest.current)
        enrollRequest.current = crypto.randomUUID(); await post({ action: "enroll", familyId: family.id, planId, childId: childId || null, quoteHash: quote!.quoteHash, requestId: enrollRequest.current }); setEnrolling(false); setQuote(null); setNotice("Enrollment saved. It becomes active when the bill is fully paid. Zero-total plans activate immediately."); refresh(); await onChanged(); }); }
    const chosenPlan = data?.plans.find(p => p.id === planId);
    return <details open={open} className="rounded-lg border p-4" onToggle={e => setOpen(e.currentTarget.open)}><summary className="cursor-pointer font-semibold">Family sales, payments & memberships</summary>{open && <div className="mt-4 space-y-4">{error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={() => setReload(n => n + 1)} className="underline">Refresh records</button></p>}{notice && <p role="status" className="text-sm text-green-800">{notice}</p>}{!data ? <p>Loading family sales…</p> : <><p className="text-sm text-gray-600">Record money already collected in cash or on an external terminal. This does not charge Square.</p><button type="button" disabled={busy} onClick={() => { setEnrolling(true); setQuote(null); setError(""); changePlan(data.plans[0]?.id ?? ""); setChildId(""); }} className={button}>Enroll membership / visit pack</button>
 {!!data.unbilled.length && <section className="space-y-3 rounded-lg bg-amber-50 p-4"><h4 className="font-semibold">Admission visits not yet billed</h4>{data.unbilled.map(v => <label key={v.id} className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={selected.includes(v.id)} onChange={e => { billRequest.current = ""; setSelected(ids => e.target.checked ? [...ids, v.id] : ids.filter(id => id !== v.id)); }}/><span>{v.child.firstName} {v.child.lastName} · {v.visitType} · {dollars(Math.round(v.admissionSnapshot.listedPrice * 100))}<span className="block text-xs">{new Date(v.checkedInAt).toLocaleString("en-US", { timeZone: "America/New_York" })}</span></span></label>)}{data.moreUnbilled && <p className="text-xs">First 50 visits shown. Bill these to see older entries.</p>}<button type="button" disabled={busy || !selected.length || selected.length > 20} onClick={bill} className={button}>Create bill for selected visits</button><p className="text-xs">Up to 20 visits per bill. Configured taxes and fees are added once per bill. Creating a bill does not record payment.</p></section>}
 {!data.sales.length && <p className="text-sm">No saved bills yet.</p>}{data.sales.map(sale => <article key={sale.id} className="space-y-2 rounded-lg border p-4 text-sm"><p className="font-semibold">{saleLabel(sale.kind)} · {sale.status} · {dollars(sale.totalCents)}</p><p>{sale.quoteSnapshot.lines.map(l => l.label).join(", ")}</p><p>{sale.status === "VOID" ? "Voided" : `Paid ${dollars(paidCents(sale))} · Due ${dollars(sale.totalCents - paidCents(sale))}`}</p><div className="flex flex-wrap gap-4"><button type="button" disabled={busy} onClick={() => setView(sale)} className="underline">View bill / receipt</button>{sale.status === "OPEN" && <button type="button" disabled={busy} onClick={() => startPay(sale)} className="font-semibold underline">Record collected payment</button>}{sale.status === "OPEN" && !sale.payments.length && <button type="button" disabled={busy} onClick={() => { setVoiding(sale); setReason(""); setError(""); }} className="underline">Void unpaid bill</button>}</div></article>)}<div className="flex justify-between text-sm"><button type="button" className="underline disabled:opacity-40" disabled={busy || page === 1} onClick={() => { setData(null); setPage(n => n - 1); }}>Previous</button><span>Page {page}</span><button type="button" className="underline disabled:opacity-40" disabled={busy || !data.hasMore} onClick={() => { setData(null); setPage(n => n + 1); }}>Next</button></div></>}
 </div>}
 {view && <SigningDialog title="Bill / receipt" busy={false} onClose={() => setView(null)}><ReceiptView sale={view}/></SigningDialog>}
 {pay && <SigningDialog title="Record collected payment" busy={busy} onClose={() => setPay(null)}><form className="space-y-4" onSubmit={e => { e.preventDefault(); record(); }}><ReceiptView sale={pay}/>{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block text-sm font-semibold">Amount collected (USD)<input required inputMode="decimal" value={amount} disabled={busy || !data?.allowPartialPayments} onChange={e => { setAmount(e.target.value); paymentChanged(); }} className="mt-2 block w-full rounded-lg border p-3"/></label><label className="block text-sm font-semibold">Payment method<select value={method} disabled={busy} onChange={e => { setMethod(e.target.value); paymentChanged(); }} className="mt-2 block w-full rounded-lg border p-3">{data?.paymentMethods.map(m => <option key={m.key} value={m.key}>{m.key === "card" ? `${m.label} — collected on external terminal` : m.label}</option>)}</select></label><label className="block text-sm font-semibold">Receipt reference / notes (no card details)<textarea maxLength={2000} value={notes} disabled={busy} onChange={e => { setNotes(e.target.value); paymentChanged(); }} className="mt-2 block w-full rounded-lg border p-3"/></label><label className="flex gap-3 text-sm"><input type="checkbox" disabled={busy} checked={collected} onChange={e => setCollected(e.target.checked)}/><span>I confirm this money has already been collected. This button only records the payment.</span></label><button disabled={busy || !collected || !method} className={button}>{busy ? "Saving…" : "Record payment"}</button></form></SigningDialog>}
 {enrolling && <SigningDialog title="Enroll membership / visit pack" busy={busy} onClose={() => setEnrolling(false)}><div className="space-y-4">{error && <p role="alert" className="text-red-700">{error}</p>}{!data?.plans.length ? <p>Create an active membership plan in Company Settings first.</p> : <><label className="block text-sm font-semibold">Plan<select value={planId} disabled={busy} onChange={e => changePlan(e.target.value)} className="mt-2 block w-full rounded-lg border p-3">{data.plans.map(p => <option key={p.id} value={p.id}>{p.name} · {dollars(Math.round(p.price * 100))}</option>)}</select></label><label className="block text-sm font-semibold">Coverage<select value={childId} disabled={busy} onChange={e => { setChildId(e.target.value); setQuote(null); enrollRequest.current = ""; }} className="mt-2 block w-full rounded-lg border p-3"><option value="">Shared by this family’s children</option>{family.children.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></label>{chosenPlan && <p className="text-sm">{chosenPlan.visitLimit === null ? "Unlimited visits" : `${chosenPlan.visitLimit} child visits total`}. {chosenPlan.durationDays ? `${chosenPlan.durationDays} days from activation` : chosenPlan.billingInterval === "MONTHLY" ? "One calendar month from activation" : chosenPlan.billingInterval === "YEARLY" ? "One calendar year from activation" : "No automatic expiry"}. Each child uses one visit from a shared pack. No automatic renewal or recurring card charge.</p>}<button type="button" disabled={busy || !planId} onClick={reviewPlan} className="rounded-lg border px-4 py-3 font-semibold">Review total</button>{quote && <section className="space-y-3 rounded-lg bg-gray-50 p-4"><p>Items: {dollars(quote.quote.subtotalCents)} · Fees: {dollars(quote.quote.feeCents)} · Added tax: {dollars(quote.quote.taxCents)}</p><p className="font-semibold">Total: {dollars(quote.quote.totalCents)}</p><p className="text-sm">Starts when fully paid. A free plan starts immediately. Saved terms and visit limits are preserved if the plan is edited later.</p><button type="button" disabled={busy} onClick={enroll} className={button}>Save enrollment & bill</button></section>}</>}</div></SigningDialog>}
 {voiding && <SigningDialog title="Void unpaid bill" busy={busy} onClose={() => setVoiding(null)}><form className="space-y-4" onSubmit={e => { e.preventDefault(); run(async () => { await post({ action: "void", saleId: voiding.id, reason }); setVoiding(null); refresh(); setNotice("Unpaid bill voided. Any admission visits can be billed again; pending enrollment is cancelled."); await onChanged(); }); }}><p>Only a bill with no recorded payments can be voided. This does not refund money.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block font-semibold">Reason<textarea required maxLength={1000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} className="mt-2 block w-full rounded-lg border p-3"/></label><button disabled={busy || !reason.trim()} className={button}>Void unpaid bill</button></form></SigningDialog>}
 </details>;
}
