import {allowedBusinessRecipients,businessRecipientAllowed} from "@/lib/communications/recipients";
import {deliveryPolicy} from "@/lib/communications/delivery-policy";
import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {operations} from "@/lib/operations/settings";
import {preparePartyMessages,processMessages,senderReady,emailSetup} from "@/lib/communications/service";
async function get(){
 const tenantId=getStaffContext().tenantId;
 const [lastEvent,job,inbox,items]=await Promise.all([
  prisma.emailDeliveryEvent.findFirst({where:{message:{tenantId}},orderBy:{receivedAt:"desc"},select:{receivedAt:true}}),
  prisma.communicationJobState.findUnique({where:{id:"booking-email"}}),
  prisma.emailConfiguration.findUnique({where:{tenantId},select:{verifiedAt:true,replyTo:true}}),
  prisma.bookingMessage.findMany({where:{tenantId},orderBy:{createdAt:"desc"},take:100,select:{id:true,partyId:true,kind:true,recipient:true,subject:true,body:true,status:true,scheduledAt:true,sentAt:true,failureCode:true,retryAt:true,attemptCount:true,attemptedAt:true,deliveryStatus:true,deliveryUpdatedAt:true,deliveredAt:true,replyTo:true}}),
 ]);
 const [blocked,eligible]=await Promise.all([prisma.emailSuppression.findMany({where:{tenantId,recipient:{in:items.map(m=>m.recipient)}},select:{recipient:true}}),allowedBusinessRecipients(prisma,tenantId,items.map(m=>m.recipient))]),suppressed=new Set(blocked.map(m=>m.recipient));
 return NextResponse.json({...emailSetup(),lastDeliveryEventAt:lastEvent?.receivedAt??null,lastSchedulerRunAt:job?.completedAt??null,lastSchedulerFailureAt:job?.failedAt??null,items:items.map(({attemptedAt,...item})=>{
  const deliveryBlockedReason=!eligible.has(item.recipient.trim().toLowerCase())?(deliveryPolicy().savedRecipientsEnabled?"This address is not saved for an active family, approved staff member or the business contact in this workspace.":"Test mode: this address is not an approved test inbox."):suppressed.has(item.recipient)?"This address is blocked after an email bounce, provider suppression or spam complaint.":!attemptedAt&&!emailSetup().testMode&&!(inbox?.verifiedAt&&inbox.replyTo)?"Verify a business reply inbox before starting live delivery.":null;
  return {...item,deliveryAllowed:!deliveryBlockedReason,deliveryBlockedReason};
 })});
}
async function post(request:Request){let b;try{b=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}const tenantId=getStaffContext().tenantId;
 if(!b||typeof b!=="object"||Array.isArray(b))return NextResponse.json({error:"Invalid request."},{status:400});
 if(["queue","retry"].includes(b.action)){if(typeof b.id!=="string")return NextResponse.json({error:"Choose a message."},{status:400});const message=await prisma.bookingMessage.findFirst({where:{id:b.id,tenantId},select:{recipient:true,attemptedAt:true}});if(!message)return NextResponse.json({error:"Message not found."},{status:404});if(!await businessRecipientAllowed(prisma,tenantId,message.recipient))return NextResponse.json({error:deliveryPolicy().savedRecipientsEnabled?"This email is not saved for an active contact in this business.":"Test mode: this recipient is not an approved test inbox. Delivery is blocked."},{status:409});if(await prisma.emailSuppression.findUnique({where:{tenantId_recipient:{tenantId,recipient:message.recipient}}}))return NextResponse.json({error:"Delivery is blocked after a bounce, provider suppression or spam complaint. Check the parent’s contact details and reach them another way."},{status:409});
 if(!message.attemptedAt&&!emailSetup().testMode){const inbox=await prisma.emailConfiguration.findUnique({where:{tenantId}});if(!inbox?.verifiedAt||!inbox.replyTo)return NextResponse.json({error:"Verify the business reply inbox before starting live delivery."},{status:409});}
 const t=await prisma.tenant.findUniqueOrThrow({where:{id:tenantId}});if(!senderReady()||!operations(t.operationalSettings).communications?.enabled)return NextResponse.json({error:"Configure the sender and enable message rules before queueing delivery."},{status:409});}
 if(b?.action==="prepare"){
  const parties=await prisma.party.findMany({where:{tenantId,status:{notIn:["CANCELLED","COMPLETED"]},startTime:{gt:new Date()}},take:100,orderBy:{startTime:"asc"},select:{id:true}});
  for(const p of parties)await prisma.$transaction(async tx=>{await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);await preparePartyMessages(tx,tenantId,p.id);});
 }else if(b?.action==="retry"&&typeof b.id==="string"){
  const result=await prisma.bookingMessage.updateMany({where:{id:b.id,tenantId,status:"FAILED",failureCode:{in:["EMAIL_HTTP_400","EMAIL_HTTP_401","EMAIL_HTTP_403","EMAIL_HTTP_422"]},attemptedAt:{gt:new Date(Date.now()-23*3600000)},attemptCount:{lt:8}},data:{status:"QUEUED",retryAt:null,failureCode:null}});if(!result.count)return NextResponse.json({error:"This message cannot be retried automatically. Review its provider status first."},{status:409});
 }else if(b?.action==="queue"&&typeof b.id==="string"){
  if(!senderReady())return NextResponse.json({error:"Connect a verified platform sender first."},{status:409});
  await prisma.bookingMessage.updateMany({where:{id:b.id,tenantId,status:"DRAFT"},data:{status:"QUEUED"}});
 }else if(b?.action==="cancel"&&typeof b.id==="string")await prisma.bookingMessage.updateMany({where:{id:b.id,tenantId,status:{in:["DRAFT","QUEUED"]}},data:{status:"CANCELLED"}});
 else if(b?.action!=="process")return NextResponse.json({error:"Choose a message action."},{status:400});
 if(b.action!=="prepare"&&senderReady())await processMessages(tenantId);
 return NextResponse.json({saved:true});
}
export const GET = withStaff("settings.write",get);
export const POST = withStaff("settings.write",post);
