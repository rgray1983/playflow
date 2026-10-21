"use client";
import {useRef,useState} from "react";
import type {CheckoutPayload} from "@/lib/payments/square/checkout";
export default function SquareReaderPayment({payload,disabled}:{payload:CheckoutPayload;disabled?:boolean}){
 const request=useRef(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[launch,setLaunch]=useState("");
 async function prepare(){if(busy||launch)return;setBusy(true);setError("");try{
  if(!/iPad|iPhone|iPod/.test(navigator.userAgent)&&!(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1))throw new Error("Reader checkout opens Square Point of Sale on an iPad or iPhone. Use the secure card form on this device.");
  const c=await fetch("/api/payments/square/connection",{cache:"no-store"}),connection=await c.json();if(!c.ok)throw new Error(connection.error);const status=connection.connection??connection;
  if(!request.current)request.current=crypto.randomUUID();const r=await fetch("/api/payments/square/reader",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,requestId:request.current,mode:status.mode,locationId:status.locationId})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to prepare reader payment.");if(d.launchUrl)setLaunch(d.launchUrl);else setError("This payment is already complete. Refresh the checkout.");
 }catch(e){setError(e instanceof Error?e.message:"Unable to prepare reader payment.");}finally{setBusy(false);}}
 return <div className="space-y-2">{launch?<a href={launch} className="block rounded-xl bg-[#1E293B] p-3 text-center font-semibold text-white">Open Square Point of Sale</a>:<button disabled={disabled||busy} onClick={prepare} className="w-full rounded-xl border p-3 font-semibold disabled:opacity-40">{busy?"Preparing reader…":"Pay with Square Reader (iPad)"}</button>}{launch&&<p className="text-xs">An open reader checkout is reserved. Complete it in Square and return to PlayFlow. Check payment status before collecting again.</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
