"use client";
import {useDeferredValue,useEffect,useMemo,useState} from "react";
import {defaultEmailCopy,emailCopyLimits,emailKinds,type EmailCopy,type EmailKind,type EmailTemplates} from "@/lib/communications/copy";
import {previewHtml,sampleBookingEmail,type EmailBrand} from "@/lib/communications/templates";
const labels:Record<EmailKind,string>={HOLD:"Reservation hold",CONFIRMATION:"Booking confirmation",REMINDER:"Party reminder"};
type EditorData={templates:EmailTemplates;revision:string;brand:EmailBrand};
export default function EmailTemplateEditor() {
  const [data,setData]=useState<EditorData|null>(null);
  const [drafts,setDrafts]=useState<EmailTemplates|null>(null);
  const [kind,setKind]=useState<EmailKind>("CONFIRMATION");
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
  const [message,setMessage]=useState(""),[conflict,setConflict]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/communications/templates",{cache:"no-store",signal:controller.signal}).then(async response=>{
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load email wording.");
      setData(result);setDrafts(result.templates);setConflict(false);setMessage("");
    }).catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:"Unable to load email wording.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[reload]);
  const selected=drafts?.[kind],deferred=useDeferredValue(selected);
  const preview=useMemo(()=>data&&deferred?sampleBookingEmail(data.brand,kind,deferred):null,[data,kind,deferred]);
  const html=useMemo(()=>preview?previewHtml(preview.presentation):"",[preview]);
  const dirty=!!data&&!!selected&&JSON.stringify(selected)!==JSON.stringify(data.templates[kind]);
  function change(key:keyof EmailCopy,value:string) {
    setDrafts(current=>current?{...current,[kind]:{...current[kind],[key]:value}}:current);
    if(!conflict)setMessage("");
  }
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!data||!selected||busy)return;
    setBusy(true);setMessage("");
    try {
      const response=await fetch("/api/communications/templates",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,template:selected,revision:data.revision})});
      const result=await response.json();if(!response.ok){if(response.status===409)setConflict(true);throw new Error(result.error||"Unable to save email wording.");}
      setData(current=>current?{...current,templates:result.templates,revision:result.revision}:current);
      setDrafts(current=>current?{...current,[kind]:result.templates[kind]}:current);
      setConflict(false);setMessage(`${labels[kind]} wording saved. Newly prepared emails will use it. No email was sent.`);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to save email wording.");}finally{setBusy(false);}
  }
  function reloadSaved(){setLoading(true);setReload(value=>value+1);}
  if(loading)return <p role="status" className="py-4 text-sm">Loading your email wording…</p>;
  if(!data||!selected)return <div className="space-y-3 py-4"><p role="alert">{message||"Unable to load email wording."}</p><button type="button" onClick={reloadSaved} className="rounded-lg border px-4 py-2">Try again</button></div>;
  return <div className="mt-5 space-y-5">
    <p className="text-sm text-gray-600">Customize each email’s wording. Your saved logo and colors come from Branding. Booking status, payment details, and private and shareable links stay managed by PlayFlow.</p>
    <label className="block text-sm font-semibold" htmlFor="email-template-kind">Email type</label>
    <select id="email-template-kind" disabled={busy} value={kind} onChange={event=>{setKind(event.target.value as EmailKind);if(!conflict)setMessage("");}} className="w-full rounded-lg border bg-white p-3 sm:max-w-sm">{emailKinds.map(value=><option key={value} value={value}>{labels[value]}{drafts&&JSON.stringify(drafts[value])!==JSON.stringify(data.templates[value])?" · unsaved changes":""}</option>)}</select>
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <form onSubmit={save} className="min-w-0 space-y-5">
        <div><label htmlFor="email-template-subject" className="block text-sm font-semibold">Subject</label><p id="email-subject-help" className="mb-2 text-xs text-gray-600">Your business name is added automatically before this text.</p><input id="email-template-subject" aria-describedby="email-subject-help" required maxLength={emailCopyLimits.subject} disabled={busy} value={selected.subject} onChange={event=>change("subject",event.target.value)} className="w-full rounded-lg border p-3"/><p className="mt-1 text-right text-xs text-gray-500">{selected.subject.length}/{emailCopyLimits.subject}</p></div>
        <div><label htmlFor="email-template-introduction" className="mb-2 block text-sm font-semibold">Introduction</label><textarea id="email-template-introduction" required maxLength={emailCopyLimits.introduction} disabled={busy} rows={6} value={selected.introduction} onChange={event=>change("introduction",event.target.value)} className="w-full rounded-lg border p-3"/><p className="mt-1 text-right text-xs text-gray-500">{selected.introduction.length}/{emailCopyLimits.introduction}</p></div>
        <div><label htmlFor="email-template-closing" className="mb-2 block text-sm font-semibold">Closing message <span className="font-normal text-gray-500">(optional)</span></label><textarea id="email-template-closing" maxLength={emailCopyLimits.closing} disabled={busy} rows={5} value={selected.closing} onChange={event=>change("closing",event.target.value)} className="w-full rounded-lg border p-3"/><p className="mt-1 text-right text-xs text-gray-500">{selected.closing.length}/{emailCopyLimits.closing}</p></div>
        <p className="text-xs text-gray-600">Plain text with line breaks. Changes apply to emails prepared after saving; previously prepared emails keep their saved wording.</p>
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy||!dirty||conflict} className="rounded-lg bg-[#1E293B] px-4 py-3 text-white disabled:opacity-40">{busy?"Saving…":"Save email wording"}</button><button type="button" disabled={busy} onClick={()=>{setDrafts(current=>current?{...current,[kind]:defaultEmailCopy(kind)}:current);if(!conflict)setMessage("Default wording loaded. Save to apply it.");}} className="rounded-lg border px-4 py-3 disabled:opacity-40">Use default wording</button>{dirty&&<button type="button" disabled={busy} onClick={()=>{setDrafts(current=>current?{...current,[kind]:data.templates[kind]}:current);if(!conflict)setMessage("");}} className="px-2 py-3 text-sm underline">Discard changes</button>}</div>
        {message&&<p role={conflict?"alert":"status"} className="rounded-lg bg-[#F6F0E6] p-3 text-sm">{message}</p>}
        {conflict&&<button type="button" disabled={busy} onClick={reloadSaved} className="text-sm underline">Load latest saved wording (discards your unsaved edits)</button>}
      </form>
      <section className="min-w-0 space-y-3" aria-label="Live email preview"><div className="rounded-lg bg-[#F6F0E6] p-3 text-sm"><p className="font-semibold">Live preview · sample booking</p><p className="mt-1 break-words">Subject: {preview?.subject}</p></div><iframe title={`Live preview: ${labels[kind]}`} srcDoc={html} sandbox="" className="h-[820px] w-full rounded-xl border bg-[#F4F1EE]"/><p className="text-xs text-gray-600">Unsaved edits appear here. Preview buttons are disabled. Opening, editing, and saving this preview sends no email.</p></section>
    </div>
  </div>;
}
