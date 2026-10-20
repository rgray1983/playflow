"use client";
import type {Admission,DeskChild,DeskEntry} from "./types";

type Props={child:DeskChild;entry?:DeskEntry;admissions:Admission[];busy:boolean;canSign:boolean;onToggle:()=>void;onEntry:(value:string)=>void;onWaiver:()=>void;onCheckOut:()=>void;formatDate:(value:string)=>string};
const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
export default function ChildCheckInCard({child,entry,admissions,busy,canSign,onToggle,onEntry,onWaiver,onCheckOut,formatDate}:Props){
  const name=`${child.firstName} ${child.lastName}`;
  return <article className={`overflow-hidden rounded-xl border transition-colors ${entry?"border-[#20B8A8] bg-[#E8F8F5] ring-1 ring-[#20B8A8]":"border-black/15 bg-white"}`}>
    <button type="button" aria-label={`${entry?"Deselect":"Select"} ${name} for check-in`} aria-pressed={!!entry} disabled={busy||!!child.activeVisit} onClick={onToggle} className="block w-full space-y-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] disabled:cursor-default">
      <span className="flex items-start justify-between gap-3"><span className="font-semibold">{name}</span>{child.waiver&&<span role="img" aria-label="Signed waiver on file" title={`Signed waiver on file · ${formatDate(child.waiver.signedAt)}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-800">✓</span>}</span>
      {child.dateOfBirth&&<span className="block text-sm text-gray-600">Born {new Date(child.dateOfBirth).toLocaleDateString("en-US",{timeZone:"UTC"})}</span>}
      {child.allergies&&<span className="block whitespace-pre-wrap break-words text-sm text-amber-900"><strong>Allergies:</strong> {child.allergies}</span>}
      {child.medicalNotes&&<span className="block whitespace-pre-wrap break-words text-sm"><strong>Medical / accessibility:</strong> {child.medicalNotes}</span>}
      {!child.activeVisit&&<span className={`block text-xs font-semibold ${entry?"text-teal-900":"text-gray-500"}`}>{entry?"Selected for check-in · tap to remove":"Tap to select for check-in"}</span>}
    </button>
    {(!child.waiver||child.activeVisit||entry)&&<div className="space-y-3 px-4 pb-4">
      {!child.waiver&&<div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-red-700">Liability waiver needed</p><button type="button" disabled={busy||!canSign} onClick={onWaiver} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Sign waiver for {child.firstName}</button></div>}
      {child.activeVisit?<div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p>Inside since {formatDate(child.activeVisit.checkedInAt)} · {child.activeVisit.visitType}</p><button type="button" disabled={busy} onClick={onCheckOut} className="rounded-lg border bg-white px-4 py-2 font-semibold disabled:opacity-40">Check out</button></div>:entry&&<><label className="block text-sm font-semibold">Admission or membership<select disabled={busy} value={entry.mode==="MEMBERSHIP"?`MEMBERSHIP:${entry.membershipId}`:`ADMISSION:${entry.admissionTypeId}`} onChange={e=>onEntry(e.target.value)} className="mt-2 block w-full rounded-lg border bg-white p-3"><option value="ADMISSION:">Choose an option</option>{child.memberships.map(member=><option key={member.id} disabled={!member.eligible} value={`MEMBERSHIP:${member.id}`}>{member.name} — {member.eligible?(member.remaining===null?"unlimited":`${member.remaining} visits left`):member.reason}</option>)}{admissions.map(admission=><option key={admission.id} value={`ADMISSION:${admission.id}`}>{admission.name} — {money(admission.price)}</option>)}</select></label>{!admissions.length&&!child.memberships.some(m=>m.eligible)&&<p className="text-sm text-red-700">No usable membership or active admission type. Configure admissions in Company Settings.</p>}</>}
    </div>}
  </article>;
}
