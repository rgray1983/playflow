"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import SigningDialog from "@/components/forms/SigningDialog";
import LegalSigningForm, { type SigningSubmission } from "@/components/forms/LegalSigningForm";

type Child = {id:string;firstName:string;lastName:string;waivers:{id:string}[]};
type Catalog = {
  eventTypes:{id:string;name:string;description:string|null}[];
  packages:{id:string;eventTypeId:string|null;name:string;description:string|null;price:number;durationMinutes:number|null;guestLimit:number|null}[];
  addOns:{id:string;name:string;description:string|null;price:number;durationMinutes:number}[];
};
type Availability = {
  slots:{time:string;label:string;available:boolean;setupStartsAt:string;startTime:string;endTime:string}[];
  quote:{subtotal:number;tax:number;fees:{name:string;amount:number}[];total:number;depositDue:number;lines:{name:string;amount:number}[]};
  timezone:string;setupMinutes:number;quoteToken:string;
};
type SavedBooking = {id:string;title:string;status:string;eventNumber:string;startTime:string;endTime:string;expiresAt:string;depositDue:number;balanceDue:number};
const money=(amount:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount);
const button="rounded-lg bg-[#1E293B] px-5 py-3 font-semibold text-white disabled:opacity-40";
const field="mt-2 block w-full rounded-lg border p-3";

export default function ParentBookingWizard({slug,parent,email,familyChildren,onClose,onSaved}:{
  slug:string;parent:{firstName:string;lastName:string;phone:string|null};email:string;familyChildren:Child[];onClose:()=>void;onSaved:()=>Promise<void>;
}) {
  const [catalog,setCatalog]=useState<Catalog|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[step,setStep]=useState(0);
  const [childId,setChildId]=useState(familyChildren.length===1?familyChildren[0].id:""),[eventTypeId,setEventTypeId]=useState(""),[packageId,setPackageId]=useState(""),[addOnIds,setAddOnIds]=useState<string[]>([]),[date,setDate]=useState(""),[time,setTime]=useState(""),[notes,setNotes]=useState("");
  const [availability,setAvailability]=useState<Availability|null>(null),[waiverSaved,setWaiverSaved]=useState(false),[showWaiver,setShowWaiver]=useState(false),[saved,setSaved]=useState<SavedBooking|null>(null);
  const requestId=useRef(""),heading=useRef<HTMLHeadingElement>(null);
  const endpoint=`/api/parent/${encodeURIComponent(slug)}/bookings`;
  const child=familyChildren.find(c=>c.id===childId),pkg=catalog?.packages.find(p=>p.id===packageId),slot=availability?.slots.find(s=>s.time===time);
  const covered=waiverSaved||!!child?.waivers.length;
  const fullName=`${parent.firstName} ${parent.lastName}`;
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/parent/${encodeURIComponent(slug)}/bookings`,{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load party packages.");return data as Catalog;}).then(setCatalog).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
    return()=>controller.abort();
  },[slug]);
  useEffect(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:"nearest"});},[step,saved]);
  async function post(url:string,body:object){const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to save. Please try again.");return result;}
  async function checkAvailability(event:FormEvent){
    event.preventDefault();setBusy(true);setError("");setTime("");setAvailability(null);requestId.current="";
    try{const query=new URLSearchParams({eventTypeId,packageId,date});addOnIds.forEach(id=>query.append("addOnId",id));const response=await fetch(`${endpoint}?${query}`,{cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to check availability.");setAvailability(result);setStep(1);}catch(error){setError(error instanceof Error?error.message:"Unable to check availability.");}finally{setBusy(false);}
  }
  async function signWaiver(signing:SigningSubmission){
    setBusy(true);try{await post(`/api/parent/${encodeURIComponent(slug)}`,{action:"waiver",childIds:[childId],signing});setWaiverSaved(true);setShowWaiver(false);await onSaved();}finally{setBusy(false);}
  }
  async function reserve(signing:SigningSubmission){
    if(!availability||!slot||!covered)throw new Error("Review the booking and child waiver first.");
    setBusy(true);setError("");if(!requestId.current)requestId.current=crypto.randomUUID();
    try{const result=await post(endpoint,{requestId:requestId.current,childId,eventTypeId,packageId,addOnIds,eventDate:date,startTime:time,notes,quoteToken:availability.quoteToken,signing});setSaved(result.booking);try{await onSaved();}catch{setError("Your booking is saved. Refresh the portal after closing to update your booking list.");}}finally{setBusy(false);}
  }
  function back(next:number){setError("");setShowWaiver(false);setStep(next);}
  const savedExpired=!!saved&&saved.status==="PENDING"&&new Date(saved.expiresAt)<=new Date();
  const formatted=(value:string)=>new Date(value).toLocaleString("en-US",{timeZone:availability?.timezone??"America/New_York",dateStyle:"medium",timeStyle:"short"});

  return <SigningDialog title="Book a party" busy={busy} onClose={onClose}>
    <div className="space-y-5">
      <h3 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{saved?(saved.status==="PENDING"?(savedExpired?"Hold expired":"Booking saved — awaiting deposit"):`Booking ${saved.status.toLowerCase()}`):["1. Party details","2. Choose a time","3. Review and waiver","4. Rental agreement"][step]}</h3>
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {saved?<section className="space-y-4 rounded-xl border p-5">
        <p className="font-semibold">{saved.title}</p><p>{formatted(saved.startTime)}</p>
        <p>Your rental agreement is signed. Online checkout did not collect a payment.</p>{saved.status==="PENDING"&&<p>Your party is <strong>not confirmed</strong>.{savedExpired?" This temporary hold has expired.":""}</p>}
        <dl className="space-y-2"><div className="flex justify-between"><dt>Deposit due</dt><dd>{money(saved.depositDue)}</dd></div><div className="flex justify-between"><dt>Total unpaid balance</dt><dd>{money(saved.balanceDue)}</dd></div></dl>
        {saved.status==="PENDING"&&!savedExpired&&<p className="text-sm">Temporary hold expires {formatted(saved.expiresAt)}. Contact the venue to arrange the deposit before it expires.</p>}
        <p className="rounded-lg bg-amber-50 p-4 text-sm">Online checkout is not connected yet. You can see the current status under Your party bookings. Contact the venue about payment or changes.</p>
        <button disabled className={button}>Payment unavailable</button><p className="break-all text-xs text-gray-500">Reference: {saved.eventNumber}</p>
        <button className="block underline" onClick={onClose}>Return to family</button>
      </section>:!catalog?<p>{error?"Close and reopen to try again.":"Loading party packages…"}</p>:<>
        {step===0&&<form onSubmit={checkAvailability} className="space-y-5">
          <label className="block font-semibold">Birthday child<select required className={field} value={childId} onChange={e=>{setChildId(e.target.value);setWaiverSaved(false);}}><option value="">Choose your child</option>{familyChildren.map(c=><option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></label>
          <label className="block font-semibold">Party type<select required className={field} value={eventTypeId} onChange={e=>{setEventTypeId(e.target.value);setPackageId("");}}><option value="">Choose a party type</option>{catalog.eventTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="block font-semibold">Package<select required className={field} value={packageId} onChange={e=>setPackageId(e.target.value)}><option value="">Choose a package</option>{catalog.packages.filter(p=>!p.eventTypeId||p.eventTypeId===eventTypeId).map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</select></label>
          {pkg&&<div className="rounded-lg bg-gray-50 p-4 text-sm"><p>{pkg.description}</p><p className="mt-2">{pkg.durationMinutes??120} minutes of party time{pkg.guestLimit?` · Package guest limit: ${pkg.guestLimit}`:""}</p></div>}
          {!!catalog.addOns.length&&<fieldset className="space-y-3"><legend className="mb-2 font-semibold">Optional add-ons</legend>{catalog.addOns.map(a=><label key={a.id} className="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" className="mt-1" checked={addOnIds.includes(a.id)} onChange={e=>setAddOnIds(ids=>e.target.checked?[...ids,a.id]:ids.filter(id=>id!==a.id))}/><span>{a.name} — {money(a.price)}{a.durationMinutes>0?` (+${a.durationMinutes} minutes)`:""}<span className="block text-sm text-gray-600">{a.description}</span></span></label>)}</fieldset>}
          <label className="block font-semibold">Party date<input required type="date" value={date} onChange={e=>setDate(e.target.value)} className={field}/></label>
          <label className="block font-semibold">Party notes (optional)<textarea maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} className={field}/></label>
          <p className="text-sm text-gray-600">Availability, taxes, fees, and the deposit are checked before you sign. No payment will be taken.</p>
          <button disabled={busy||!familyChildren.length} className={button}>{busy?"Checking…":"Check available times"}</button>
        </form>}
        {step===1&&availability&&<section className="space-y-5">
          <p>Times are shown in {availability.timezone}. Setup starts {availability.setupMinutes} minutes before the party and is included in your reservation.</p>
          <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-semibold">Available party times for {date}</legend>{availability.slots.map(s=><label key={s.time} className={`flex gap-3 rounded-lg border p-4 ${s.available?"cursor-pointer":"opacity-40"}`}><input type="radio" name="party-time" checked={time===s.time} disabled={!s.available} onChange={()=>setTime(s.time)}/><span>{s.label}{!s.available&&<span className="block text-sm">Unavailable</span>}</span></label>)}</fieldset>
          {!availability.slots.some(s=>s.available)&&<p>No times available. Please choose another date.</p>}
          <div className="flex items-center justify-between gap-3"><button className="underline" onClick={()=>back(0)}>Back to details</button><button className={button} disabled={!time} onClick={()=>setStep(2)}>Review booking</button></div>
        </section>}
        {(step===2||step===3)&&availability&&slot&&<section className="space-y-4 rounded-xl border p-4">
          <p className="font-semibold">{child?.firstName} {child?.lastName} · {pkg?.name}</p><p>{formatted(slot.startTime)} — {new Date(slot.endTime).toLocaleTimeString("en-US",{timeZone:availability.timezone,hour:"numeric",minute:"2-digit"})}</p><p className="text-sm">Setup access: {formatted(slot.setupStartsAt)}</p>
          <dl className="space-y-2 text-sm">{availability.quote.lines.map((line,i)=><div key={i} className="flex justify-between gap-3"><dt>{line.name}</dt><dd>{money(line.amount)}</dd></div>)}{availability.quote.fees.map((fee,i)=><div key={i} className="flex justify-between gap-3"><dt>{fee.name}</dt><dd>{money(fee.amount)}</dd></div>)}<div className="flex justify-between"><dt>Tax (included in total below)</dt><dd>{money(availability.quote.tax)}</dd></div><div className="flex justify-between border-t pt-2 font-semibold"><dt>Total</dt><dd>{money(availability.quote.total)}</dd></div><div className="flex justify-between"><dt>Deposit due</dt><dd>{money(availability.quote.depositDue)}</dd></div></dl>
          <p className="text-sm">Hosting parent: {fullName}<br/>{email} · {parent.phone}</p>
          {notes&&<p className="whitespace-pre-wrap text-sm">Notes: {notes}</p>}
        </section>}
        {step===2&&<section className="space-y-5">
          <p className="rounded-lg bg-amber-50 p-4 text-sm">Signing creates a 48-hour temporary hold awaiting your deposit. Online payments are not connected. Contact the venue to arrange payment; the party will remain unconfirmed until the venue confirms it.</p>
          {covered?<p className="font-semibold text-green-800">Liability waiver on file for {child?.firstName}.</p>:<><p>A signed liability waiver is required for {child?.firstName}.</p><button className={button} onClick={()=>setShowWaiver(true)}>Complete child’s liability waiver</button>{showWaiver&&<LegalSigningForm scrollTerms={false} kind="LIABILITY" signerName={fullName} signerEmail={email} onSign={signWaiver} childrenSummary={<p>Child covered: {child?.firstName} {child?.lastName}</p>}/>}</>}
          <div className="flex items-center justify-between gap-3"><button disabled={busy} className="underline" onClick={()=>back(1)}>Back to times</button><button disabled={!covered||busy} className={button} onClick={()=>setStep(3)}>Read rental agreement</button></div>
        </section>}
        {step===3&&<><button disabled={busy} className="underline" onClick={()=>back(2)}>Back to review</button><LegalSigningForm scrollTerms={false} kind="RENTAL" signerName={fullName} signerEmail={email} onSign={reserve} childrenSummary={<p className="text-sm">Signing saves the party details above as an unpaid temporary hold. No charge will be made.</p>}/></>}
      </>}
    </div>
  </SigningDialog>;
}
