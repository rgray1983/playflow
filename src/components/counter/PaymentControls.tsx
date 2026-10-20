"use client";
import type {ReactNode} from "react";
import {dollars} from "@/lib/counter/receipt";

type Props={compact?:boolean;footer?:ReactNode;busy:boolean;methods:{key:string;label:string}[];method:string;onMethod:(value:string)=>void;amount:string;onAmount:(value:string)=>void;onKey:(key:string)=>void;dueCents:number;allowPartial:boolean;allowSplit:boolean;onSplit:()=>void;canPay:boolean;onPay:()=>void;label?:string};
export default function PaymentControls(p:Props){
  const amountCents=/^\d+(\.\d{1,2})?$/.test(p.amount)?Math.round(Number(p.amount)*100):0;
  return <div className={p.compact?"register-controls":"space-y-4"}>
    <div className={p.compact?"register-payment-entry public-scroll":"space-y-4"}>
    <fieldset disabled={p.busy} className={p.compact?"register-methods":"space-y-2"}><legend className={p.compact?"sr-only":"mb-2 text-sm font-semibold"}>Payment Method</legend><div className={p.compact?"register-method-grid":"grid grid-cols-3 gap-2"}>{p.methods.map(m=><button key={m.key} type="button" aria-pressed={p.method===m.key} onClick={()=>p.onMethod(m.key)} className={`rounded-xl border px-2 py-3 text-sm font-semibold ${p.method===m.key?"border-[#20B8A8] bg-[#E8F8F5]":"border-black/10 bg-[#F6F0E6]"}`}><span className="mb-1 block text-lg" aria-hidden="true">{m.key==="cash"?"💵":m.key==="card"?"💳":"⇄"}</span>{m.label}</button>)}{p.allowPartial&&p.allowSplit&&<button type="button" onClick={p.onSplit} className="rounded-xl border border-[#B99AFF] bg-[#EEE7FF] px-2 py-3 text-sm font-semibold">⇄ Split</button>}</div></fieldset>
    <label className="block text-sm font-semibold"><span className={p.compact?"sr-only":undefined}>Payment amount (USD)</span><input inputMode="decimal" aria-label="Payment amount in dollars" disabled={p.busy||!p.allowPartial} value={p.amount} onChange={e=>p.onAmount(e.target.value)} className="mt-2 w-full rounded-xl border bg-[#F6F0E6] px-4 py-3 text-right text-2xl font-semibold" placeholder="0.00"/></label>
    <div className={p.compact?"register-keypad":"grid grid-cols-3 gap-2"} aria-label="Onscreen number pad">{["1","2","3","4","5","6","7","8","9",".","0","Backspace"].map(key=><button type="button" key={key} aria-label={key==="Backspace"?"Delete last digit":key==="."?"Decimal point":key} disabled={p.busy||!p.allowPartial} onClick={()=>p.onKey(key)} className="rounded-xl bg-[#1E293B] py-3 text-xl font-semibold text-white hover:bg-[#334155] disabled:opacity-40">{key==="Backspace"?"⌫":key}</button>)}</div>
    <div className="flex gap-2"><button type="button" disabled={p.busy} onClick={()=>p.onAmount((p.dueCents/100).toFixed(2))} className="flex-1 rounded-lg bg-[#F6F0E6] py-2 text-sm font-semibold">Exact amount</button><button type="button" disabled={p.busy||!p.allowPartial} onClick={()=>p.onKey("Clear")} className="flex-1 rounded-lg bg-[#F6F0E6] py-2 text-sm font-semibold">Clear amount</button></div>
    {amountCents>p.dueCents&&<p role="alert" className="text-sm text-red-700">Amount exceeds the balance. Enter the amount to apply, excluding cash change.</p>}
    </div>
    <div className={p.compact?"register-payment-actions":"space-y-4"}>
    <button type="button" disabled={p.busy||!p.canPay} onClick={p.onPay} className="w-full rounded-xl bg-[#20B8A8] px-4 py-4 text-lg font-semibold text-white shadow-sm disabled:opacity-40">{p.busy?"Saving…":p.label??`Pay ${dollars(amountCents)}`}</button>
    {p.footer}
    </div>
  </div>;
}
