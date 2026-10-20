"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SigningDialog from "@/components/forms/SigningDialog";
import PendingSquarePayments from "./PendingSquarePayments";
import SquareCardPayment from "./SquareCardPayment";
import PaymentControls from "./PaymentControls";
import CounterPanel from "./CounterPanel";
import type {ProductEntry,CustomEntry} from "@/lib/counter/products";
import type {CounterQuote} from "@/lib/counter/quote";
import ProductManager,{type CounterProduct} from "./ProductManager";
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
const categories = ["Open sales", "Admissions", "Memberships", "Snacks & Retail"];
async function post(body: object) {
  const response = await fetch("/api/counter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to save.");
  return result;
}

export default function Register({initialFamilyId, initialSaleId, onChanged, onBusyChange}: {initialFamilyId?:string;initialSaleId?:string;onChanged?:()=>void;onBusyChange?:(busy:boolean)=>void} = {}) {
  const [mobileView,setMobileView]=useState<"products"|"order"|"payment">(initialSaleId?"payment":"products");
  const [squareOpen,setSquareOpen]=useState(false);
  const [family, setFamily] = useState<DeskFamily | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [cart, setCart] = useState<CounterReceipt[]>([]);
  const sale = checkoutSummary(cart);
  const [products,setProducts]=useState<CounterProduct[]>([]),[canManage,setCanManage]=useState(false),[manageOpen,setManageOpen]=useState(false);
  const [draft,setDraft]=useState<{products:ProductEntry[];custom:CustomEntry[]}>({products:[],custom:[]});
  const [draftQuote,setDraftQuote]=useState<{quote:CounterQuote;quoteHash:string}|null>(null),[quoteLoading,setQuoteLoading]=useState(false);
  const [customOpen,setCustomOpen]=useState(false),[customName,setCustomName]=useState("Custom Charge"),[customAmount,setCustomAmount]=useState(""),[customProfile,setCustomProfile]=useState("services");
  const draftRequest=useRef("");
  const hasDraft=draft.products.length+draft.custom.length>0;
  const [category, setCategory] = useState("Open sales");
  const [familyOpen, setFamilyOpen] = useState(false), [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState(""), [results, setResults] = useState<DeskSearchResult[]>([]), [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [amount, setAmount] = useState(""), [method, setMethod] = useState("cash"), [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false), [collected, setCollected] = useState(false);
  const [receipt, setReceipt] = useState<CounterReceipt | null>(null);
  const replaceEntry = useRef(true);
  const selectedFamily = useRef(""), paymentId = useRef(""), billRequest = useRef<{ visit: string; id: string } | null>(null);

  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (!initialFamilyId) return;
    const controller = new AbortController();
    selectedFamily.current = initialFamilyId;
    Promise.all([
      fetch(`/api/check-in?familyId=${encodeURIComponent(initialFamilyId)}`, {cache:"no-store",signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load family.");return d;}),
      fetch(`/api/counter?familyId=${encodeURIComponent(initialFamilyId)}`, {cache:"no-store",signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load bills.");return d as Overview;}),
    ]).then(([f,d])=>{setFamily(f.family);setData(d);setMethod(d.paymentMethods[0]?.key??"");const bills=d.sales.filter(s=>s.status==="OPEN"&&(!initialSaleId||s.id===initialSaleId));setCart(bills);const summary=checkoutSummary(bills);setAmount(((summary?summary.totalCents-paidCents(summary):0)/100).toFixed(2));}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return ()=>controller.abort();
  }, [initialFamilyId,initialSaleId]);
  async function loadCatalog(){
    const response=await fetch("/api/counter/catalog",{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load products.");setProducts(result.products);setCanManage(result.canManage);
  }
  useEffect(()=>{const controller=new AbortController();fetch("/api/counter/catalog",{cache:"no-store",signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load products.");return result;}).then(result=>{setProducts(result.products);setCanManage(result.canManage);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[]);
  useEffect(()=>{
    if(!draft.products.length&&!draft.custom.length)return;
    const controller=new AbortController();
    fetch("/api/counter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"quote-cart",...draft}),signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to calculate total.");return result;}).then(result=>{replaceEntry.current=true;setDraftQuote(result);setQuoteLoading(false);const summary=checkoutSummary(cart);setAmount(((result.quote.totalCents+(summary?summary.totalCents-paidCents(summary):0))/100).toFixed(2));}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setQuoteLoading(false);}});
    return()=>controller.abort();
  },[draft,cart,products]);
  function changeDraft(next:typeof draft){replaceEntry.current=true;setDraft(next);setDraftQuote(null);setQuoteLoading(!!(next.products.length+next.custom.length));draftRequest.current="";paymentId.current="";setError("");if(!next.products.length&&!next.custom.length)setAmount((sale?(sale.totalCents-paidCents(sale))/100:0).toFixed(2));}
  function productQuantity(id:string,quantity:number){changeDraft({...draft,products:[...draft.products.filter(p=>p.productId!==id),...(quantity>0?[{productId:id,quantity:Math.min(99,quantity)}]:[])]});}
  async function preparePayment(channel:"manual"|"square"="manual"){
    if(!family)return;
    if(!hasDraft){setCollected(false);setError("");if(channel==="square")setSquareOpen(true);else setConfirming(true);return;}
    if(!draftQuote)return;setBusy(true);setError("");if(!draftRequest.current)draftRequest.current=crypto.randomUUID();
    try{const result=await post({action:"create-cart",familyId:family.id,...draft,quoteHash:draftQuote.quoteHash,requestId:draftRequest.current});const created=result.receipt as CounterReceipt;const previousAmount=amount;const next=addCheckoutSale(cart,created);setDraft({products:[],custom:[]});setDraftQuote(null);setQuoteLoading(false);draftRequest.current="";updateCart(next);editAmount(previousAmount);if(created.status==="PAID"&&!next.length){setReceipt(created);setNotice("Zero-total sale saved. No payment collected.");}else{setCollected(false);if(channel==="square")setSquareOpen(true);else setConfirming(true);}await load(family.id);}catch(e){setError(e instanceof Error?e.message:"Unable to save checkout.");}finally{setBusy(false);}
  }
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
    setAmount((((summary?summary.totalCents-paidCents(summary):0)+(draftQuote?.quote.totalCents??0))/100).toFixed(2));
    setNotes("");setCollected(false);paymentId.current="";setError("");
  }
  function toggleSale(next:CounterReceipt){
    updateCart(cart.some(s=>s.id===next.id)?cart.filter(s=>s.id!==next.id):addCheckoutSale(cart,next));
  }
  async function choose(id: string) {
    selectedFamily.current = id; setBusy(true); setError("");
    try { const d = await load(id); setDraft({products:[],custom:[]});setDraftQuote(null);setQuoteLoading(false);draftRequest.current="";updateCart([]); setMethod(d.paymentMethods[0]?.key ?? ""); setFamilyOpen(false); setNotice(""); }
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
  const due = (sale ? Math.max(0, sale.totalCents - paidCents(sale)) : 0)+(draftQuote?.quote.totalCents??0);
  const amountCents = /^\d+(\.\d{1,2})?$/.test(amount) ? Math.round(Number(amount) * 100) : 0;
  const canPay = !!family && !quoteLoading && (!hasDraft||!!draftQuote) && cart.length+(hasDraft?1:0)<=20 && (!!sale||hasDraft) && (!sale||sale.status === "OPEN") && amountCents > 0 && amountCents <= due && !!method && (data?.allowPartialPayments || amountCents === due);
  const visibleSales = data?.sales.filter(s => s.status === "OPEN" && (category === "Open sales" || s.kind === (category === "Memberships" ? "MEMBERSHIP" : category === "Snacks & Retail" ? "RETAIL" : "ADMISSION"))) ?? [];

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
      onChanged?.();
      await load(family.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save. Retry the same payment."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="counter-register" data-view={mobileView}>
    <div className="register-toolbar flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => { setError(""); setFamilyOpen(true); }} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold">{family ? family.name : "Select customer / family"} <span aria-hidden="true">⌄</span></button>
        <button disabled={busy || !family} onClick={() => { setError(""); setHistoryOpen(true); }} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40">Family history & memberships</button>
      </div>
      <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>{setCustomName("Custom Charge");setCustomAmount("");setCustomProfile("services");setCustomOpen(true);}} className="rounded-xl bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white">+ Custom Charge</button><Link href="/check-in" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold">+ Admission / check-in</Link></div>
    </div>
    {error && <p role="alert" className="register-banner rounded-xl bg-white p-2 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="register-banner rounded-xl bg-white p-2 text-sm text-green-800">{notice}</p>}
    <nav aria-label="Checkout view" className="register-mobile-tabs">{([['products','Products'],['order','Order'],['payment','Payment']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={mobileView===key} onClick={()=>setMobileView(key)} className={mobileView===key?"bg-[#1E293B] text-white":"bg-[#F6F0E6]"}>{label}</button>)}</nav>
    <div className="register-panes">
      <section aria-label="Products and services" className="register-catalog register-pane rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/10 p-3"><div><h2 className="text-lg font-semibold">Products & Services</h2></div><button disabled={busy || !family} onClick={() => refresh().catch(e => setError(e.message))} className="rounded-lg bg-[#F6F0E6] px-4 py-3 text-sm font-semibold disabled:opacity-40">Refresh</button></div>
        <div className="register-scroll public-scroll space-y-4 p-3">
          <div className="rounded-xl bg-[#F6F0E6] p-3 text-sm"><p className="font-semibold">Select the children / sales to add to this checkout</p><p className="mt-2 text-gray-600">Admission bills come from check-in. Add snacks, retail items or custom charges to the same checkout.</p></div>
          <div className="flex flex-wrap gap-2">{categories.map(c => <button key={c} disabled={busy} onClick={() => setCategory(c)} className={`rounded-lg px-4 py-3 text-sm font-semibold ${category === c ? "bg-[#1E293B] text-white" : "bg-[#F6F0E6]"}`}>{c}</button>)}</div>
          {category==="Snacks & Retail"&&<section className="space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Snacks & Retail</h3>{canManage&&<button disabled={busy} onClick={()=>setManageOpen(true)} className="text-sm font-semibold underline">Manage products</button>}</div><div className="grid register-product-grid gap-3">{products.filter(p=>p.active).map(p=><button key={p.id} disabled={busy} onClick={()=>productQuantity(p.id,(draft.products.find(item=>item.productId===p.id)?.quantity??0)+1)} className="min-h-32 rounded-xl border bg-[#F6F0E6] p-4 text-left"><strong className="block text-sm">{p.name}</strong><span className="mt-1 block text-xs text-gray-500">{p.category==="SNACK"?"Snack":"Retail"}</span><span className="mt-3 block text-xl font-semibold">{dollars(p.priceCents)}</span><span className="mt-2 block text-xs">{draft.products.find(item=>item.productId===p.id)?.quantity??0} in cart · Tap to add</span></button>)}</div>{!products.some(p=>p.active)&&<p className="text-sm">No active products. {canManage?"Use Manage products to add them.":"Ask a manager to add products."}</p>}</section>}
          {!family ? <button onClick={() => setFamilyOpen(true)} className="w-full rounded-xl border border-dashed p-8 text-center font-semibold">Choose a family to see their open sales</button> : <>
            <div className="grid gap-3 register-product-grid">{visibleSales.map(s => <button key={s.id} disabled={busy} aria-pressed={cart.some(item=>item.id===s.id)} onClick={() => toggleSale(s)} className={`min-h-36 rounded-xl border p-4 text-left ${cart.some(item=>item.id===s.id) ? "border-[#20B8A8] bg-[#E8F8F5] ring-1 ring-[#20B8A8]" : "border-black/10 bg-[#F6F0E6]"}`}><span className="block text-sm font-semibold">{s.quoteSnapshot.lines.map(l => l.label).join(", ")}</span><span className="mt-2 block text-xs text-gray-500">{s.kind === "MEMBERSHIP" ? "Membership / visit pack" : s.kind==="RETAIL"?"Snacks & Retail":s.kind==="CUSTOM"?"Custom Charge":"Admission"}</span><span className="mt-4 block text-xl font-semibold">{dollars(s.totalCents - paidCents(s))}</span><span className="mt-2 block text-xs font-semibold">{cart.some(item=>item.id===s.id)?"✓ Added to checkout · tap to remove":"+ Add to checkout"}</span></button>)}</div>
            {!visibleSales.length && <p className="py-5 text-sm text-gray-600">No open sales in this category.</p>}
            {data?.hasMore && <button onClick={() => setHistoryOpen(true)} className="text-sm underline">View older sales in family history</button>}
            {(category === "Admissions"||category === "Open sales") && !!data?.unbilled.length && <section className="space-y-3"><h3 className="font-semibold">Admissions ready to bill</h3><div className="grid gap-3 sm:grid-cols-2">{data.unbilled.map(v => <button key={v.id} disabled={busy} onClick={() => addVisit(v.id)} className="rounded-xl border bg-[#F6F0E6] p-4 text-left"><strong className="block text-sm">{v.child.firstName} {v.child.lastName} · {v.visitType}</strong><span className="mt-2 block text-sm">{dollars(Math.round(v.admissionSnapshot.listedPrice * 100))} before configured tax / fees</span><span className="mt-3 block text-sm font-semibold">+ Add to checkout</span></button>)}</div></section>}
            {category === "Memberships" && <button onClick={() => setHistoryOpen(true)} className={dark}>+ Enroll membership / visit pack</button>}
          </>}
        </div>
      </section>
      <section aria-label="Order details" className="register-order register-pane rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b p-3"><div><h2 className="font-semibold">Order details</h2><p className="mt-1 max-w-60 truncate text-xs text-gray-500">{sale ? `Order: ${sale.id}` : "No sale selected"}</p></div><button disabled={busy} onClick={() => {updateCart([]);changeDraft({products:[],custom:[]});setAmount("");}} className="rounded-lg bg-[#F6F0E6] px-3 py-2 text-xs font-semibold">Clear</button></div>
        <div className="register-scroll public-scroll space-y-3 p-3">
          {family&&<PendingSquarePayments familyId={family.id} onChanged={()=>{refresh().catch(e=>setError(e.message));onChanged?.();}}/>}
          <div className="space-y-3"><h3 className="text-sm font-semibold">Ordered Items{cart.length?` · ${cart.length} selected ${cart.length===1?"sale":"sales"}`:""}</h3>{sale ? cart.map(item=><div key={item.id} className="space-y-2 border-b pb-3">{item.quoteSnapshot.lines.map(l => <div key={l.id} className="flex justify-between gap-3 text-sm"><span>{l.label}</span><span className="shrink-0 font-semibold">{dollars(l.priceCents)}</span></div>)}<button disabled={busy} onClick={()=>updateCart(cart.filter(s=>s.id!==item.id))} className="text-xs font-semibold text-rose-800 underline">Remove from checkout</button></div>) : !hasDraft&&<p className="rounded-lg border border-dashed bg-[#F6F0E6] p-5 text-center text-sm text-gray-500">Cart is empty. Select one or more children / sales to begin.</p>}{draft.products.map(item=>{const p=products.find(p=>p.id===item.productId);return <div key={item.productId} className="space-y-2 border-b pb-3 text-sm"><div className="flex justify-between gap-3"><strong>{draftQuote?.quote.lines.find(l=>l.id===`product:${item.productId}`)?.label??`${item.quantity}× ${p?.name??"Product"}`}</strong><span>{dollars(draftQuote?.quote.lines.find(l=>l.id===`product:${item.productId}`)?.priceCents??(p?.priceCents??0)*item.quantity)}</span></div><div className="flex items-center gap-3"><button aria-label={`Remove one ${p?.name??"product"}`} disabled={busy} onClick={()=>productQuantity(item.productId,item.quantity-1)} className="rounded-lg border px-3 py-1">−</button><span>{item.quantity}</span><button aria-label={`Add one ${p?.name??"product"}`} disabled={busy||item.quantity>=99} onClick={()=>productQuantity(item.productId,item.quantity+1)} className="rounded-lg border px-3 py-1">+</button><button disabled={busy} onClick={()=>productQuantity(item.productId,0)} className="text-xs text-rose-800 underline">Remove</button></div></div>;})}{draft.custom.map(item=><div key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 text-sm"><span><strong>{item.quantity}× {item.name}</strong><button disabled={busy} onClick={()=>changeDraft({...draft,custom:draft.custom.filter(c=>c.id!==item.id)})} className="mt-2 block text-xs text-rose-800 underline">Remove</button></span><span>{dollars(item.amountCents*item.quantity)}</span></div>)}</div>
          {quoteLoading&&<p role="status" className="text-xs">Calculating prices, taxes & fees…</p>}
          <p className="text-xs text-gray-500">Pay records money already collected as cash or on an external terminal. Pay securely with Square opens secure card fields.</p>
          <dl className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{dollars((sale?.quoteSnapshot.subtotalCents ?? 0)+(draftQuote?.quote.subtotalCents??0))}</dd></div><div className="flex justify-between"><dt>Fees</dt><dd>{dollars((sale?.quoteSnapshot.feeCents ?? 0)+(draftQuote?.quote.feeCents??0))}</dd></div><div className="flex justify-between"><dt>Added tax</dt><dd>{dollars((sale?.quoteSnapshot.taxCents ?? 0)+(draftQuote?.quote.taxCents??0))}</dd></div>{!!((sale?.quoteSnapshot.includedTaxCents??0)+(draftQuote?.quote.includedTaxCents??0)) && <div className="flex justify-between"><dt>Tax included</dt><dd>{dollars((sale?.quoteSnapshot.includedTaxCents??0)+(draftQuote?.quote.includedTaxCents??0))}</dd></div>}{!!sale && paidCents(sale) > 0 && <div className="flex justify-between"><dt>Already paid</dt><dd>{dollars(paidCents(sale))}</dd></div>}<div className="flex items-center justify-between border-t pt-3"><dt className="font-semibold">Total Payable</dt><dd className="text-3xl font-semibold tracking-tight">{dollars(due)}</dd></div></dl>
        </div>
      </section>
      <aside aria-label="Payment controls" className="register-payment register-pane rounded-xl border border-black/10 bg-white shadow-sm">
        <div className="register-payment-total"><h2 className="font-semibold">Total payable</h2><p className="text-3xl font-semibold tracking-tight">{dollars(due)}</p></div>
          <PaymentControls compact busy={busy} methods={data?.paymentMethods??[{key:"cash",label:"Cash"},{key:"card",label:"Card"}]} method={method} onMethod={value=>{setMethod(value);paymentId.current="";}} amount={amount} onAmount={editAmount} onKey={press} dueCents={due} allowPartial={data?.allowPartialPayments??false} allowSplit={data?.allowSplitPayments??false} onSplit={()=>{editAmount("");setNotice("Split payment: enter the first amount and method, then pay the remaining balance with the next method.");}} canPay={canPay||!!(family&&hasDraft&&draftQuote?.quote.totalCents===0&&!quoteLoading&&!sale)} onPay={()=>preparePayment()} label={hasDraft&&due===0?"Save zero-total sale":undefined} footer={<button type="button" disabled={busy||!canPay} onClick={()=>preparePayment("square")} className="w-full rounded-xl border border-[#20B8A8] px-4 py-3 font-semibold disabled:opacity-40">Pay securely with Square</button>}/>
          {cart.length>20&&<p role="alert" className="text-sm text-red-700">Select up to 20 bills per checkout.</p>}
      </aside>
    </div>
    <div className="register-mobile-dock"><span>Total <strong>{dollars(due)}</strong></span><button type="button" disabled={busy} onClick={()=>setMobileView("payment")} className="rounded-xl bg-[#20B8A8] px-5 py-3 font-semibold text-white">Go to payment</button></div>
    </div>
    {squareOpen&&family&&sale&&<SquareCardPayment payload={{kind:"counter",familyId:family.id,bills:cart.map(s=>({id:s.id,dueCents:s.totalCents-paidCents(s)})),amountCents}} onClose={()=>{setSquareOpen(false);refresh().catch(e=>setError(e.message));}} onPaid={()=>{setNotice("Square payment completed. View receipts in family history.");onChanged?.();}}/>}
    {manageOpen&&<ProductManager products={products} onClose={()=>setManageOpen(false)} onSaved={loadCatalog}/>}
    {customOpen&&<SigningDialog title="Add Custom Charge" busy={false} onClose={()=>setCustomOpen(false)}><form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!/^\d{1,7}(\.\d{1,2})?$/.test(customAmount)||Number(customAmount)<=0||Number(customAmount)>1000000){setError("Enter a positive custom amount with up to two decimals.");return;}changeDraft({...draft,custom:[...draft.custom,{id:crypto.randomUUID(),name:customName.trim()||"Custom Charge",quantity:1,amountCents:Math.round(Number(customAmount)*100),profile:customProfile}]});setCustomOpen(false);}}><label className="block text-sm font-semibold">Description<input required maxLength={100} value={customName} onChange={e=>setCustomName(e.target.value)} className="mt-2 block w-full rounded-xl border p-3"/></label><label className="block text-sm font-semibold">Tax category<select value={customProfile} onChange={e=>setCustomProfile(e.target.value)} className="mt-2 block w-full rounded-xl border p-3"><option value="services">Services</option><option value="retail">Retail</option><option value="admissions">Admissions</option></select></label><label className="block text-sm font-semibold">Amount (USD)<input required inputMode="decimal" value={customAmount} onChange={e=>{if(/^\d{0,7}(\.\d{0,2})?$/.test(e.target.value))setCustomAmount(e.target.value);}} className="mt-2 block w-full rounded-xl border bg-[#F6F0E6] p-4 text-right text-3xl"/></label><div className="grid grid-cols-5 gap-2">{[5,10,20,50,100].map(n=><button type="button" key={n} onClick={()=>setCustomAmount(String(n))} className="rounded-lg bg-[#F6F0E6] py-3 text-sm font-semibold">${n}</button>)}</div><div className="grid grid-cols-3 gap-2">{["1","2","3","4","5","6","7","8","9",".","0","Backspace"].map(key=><button type="button" key={key} aria-label={key==="Backspace"?"Delete last custom amount digit":key} onClick={()=>setCustomAmount(registerKey(customAmount,key))} className="rounded-xl bg-[#1E293B] py-4 text-xl font-semibold text-white">{key==="Backspace"?"⌫":key}</button>)}</div><button disabled={!customName.trim()||!/^\d+(\.\d{1,2})?$/.test(customAmount)||Number(customAmount)<=0||Number(customAmount)>1000000} className="w-full rounded-xl bg-[#20B8A8] py-4 font-semibold text-white disabled:opacity-40">Add To Cart</button></form></SigningDialog>}
    {familyOpen && <SigningDialog title="Select customer / family" busy={busy} onClose={() => setFamilyOpen(false)}><div className="space-y-4">{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block text-sm font-semibold">Name, email, or last four phone digits<input autoFocus value={query} maxLength={254} onChange={e => { setQuery(e.target.value); setResults([]); setSearching(e.target.value.trim().length >= 2); }} className="mt-2 w-full rounded-xl border p-3"/></label>{searching && <p>Searching…</p>}{!searching && query.trim().length >= 2 && !results.length && <p>No active families found.</p>}{results.map(f => <button key={f.id} disabled={busy} onClick={() => choose(f.id)} className="block w-full rounded-xl border p-4 text-left"><strong>{f.name}</strong>{f.parents.map((p, i) => <span key={i} className="mt-1 block text-sm text-gray-500">{p.firstName} {p.lastName} · {p.phone}</span>)}</button>)}</div></SigningDialog>}
    {historyOpen && family && <SigningDialog title={`${family.name} · History & memberships`} busy={false} onClose={() => { setHistoryOpen(false); refresh().catch(e => setError(e.message)); }}><CounterPanel key={family.id} family={family} refreshKey={0} initiallyOpen onChanged={async () => { await refresh(); }}/></SigningDialog>}
    {confirming && sale && <SigningDialog title="Confirm payment" busy={busy} onClose={() => setConfirming(false)}><form className="space-y-5" onSubmit={e => { e.preventDefault(); pay(); }}><p className="text-3xl font-semibold">{dollars(amountCents)} · {data?.paymentMethods.find(m => m.key === method)?.label}</p><p className="text-sm">{family?.name} · Remaining after this payment: {dollars(due - amountCents)}</p>{error && <p role="alert" className="text-red-700">{error}</p>}<label className="block text-sm font-semibold">Receipt reference / notes (no card details)<textarea maxLength={2000} value={notes} disabled={busy} onChange={e => { setNotes(e.target.value); paymentId.current = ""; setCollected(false); }} className="mt-2 w-full rounded-xl border p-3"/></label><label className="flex items-start gap-3 text-sm"><input required type="checkbox" checked={collected} disabled={busy} onChange={e => setCollected(e.target.checked)}/><span>I confirm this money has already been collected {method === "card" ? "on the external terminal" : "from the customer"}. This records the payment.</span></label><button disabled={busy || !collected} className="w-full rounded-xl bg-[#20B8A8] p-4 font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Confirm payment"}</button></form></SigningDialog>}
    {receipt && <SigningDialog title="Payment receipt" busy={false} onClose={() => setReceipt(null)}><ReceiptView sale={receipt}/></SigningDialog>}
  </>;
}
