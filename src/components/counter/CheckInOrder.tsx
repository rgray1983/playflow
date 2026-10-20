"use client";
import {useEffect,useState} from "react";
import {dollars,paidCents,type CounterReceipt} from "@/lib/counter/receipt";
type Props={familyId:string;refreshKey:number;selected:{id:string;name:string;label:string;price:number}[];onCheckout:()=>void;onCheckIn:()=>void;canCheckIn:boolean;busy:boolean;hasAdmission:boolean;onClear:()=>void;validationMessage?:string};
export default function CheckInOrder({familyId,refreshKey,selected,onCheckout,onCheckIn,canCheckIn,busy,hasAdmission,onClear,validationMessage}:Props){
  const [data,setData]=useState<{sales:CounterReceipt[];hasMore:boolean}|null>(null),[error,setError]=useState("");
  useEffect(()=>{const controller=new AbortController();fetch(`/api/counter?familyId=${encodeURIComponent(familyId)}`,{cache:"no-store",signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load order.");return d;}).then(d=>{setData(d);setError("");}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[familyId,refreshKey]);
  const open=data?.sales.filter(s=>s.status==="OPEN")??[],due=open.reduce((n,s)=>n+s.totalCents-paidCents(s),0),subtotal=selected.reduce((n,c)=>n+Math.round(c.price*100),0);
  return <aside className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white xl:sticky xl:top-0 xl:max-h-[calc(100dvh-6rem)]">
    <h3 className="shrink-0 border-b p-5 text-xl font-semibold">Family checkout</h3>
    <div className="public-scroll min-h-0 space-y-4 overflow-y-auto p-5">
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold">Selected for check-in · {selected.length}</h4>{selected.length>0&&<button type="button" disabled={busy} onClick={onClear} className="text-xs underline disabled:opacity-40">Clear</button>}</div>
        {!selected.length&&<p className="text-sm text-gray-600">Tap a child’s card to add them.</p>}
        {selected.map(c=><div key={c.id} className="flex justify-between gap-3 text-sm"><span>{c.name}<small className="block text-gray-500">{c.label}</small></span><strong className="shrink-0">{dollars(Math.round(c.price*100))}</strong></div>)}
        <p className="flex justify-between border-t pt-3 text-sm font-semibold"><span>New admission subtotal</span><span>{dollars(subtotal)}</span></p>
        {hasAdmission&&<p className="text-xs text-gray-600">Configured tax and fees are calculated at check-in. Review the final total in checkout.</p>}
      </section>
      <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Saved open bills{data?` · ${open.length}${data.hasMore?"+":""} · ${dollars(due)}`:""}</summary><div className="mt-3 space-y-3">{!data&&!error?<p className="text-sm">Loading…</p>:!open.length?<p className="text-sm text-gray-600">No open bills on this page.</p>:open.map(s=><div key={s.id} className="flex justify-between gap-3 text-sm"><span>{s.quoteSnapshot.lines.map(l=>l.label).join(", ")}</span><strong className="shrink-0">{dollars(s.totalCents-paidCents(s))}</strong></div>)}{data?.hasMore&&<p className="text-xs">Older bills are available in checkout’s family history.</p>}</div></details>
    </div>
    <div className="shrink-0 space-y-3 border-t bg-white p-5">
      {validationMessage&&<p id="check-in-guidance" className="text-sm text-amber-900">{validationMessage}</p>}
      <button type="button" disabled={busy||!canCheckIn} aria-describedby={validationMessage?"check-in-guidance":undefined} onClick={onCheckIn} className="w-full rounded-xl bg-[#20B8A8] px-4 py-4 font-semibold text-white disabled:opacity-40">{busy?"Saving…":selected.length>0&&!hasAdmission?"Check In":"Check-In & Pay"}</button>
      {canCheckIn&&<p className="text-xs text-gray-600">{hasAdmission?"Saves these visits and opens checkout with admissions already added. Payment is completed in checkout.":"These visits are covered by membership. No admission payment needed."}</p>}
      {(open.length>0||data?.hasMore)&&<button type="button" disabled={busy} onClick={onCheckout} className="w-full rounded-lg border px-4 py-3 text-sm font-semibold disabled:opacity-40">Pay saved bills</button>}
    </div>
  </aside>;
}
