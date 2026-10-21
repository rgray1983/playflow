import type {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {operations} from "@/lib/operations/settings";
import {partyLinkPaths} from "@/lib/booking/party-links";
import {FormError} from "@/lib/waivers/signing";
export function senderReady(){return !!(process.env.RESEND_API_KEY&&process.env.PLAYFLOW_EMAIL_FROM&&process.env.PLAYFLOW_APP_URL);}
export async function preparePartyMessages(tx:Prisma.TransactionClient,tenantId:string,partyId:string){
 const [t,p]=await Promise.all([tx.tenant.findUniqueOrThrow({where:{id:tenantId}}),tx.party.findFirst({where:{id:partyId,tenantId},include:{primaryParent:true}})]);
 if(!p||["CANCELLED","COMPLETED"].includes(p.status)||p.startTime<=new Date())return;
 const recipient=p.primaryParent?.email?.trim().toLowerCase();if(!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return;
 const origin=process.env.PLAYFLOW_APP_URL?new URL(process.env.PLAYFLOW_APP_URL).origin:null;
 const portal=origin?`${origin}/parent/${encodeURIComponent(t.slug)}`:`/parent/${encodeURIComponent(t.slug)}`;
 const when=p.startTime.toLocaleString("en-US",{timeZone:t.timezone,dateStyle:"full",timeStyle:"short"});
 const settings=operations(t.operationalSettings).communications,links=partyLinkPaths(p),active=settings?.enabled&&senderReady();
 const add=async(kind:string,subject:string,body:string,scheduledAt=new Date())=>{const dedupeKey=`${p.id}:${kind}:${p.startTime.toISOString()}:${recipient}`;await tx.bookingMessage.upsert({where:{tenantId_dedupeKey:{tenantId,dedupeKey}},create:{tenantId,partyId:p.id,kind,dedupeKey,recipient,subject,body,status:active?"QUEUED":"DRAFT",scheduledAt},update:{}});};
 if(p.status==="PENDING"){
  if(p.confirmationExpiresAt&&p.confirmationExpiresAt<=new Date())return;
  await add("HOLD",`${t.name}: party reservation on hold`,`${p.title}\n${when} (${t.timezone})\n\nYour reservation is on hold and is not confirmed. Complete the rental agreement and required deposit in your parent portal: ${portal}\n${p.confirmationExpiresAt?`Hold expires: ${p.confirmationExpiresAt.toLocaleString("en-US",{timeZone:t.timezone})} (${t.timezone}).`:"Contact the venue about the hold deadline."}`);
 }else if(links){
  if(Number(p.depositAmount)>0&&p.depositStatus!=="WAIVED"&&!p.depositStatus.endsWith("COLLECTED"))return;
  if(!await tx.waiver.findFirst({where:{tenantId,partyId:p.id,kind:"RENTAL",status:"VALID",signedAt:{not:null}}}))return;
  const host=origin?origin+links.hostUrl:links.hostUrl,guest=origin?origin+links.guestUrl:links.guestUrl;
  await add("CONFIRMATION",`${t.name}: party booking confirmed`,`${p.title}\n${when} (${t.timezone})\n\nYour party is confirmed.\nPrivate host page (keep this link private): ${host}\nGuest invitation link (share this with guests): ${guest}\nParent portal: ${portal}`);
  const hours=settings?.reminderHours??48,scheduled=new Date(p.startTime.getTime()-hours*3600000);
  if(scheduled>new Date())await add("REMINDER",`${t.name}: your party is coming up`,`${p.title}\n${when} (${t.timezone})\n\nReview your booking, current balance and guest attendance in your parent portal: ${portal}\nPrivate host page: ${host}\nShare only this guest invitation link with guests: ${guest}`,scheduled);
 }
}
export async function deliverMessage(id:string,tenantId:string){
 if(!senderReady())throw new FormError("A verified platform email sender must be connected first.",409);
 const now=new Date(),m=await prisma.bookingMessage.findFirst({where:{id,tenantId},include:{party:true,tenant:true}});if(!m)throw new FormError("Message not found.",404);
 if(m.status==="SENT"||m.status==="CANCELLED"||m.status==="REVIEW")return;
 if(!operations(m.tenant.operationalSettings).communications?.enabled)return;
 if(m.scheduledAt>now)return;
 const obsolete=["CANCELLED","COMPLETED"].includes(m.party.status)||m.party.startTime<=now||!m.dedupeKey.includes(m.party.startTime.toISOString())||(m.kind==="HOLD"&&(m.party.status!=="PENDING"||!!m.party.confirmationExpiresAt&&m.party.confirmationExpiresAt<=now))||(m.kind!=="HOLD"&&m.party.status==="PENDING");
 if(obsolete){await prisma.bookingMessage.update({where:{id},data:{status:"CANCELLED",failureCode:"BOOKING_CHANGED"}});return;}
 if(m.attemptedAt&&now.getTime()-m.attemptedAt.getTime()>23*3600000){await prisma.bookingMessage.update({where:{id},data:{status:"REVIEW",failureCode:"DELIVERY_UNCERTAIN"}});return;}
 const claimed=await prisma.bookingMessage.updateMany({where:{id,tenantId,OR:[{status:"QUEUED"},{status:"SENDING",updatedAt:{lt:new Date(now.getTime()-60000)}}]},data:{status:"SENDING",attemptedAt:m.attemptedAt??now}});if(!claimed.count)return;
 try{
  // Stable body and key across uncertain retries; stop before the provider's 24-hour deduplication window expires.
  const response=await fetch("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`playflow-message-${id}`},body:JSON.stringify({from:process.env.PLAYFLOW_EMAIL_FROM,to:[m.recipient],subject:m.subject,text:m.body})});
  if(!response.ok){await prisma.bookingMessage.update({where:{id},data:{failureCode:`EMAIL_HTTP_${response.status}`,...(response.status>=400&&response.status<500&&response.status!==429?{status:"FAILED"}:{})}});return;}
  const data=await response.json();if(typeof data.id!=="string")throw new Error("Invalid provider response");
  await prisma.bookingMessage.update({where:{id},data:{status:"SENT",sentAt:new Date(),providerId:data.id,failureCode:null}});
 }catch{await prisma.bookingMessage.updateMany({where:{id,status:"SENDING"},data:{failureCode:"DELIVERY_UNCERTAIN"}});}
}
export async function processMessages(tenantId?:string){
 const candidates=await prisma.bookingMessage.findMany({where:{...(tenantId?{tenantId}:{}),status:{in:["QUEUED","SENDING"]},scheduledAt:{lte:new Date()}},orderBy:{scheduledAt:"asc"},take:3,select:{id:true,tenantId:true}});
 for(const m of candidates)await deliverMessage(m.id,m.tenantId);
 return candidates.length;
}
