"use client";
import { useEffect, useState } from "react";

export type PartyLinkUrls={hostUrl:string;guestUrl:string};
export default function PartyLinks({slug,partyId,initialLinks}:{slug:string;partyId:string;initialLinks:PartyLinkUrls|null}){
  const [repairedLinks,setLinks]=useState<PartyLinkUrls|null>(null),[error,setError]=useState(""),[copied,setCopied]=useState(false),[retry,setRetry]=useState(0);
  const links=initialLinks??repairedLinks;
  useEffect(()=>{
    if(initialLinks)return;
    let active=true;
    fetch(`/api/parent/${encodeURIComponent(slug)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"party-links",partyId})}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load party links.");return result.links as PartyLinkUrls;}).then(result=>{if(active){setLinks(result);setError("");}}).catch(error=>{if(active)setError(error.message);});
    return()=>{active=false;};
  },[slug,partyId,initialLinks,retry]);
  async function copy(){if(!links)return;try{await navigator.clipboard.writeText(new URL(links.guestUrl,window.location.origin).href);setCopied(true);}catch{setError("Open the guest invitation and copy its address to share it.");}}
  if(!links)return <div className="mt-4 text-sm">{error?<><p role="alert">{error}</p><button className="mt-2 underline" onClick={()=>setRetry(n=>n+1)}>Try loading links again</button></>:<p>Preparing your party links…</p>}</div>;
  return <div className="mt-4 space-y-4 rounded-lg bg-gray-50 p-4">
    <div><a href={links.hostUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Party host dashboard</a><p className="mt-1 text-sm text-gray-600">Private — for you to view guest responses and attendance. Do not share this link with guests.</p></div>
    <div><a href={links.guestUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Guest invitation and RSVP</a><p className="mt-1 text-sm text-gray-600">Share this link with your guests so they can RSVP and complete their children’s waivers.</p><button onClick={copy} className="mt-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Copy guest invitation link</button>{copied&&<p role="status" className="mt-2 text-sm text-green-800">Guest invitation link copied.</p>}</div>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
