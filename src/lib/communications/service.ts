import {buildBookingEmail,readPresentation,type EmailKind} from "./templates";
import {deliveryPolicy} from "./delivery-policy";
import {businessRecipientAllowed,savedRecipientQueueQuery} from "./recipients";
import type {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {operations} from "@/lib/operations/settings";
import {partyLinkPaths} from "@/lib/booking/party-links";
import {FormError} from "@/lib/waivers/signing";
export function senderReady(){try{const url=new URL(process.env.PLAYFLOW_APP_URL??"");return !!(process.env.RESEND_API_KEY&&process.env.PLAYFLOW_EMAIL_FROM&&url.protocol==="https:"&&!url.username&&!url.password);}catch{return false;}}
export function emailSetup(){const policy=deliveryPolicy();return {testMode:policy.testMode,savedRecipientsEnabled:policy.savedRecipientsEnabled,testRecipientCount:policy.recipients.length,senderReady:senderReady(),providerKeyConfigured:!!process.env.RESEND_API_KEY,fromConfigured:!!process.env.PLAYFLOW_EMAIL_FROM,appUrlConfigured:!!process.env.PLAYFLOW_APP_URL,schedulerSecretConfigured:!!process.env.CRON_SECRET,webhookSecretConfigured:!!process.env.RESEND_WEBHOOK_SECRET};}
export function retryTime(attempt:number,now=new Date(),retryAfter:string|null=null){const seconds=retryAfter?(Number(retryAfter)||Math.max(0,(new Date(retryAfter).getTime()-now.getTime())/1000)):0;const delay=Math.max(60,Math.min(3600,Math.max(Number.isFinite(seconds)?seconds:0,60*2**Math.min(attempt,6))));return new Date(now.getTime()+delay*1000);}
export async function preparePartyMessages(tx:Prisma.TransactionClient,tenantId:string,partyId:string){
 const [t,p]=await Promise.all([tx.tenant.findUniqueOrThrow({where:{id:tenantId}}),tx.party.findFirst({where:{id:partyId,tenantId},include:{primaryParent:true}})]);
 if(!p||["CANCELLED","COMPLETED"].includes(p.status)||p.startTime<=new Date())return;
 const recipient=p.primaryParent?.email?.trim().toLowerCase();if(!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return;
 const origin=process.env.PLAYFLOW_APP_URL?new URL(process.env.PLAYFLOW_APP_URL).origin:null;
 const portal=origin?`${origin}/parent/${encodeURIComponent(t.slug)}`:`/parent/${encodeURIComponent(t.slug)}`;
 const date=p.startTime.toLocaleDateString("en-US",{timeZone:t.timezone,dateStyle:"full"});
 const time=(value:Date)=>value.toLocaleTimeString("en-US",{timeZone:t.timezone,timeStyle:"short"});
 const zone=new Intl.DateTimeFormat("en-US",{timeZone:t.timezone,timeZoneName:"short"}).formatToParts(p.startTime).find(part=>part.type==="timeZoneName")?.value??t.timezone;
 const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
 const [inbox,suppressed]=await Promise.all([tx.emailConfiguration.findUnique({where:{tenantId}}),tx.emailSuppression.findUnique({where:{tenantId_recipient:{tenantId,recipient}}})]);
 const eligible=await businessRecipientAllowed(tx,tenantId,recipient);
 const settings=operations(t.operationalSettings).communications,links=partyLinkPaths(p),active=settings?.enabled&&senderReady()&&!suppressed&&(deliveryPolicy().testMode||!!(inbox?.verifiedAt&&inbox.replyTo));
 const add=async(kind:EmailKind,scheduledAt=new Date())=>{
  const email=buildBookingEmail({kind,copy:settings?.templates?.[kind],brand:t,title:p.title,date,time:p.endTime?`${time(p.startTime)} – ${time(p.endTime)}`:time(p.startTime),timezone:zone,setupTime:p.setupStartsAt?time(p.setupStartsAt):undefined,packageName:p.packageName,room:p.room,deposit:p.depositStatus==="WAIVED"?"Deposit waived":p.depositStatus.endsWith("COLLECTED")?`Deposit paid · ${money(Number(p.depositAmount??0))}`:Number(p.depositAmount)>0?`Deposit due · ${money(Number(p.depositAmount))}`:"No deposit required",balance:p.balanceDue!==null&&p.balanceDue!==undefined?money(Number(p.balanceDue)):undefined,holdDeadline:p.confirmationExpiresAt?`${p.confirmationExpiresAt.toLocaleString("en-US",{timeZone:t.timezone})} (${t.timezone})`:undefined,portalUrl:portal,hostUrl:origin&&links?origin+links.hostUrl:undefined,guestUrl:origin&&links?origin+links.guestUrl:undefined});
  const dedupeKey=`${p.id}:${kind}:${p.startTime.toISOString()}:${recipient}`;
  const saved=await tx.bookingMessage.upsert({where:{tenantId_dedupeKey:{tenantId,dedupeKey}},create:{tenantId,partyId:p.id,kind,dedupeKey,recipient,subject:email.subject,body:email.text,presentation:email.presentation,status:active&&eligible?"QUEUED":"DRAFT",scheduledAt},update:{}});
  // Upgrade only messages that have never been attempted; an uncertain retry must keep its original payload.
  if(!saved.presentation&&!saved.attemptedAt&&["DRAFT","QUEUED"].includes(saved.status))await tx.bookingMessage.updateMany({where:{id:saved.id,tenantId,status:{in:["DRAFT","QUEUED"]},attemptedAt:null},data:{subject:email.subject,body:email.text,presentation:email.presentation}});
  if(kind==="REMINDER"&&["DRAFT","QUEUED"].includes(saved.status)&&!saved.attemptedAt&&saved.scheduledAt.getTime()!==scheduledAt.getTime())await tx.bookingMessage.updateMany({where:{id:saved.id,tenantId,status:{in:["DRAFT","QUEUED"]},attemptedAt:null},data:{scheduledAt}});
 };
 if(p.status==="PENDING"){
  if(p.confirmationExpiresAt&&p.confirmationExpiresAt<=new Date())return;
  await add("HOLD");
 }else if(links){
  if(Number(p.depositAmount)>0&&p.depositStatus!=="WAIVED"&&!p.depositStatus.endsWith("COLLECTED"))return;
  if(!await tx.waiver.findFirst({where:{tenantId,partyId:p.id,kind:"RENTAL",status:"VALID",signedAt:{not:null}}}))return;
  await add("CONFIRMATION");
  const hours=settings?.reminderHours??48,scheduled=new Date(p.startTime.getTime()-hours*3600000);
  if(scheduled>new Date())await add("REMINDER",scheduled);
 }
}
export async function deliverMessage(id:string,tenantId:string){
 if(!senderReady())throw new FormError("A verified platform email sender must be connected first.",409);
 const now=new Date(),m=await prisma.bookingMessage.findFirst({where:{id,tenantId},include:{party:{include:{primaryParent:{select:{email:true}}}},tenant:true}});if(!m)throw new FormError("Message not found.",404);
 if(m.status==="SENT"||m.status==="CANCELLED"||m.status==="REVIEW"||m.status==="FAILED")return;
 if(m.status==="SENDING"&&m.updatedAt>new Date(now.getTime()-60000))return;
 if(!operations(m.tenant.operationalSettings).communications?.enabled)return;
 // Recheck at delivery as well as preparation: old queued messages and retries cannot bypass test restrictions.
 if(!await businessRecipientAllowed(prisma,tenantId,m.recipient))return;
 if(m.scheduledAt>now||m.retryAt&&m.retryAt>now)return;
 const [inbox,suppressed]=await Promise.all([prisma.emailConfiguration.findUnique({where:{tenantId}}),prisma.emailSuppression.findUnique({where:{tenantId_recipient:{tenantId,recipient:m.recipient}}})]);
 if(suppressed){await prisma.bookingMessage.updateMany({where:{id,tenantId,status:{in:["QUEUED","SENDING"]},updatedAt:m.updatedAt},data:{status:"CANCELLED",failureCode:"RECIPIENT_SUPPRESSED",retryAt:null}});return;}
 const replyTo=m.attemptedAt?m.replyTo:(inbox?.verifiedAt?inbox.replyTo:null);
 if(!m.attemptedAt&&!deliveryPolicy().testMode&&!replyTo)return;
 const currentRecipient=m.party.primaryParent?.email?.trim().toLowerCase();
 const obsolete=currentRecipient!==m.recipient||["CANCELLED","COMPLETED"].includes(m.party.status)||m.party.startTime<=now||!m.dedupeKey.includes(m.party.startTime.toISOString())||(m.kind==="HOLD"&&(m.party.status!=="PENDING"||!!m.party.confirmationExpiresAt&&m.party.confirmationExpiresAt<=now))||(m.kind!=="HOLD"&&m.party.status==="PENDING");
 if(obsolete){await prisma.bookingMessage.update({where:{id},data:{status:"CANCELLED",failureCode:"BOOKING_CHANGED"}});return;}
 if(m.kind!=="HOLD"&&(Number(m.party.depositAmount)>0&&m.party.depositStatus!=="WAIVED"&&!m.party.depositStatus.endsWith("COLLECTED")||!await prisma.waiver.findFirst({where:{tenantId,partyId:m.party.id,kind:"RENTAL",status:"VALID",signedAt:{not:null},version:{not:null}}}))){
  await prisma.bookingMessage.update({where:{id},data:{status:"CANCELLED",failureCode:"BOOKING_NOT_READY"}});return;
 }
 if((m.attemptCount??0)>=8){await prisma.bookingMessage.update({where:{id},data:{status:"REVIEW",failureCode:"RETRY_LIMIT"}});return;}
 if(m.attemptedAt&&now.getTime()-m.attemptedAt.getTime()>23*3600000){await prisma.bookingMessage.update({where:{id},data:{status:"REVIEW",failureCode:"DELIVERY_UNCERTAIN"}});return;}
 const presentation=readPresentation(m.presentation);
 const transportVersion=m.attemptedAt?(m.transportVersion??0):1;
 const claimed=await prisma.bookingMessage.updateMany({where:{id,tenantId,updatedAt:m.updatedAt,OR:[{status:"QUEUED"},{status:"SENDING",updatedAt:{lt:new Date(now.getTime()-60000)}}]},data:{status:"SENDING",attemptedAt:m.attemptedAt??now,attemptCount:{increment:1},retryAt:null,senderFrom:m.senderFrom??process.env.PLAYFLOW_EMAIL_FROM,replyTo:replyTo??null,transportVersion}});if(!claimed.count)return;
 try{
  // Stable body and key across uncertain retries; stop before the provider's 24-hour deduplication window expires.
  const response=await fetch("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`playflow-message-${id}`},body:JSON.stringify({from:m.senderFrom??process.env.PLAYFLOW_EMAIL_FROM,to:[m.recipient],subject:m.subject,text:m.body,...(replyTo?{reply_to:replyTo}:{}),...(transportVersion===1?{tags:[{name:"playflow_message",value:id},{name:"playflow_tenant",value:tenantId}]}:{}),...(presentation?{html:presentation.html,...(presentation.attachments.length?{attachments:presentation.attachments}:{})}:{})})});
  if(!response.ok){const retryable=response.status===429||response.status>=500;await prisma.bookingMessage.updateMany({where:{id,status:"SENDING"},data:{failureCode:`EMAIL_HTTP_${response.status}`,status:retryable?"QUEUED":"FAILED",retryAt:retryable?retryTime(m.attemptCount??0,new Date(),response.headers.get("retry-after")):null}});return;}
  const data=await response.json();if(typeof data.id!=="string")throw new Error("Invalid provider response");
  await prisma.bookingMessage.update({where:{id},data:{status:"SENT",sentAt:new Date(),providerId:data.id,failureCode:null,retryAt:null}});
 }catch{await prisma.bookingMessage.updateMany({where:{id,status:"SENDING"},data:{status:"QUEUED",failureCode:"DELIVERY_UNCERTAIN",retryAt:retryTime(m.attemptCount??0)}});}
}
export async function processMessages(tenantId?:string){
 if(!senderReady())return 0;
 const policy=deliveryPolicy();if(policy.testMode&&!policy.savedRecipientsEnabled&&!policy.recipients.length)return 0;
 const now=new Date(),candidates=policy.savedRecipientsEnabled?await prisma.$queryRaw<{id:string;tenantId:string}[]>(savedRecipientQueueQuery(tenantId,now)):await prisma.bookingMessage.findMany({where:{...(tenantId?{tenantId}:{}),...(policy.testMode?{recipient:{in:policy.recipients}}:{}),tenant:{operationalSettings:{path:["communications","enabled"],equals:true}},scheduledAt:{lte:now},AND:[{OR:[{retryAt:null},{retryAt:{lte:now}}]},{OR:[{status:"QUEUED"},{status:"SENDING",updatedAt:{lt:new Date(now.getTime()-60000)}}]}]},orderBy:[{scheduledAt:"asc"},{id:"asc"}],take:3,select:{id:true,tenantId:true}});
 const results=await Promise.allSettled(candidates.map(m=>deliverMessage(m.id,m.tenantId)));
 // A bad record/provider response must not stop the other businesses in this batch.
 for(const result of results)if(result.status==="rejected")console.error("A booking message needs delivery review.");
 return candidates.length;
}
