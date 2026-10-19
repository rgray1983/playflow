"use client";
import {useState} from "react";
import SquareCardPayment from "@/components/counter/SquareCardPayment";
import PendingSquarePayments from "@/components/counter/PendingSquarePayments";
export default function ParentDeposit({slug,partyId,onChanged}:{slug:string;partyId:string;onChanged:()=>void}){
 const [amount,setAmount]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function start(){setBusy(true);setError("");try{const r=await fetch(`/api/parent/${encodeURIComponent(slug)}/payments?partyId=${encodeURIComponent(partyId)}`,{cache:"no-store"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load deposit.");if(d.depositCents<=0){setError("No deposit is currently due. Refresh to see the latest booking status.");onChanged();return;}setAmount(d.depositCents);}catch(e){setError(e instanceof Error?e.message:"Unable to load deposit.");}finally{setBusy(false);}}
 return <div className="space-y-3 pt-2"><PendingSquarePayments slug={slug} partyId={partyId} onChanged={onChanged}/>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} onClick={start} className="rounded-lg bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy?"Loading…":"Pay deposit with Square"}</button>{amount!==null&&<SquareCardPayment slug={slug} payload={{kind:"party",partyId,purpose:"DEPOSIT",amountCents:amount}} onClose={()=>{setAmount(null);onChanged();}} onPaid={onChanged}/>}</div>;
}
