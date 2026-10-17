export type SavedDocument={id:string;kind:string;status:string;version:string|null;signedAt:string|null;expiresAt:string|null;signerName:string|null;signerEmail:string|null;signature:string|null;photoConsent:boolean;waiverText:string|null;children:{childId:string;childNameSnapshot:string|null;dateOfBirthSnapshot:string|null;status:string}[];party:{title:string}|null};
type Snapshot={title?:string;notice?:string;clauses?:string[][];photoConsentText?:string;signatureConsentText?:string;event?:Record<string,unknown>};
export function storedSnapshot(text:string|null):Snapshot|null{
  try{
    const value=JSON.parse(text??"");
    if(!value||typeof value!=="object"||Array.isArray(value))return null;
    const string=(key:string)=>typeof value[key]==="string"?value[key] as string:undefined;
    return {title:string("title"),notice:string("notice"),photoConsentText:string("photoConsentText"),signatureConsentText:string("signatureConsentText"),clauses:Array.isArray(value.clauses)&&value.clauses.every((clause:unknown)=>Array.isArray(clause)&&clause.length===3&&clause.every(v=>typeof v==="string"))?value.clauses:undefined,event:value.event&&typeof value.event==="object"&&!Array.isArray(value.event)?value.event:undefined};
  }catch{return null;}
}
export function storedBookingDetails(snapshot:Snapshot|null,timezone:string):[string,string][]{
  const event=snapshot?.event;if(!event)return [];
  const result:[string,string][]=[];
  for(const [key,label] of [["title","Party"],["childName","Hosting child"],["packageName","Package"],["timezone","Timezone"]])if(typeof event[key]==="string")result.push([label,event[key] as string]);
  for(const [key,label] of [["setupStartsAt","Setup access"],["startTime","Party starts"],["endTime","Party ends"]])if(typeof event[key]==="string"){
    let formatted=event[key] as string;try{formatted=new Date(formatted).toLocaleString("en-US",{timeZone:typeof event.timezone==="string"?event.timezone:timezone,dateStyle:"medium",timeStyle:"short"});}catch{}result.push([label,formatted]);
  }
  const currency=(amount:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount);
  for(const key of ["lines","fees"])if(Array.isArray(event[key]))for(const line of event[key] as unknown[]){if(line&&typeof line==="object"&&"name" in line&&"amount" in line&&typeof line.name==="string"&&typeof line.amount==="number")result.push([line.name,currency(line.amount)]);}
  for(const [key,label] of [["subtotal","Subtotal"],["tax","Tax"],["total","Total"],["depositDue","Deposit due"],["depositAmount","Deposit amount"],["balanceDue","Unpaid balance at signing"]])if(typeof event[key]==="number")result.push([label,currency(event[key] as number)]);
  return result;
}
const escapeHtml=(value:unknown)=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
export function printableDocument(document:SavedDocument,timezone:string){
  const snapshot=storedSnapshot(document.waiverText),title=snapshot?.title??(document.kind==="RENTAL"?"Party Rental Agreement":"Liability Waiver");
  const date=(value:string|null)=>value?new Date(value).toLocaleString("en-US",{timeZone:timezone,dateStyle:"medium",timeStyle:"short"}):"Not recorded";
  const paragraph=(label:string,value:unknown)=>`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
  const terms=snapshot?.clauses?`<ol>${snapshot.clauses.map(([,heading,text])=>`<li><h3>${escapeHtml(heading)}</h3><p>${escapeHtml(text)}</p></li>`).join("")}</ol>`:`<pre>${escapeHtml(document.waiverText??"Stored wording unavailable.")}</pre>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{max-width:800px;margin:32px auto;padding:0 24px;font:15px/1.6 system-ui;color:#1e293b}h1{font-size:26px}h3{font-size:16px;margin-bottom:4px}p,pre{white-space:pre-wrap;overflow-wrap:anywhere}li{padding-left:8px;margin-bottom:18px}.note{color:#555;font-size:13px}@media print{body{margin:0;max-width:none}h3{break-after:avoid}li{break-inside:avoid}}@page{margin:18mm}</style></head><body><h1>${escapeHtml(title)}</h1><p class="note">Saved signing record. Use your browser’s Print command to print or save a PDF.</p>${paragraph("Signer",document.signerName??"Not recorded")}${paragraph("Email",document.signerEmail??"Not recorded")}${paragraph("Signed",date(document.signedAt))}${paragraph("Version",document.version??"Not recorded")}${paragraph("Document status",document.status)}${paragraph("Expiration",document.expiresAt?date(document.expiresAt):"No automatic expiration recorded")}${document.children.map(child=>paragraph("Child",`${child.childNameSnapshot??"Child record"}${child.dateOfBirthSnapshot?` · DOB ${child.dateOfBirthSnapshot.slice(0,10)}`:""} · Coverage ${child.status}`)).join("")}${storedBookingDetails(snapshot,timezone).map(([label,value])=>paragraph(label,value)).join("")}${snapshot?.notice?`<p><strong>${escapeHtml(snapshot.notice)}</strong></p>`:""}${terms}${snapshot?.photoConsentText?`<h3>Optional photo/video permission</h3><p>${escapeHtml(snapshot.photoConsentText)}</p>${paragraph("Permission in this signature",document.photoConsent?"Granted":"Not granted")}`:""}${snapshot?.signatureConsentText?`<h3>Electronic signature consent</h3><p>${escapeHtml(snapshot.signatureConsentText)}</p>`:""}${paragraph("Electronic signature",document.signature??"Not recorded")}<p class="note">The original signing information remains unchanged by later profile edits. This copy includes the current recorded document and child coverage statuses.</p></body></html>`;
}
