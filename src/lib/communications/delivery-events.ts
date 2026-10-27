import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
const states={"email.sent":"ACCEPTED","email.delivery_delayed":"DELAYED","email.delivered":"DELIVERED","email.failed":"FAILED","email.bounced":"BOUNCED","email.suppressed":"SUPPRESSED","email.complained":"COMPLAINED"} as const;
type EventKind=keyof typeof states;
type Event={kind:EventKind;providerId:string;occurredAt:Date;sender:string;recipient:string;messageId?:string;tenantId?:string};
const rank:Record<string,number>={UNKNOWN:0,ACCEPTED:1,DELAYED:2,DELIVERED:3,FAILED:4,BOUNCED:5,SUPPRESSED:6,COMPLAINED:7};
export const deliveryIssues=["DELAYED","FAILED","BOUNCED","SUPPRESSED","COMPLAINED"];
export function nextDeliveryState(current:string,incoming:string){return (rank[incoming]??0)>(rank[current]??0)?incoming:current;}
function mailbox(value:string){return (value.match(/<([^<>]+)>\s*$/)?.[1]??value).trim().toLowerCase();}
export function parseDeliveryEvent(value:unknown):Event|null {
  if(!value||typeof value!=="object")return null;
  const event=value as {type?:unknown;created_at?:unknown;data?:Record<string,unknown>},data=event.data;
  if(typeof event.type!=="string"||!Object.hasOwn(states,event.type))return null;
  if(typeof event.created_at!=="string"||!data||typeof data.email_id!=="string"||!/^[-a-zA-Z0-9_]{1,200}$/.test(data.email_id)||typeof data.from!=="string"||!Array.isArray(data.to)||data.to.length!==1||typeof data.to[0]!=="string")throw new Error("Invalid email event");
  const occurredAt=new Date(event.created_at);
  if(!Number.isFinite(occurredAt.getTime())||occurredAt.getTime()<946684800000||occurredAt.getTime()>Date.now()+300000)throw new Error("Invalid email event date");
  const tags=data.tags&&typeof data.tags==="object"&&!Array.isArray(data.tags)?data.tags as Record<string,unknown>:{};
  const tag=(key:string)=>typeof tags[key]==="string"&&/^[-a-zA-Z0-9_]{1,256}$/.test(tags[key])?tags[key] as string:undefined;
  return {kind:event.type as EventKind,providerId:data.email_id,occurredAt,sender:mailbox(data.from),recipient:data.to[0].trim().toLowerCase(),messageId:tag("playflow_message"),tenantId:tag("playflow_tenant")};
}
export async function recordDeliveryEvent(eventId:string,event:Event) {
  return prisma.$transaction(async tx=>{
    const found=await tx.bookingMessage.findFirst({where:event.messageId&&event.tenantId?{id:event.messageId,tenantId:event.tenantId}:{providerId:event.providerId}});
    // Verification emails and other applications sharing the provider account are not booking messages.
    if(!found)return;
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "BookingMessage" WHERE id=${found.id} FOR UPDATE`);
    const m=await tx.bookingMessage.findUniqueOrThrow({where:{id:found.id}});
    if(!m.attemptedAt||!m.senderFrom||mailbox(m.senderFrom)!==event.sender||m.recipient!==event.recipient||m.providerId&&m.providerId!==event.providerId||event.messageId&&event.messageId!==m.id||event.tenantId&&event.tenantId!==m.tenantId)return;
    // Tags recover a delivery event that wins the race with the send API response (or a lost response).
    if(!m.providerId&&m.transportVersion!==1)return;
    const receipt=await tx.emailDeliveryEvent.createMany({data:[{id:eventId,messageId:m.id,kind:event.kind,providerId:event.providerId,occurredAt:event.occurredAt}],skipDuplicates:true});
    if(!receipt.count)return;
    const state=states[event.kind],deliveryStatus=nextDeliveryState(m.deliveryStatus,state);
    await tx.bookingMessage.update({where:{id:m.id},data:{providerId:event.providerId,status:"SENT",sentAt:m.sentAt??event.occurredAt,failureCode:null,retryAt:null,...(deliveryStatus!==m.deliveryStatus?{deliveryStatus,deliveryUpdatedAt:event.occurredAt}:{}),...(state==="DELIVERED"&&!m.deliveredAt?{deliveredAt:event.occurredAt}:{})}});
    if(["BOUNCED","SUPPRESSED","COMPLAINED"].includes(state))await tx.emailSuppression.upsert({where:{tenantId_recipient:{tenantId:m.tenantId,recipient:m.recipient}},create:{tenantId:m.tenantId,recipient:m.recipient,reason:state},update:state==="COMPLAINED"?{reason:state}:{}});
  });
}
