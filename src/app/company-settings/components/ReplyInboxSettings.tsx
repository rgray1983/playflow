"use client";
import {useEffect,useState} from "react";
type Inbox={testMode:boolean;savedRecipientsEnabled:boolean;replyTo:string|null;verifiedAt:string|null;pendingEmail:string|null;challengeId:string|null;expiresAt:string|null;requestedAt:string|null};
export default function ReplyInboxSettings({onVerified}:{onVerified:()=>void}){
  const [inbox,setInbox]=useState<Inbox|null>(null),[email,setEmail]=useState(""),[code,setCode]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch("/api/communications/reply-inbox",{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to load the reply inbox.");setInbox(data);}).catch(error=>{if(!controller.signal.aborted)setMessage(error.message);});return()=>controller.abort();},[revision]);
  async function action(type:"request"|"confirm") {
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/communications/reply-inbox",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(type==="request"?{action:type,email}:{action:type,challengeId:inbox?.challengeId,code})}),data=await response.json();
      if(!response.ok)throw new Error(data.error||"Unable to verify this inbox.");
      setInbox(data);setCode("");if(type==="confirm")onVerified();setMessage(type==="request"?"Verification email sent. Paste its code below within 15 minutes.":"Reply inbox verified. New delivery attempts will route replies here.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to verify this inbox.");setRevision(n=>n+1);}
    finally{setBusy(false);}
  }
  return <section className="space-y-4 rounded-xl border bg-white p-5" aria-labelledby="reply-inbox-title">
    <h3 id="reply-inbox-title" className="font-semibold">Where should parents’ replies go?</h3>
    <p className="text-sm">PlayFlow sends your booking emails. Replies go directly to your verified business inbox. You can use an existing email address; you do not need a custom sending domain.</p>
    {inbox?.replyTo?<p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">✓ Verified reply inbox: <strong className="break-all">{inbox.replyTo}</strong></p>:<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No reply inbox verified yet. Live booking delivery requires one. Approved test emails can still be sent while you set it up.</p>}
    <form onSubmit={event=>{event.preventDefault();void action("request");}} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm">{inbox?.replyTo?"Change reply inbox":"Business reply email"}<input type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy||!inbox} onChange={event=>setEmail(event.target.value)} placeholder="you@yourbusiness.com" className="mt-2 block w-full rounded-lg border p-3"/></label>
      <button type="submit" disabled={busy||!inbox} className="rounded-lg bg-[#1E293B] p-3 text-sm text-white disabled:opacity-40">Send verification code</button>
    </form>
    <p className="text-xs text-gray-600">Changing the address keeps your current verified inbox active until the replacement is verified. Previously attempted emails keep their original reply address when retried. {inbox?.savedRecipientsEnabled?"During testing, use an email saved on this business’s contact profile, approved staff or active family records. Parents do not need this reply-inbox verification to receive booking messages.":"During early testing, codes can only go to an approved test inbox."}</p>
    {inbox?.pendingEmail&&inbox.challengeId&&<form onSubmit={event=>{event.preventDefault();void action("confirm");}} className="space-y-3 rounded-lg bg-[#F6F0E6] p-4">
      <p className="text-sm">Latest code requested for <strong className="break-all">{inbox.pendingEmail}</strong>{inbox.expiresAt?` · expires ${new Date(inbox.expiresAt).toLocaleTimeString()}`:""}.</p>
      <div className="flex flex-wrap items-end gap-3"><label className="text-sm">12-character verification code<input value={code} maxLength={12} required autoComplete="one-time-code" spellCheck={false} disabled={busy} onChange={event=>setCode(event.target.value.toUpperCase())} className="mt-2 block rounded-lg border bg-white p-3 font-mono tracking-wider"/></label><button disabled={busy} className="rounded-lg bg-[#1E293B] p-3 text-sm text-white disabled:opacity-40">Verify reply inbox</button></div>
    </form>}
    {message&&<p role="status" className="text-sm">{message}</p>}
    {!inbox&&<button className="text-sm underline" disabled={busy} onClick={()=>setRevision(n=>n+1)}>Reload reply inbox</button>}
  </section>;
}
