import {randomUUID} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {operations} from "@/lib/operations/settings";
import {businessRecipientAllowed,recipientCondition} from "./recipients";
import {deliveryPolicy} from "./delivery-policy";
import {automationEnabled} from "./automation-config";
import {senderReady,deliverMessage} from "./service";
export type EmailClaim={id:string;tenantId:string;key:string};
export async function claimEmailBatch(tenantId:string){
  "use step";
  if(!automationEnabled()||!senderReady())return [] as EmailClaim[];
  const now=new Date(),liveReady=deliveryPolicy().testMode?Prisma.sql`true`:Prisma.sql`EXISTS (SELECT 1 FROM "EmailConfiguration" c WHERE c."tenantId"=m."tenantId" AND c."verifiedAt" IS NOT NULL AND c."replyTo" IS NOT NULL)`;
  return prisma.$transaction(async tx=>{
    const rows=await tx.$queryRaw<{id:string;tenantId:string;scheduledAt:Date}[]>(Prisma.sql`SELECT m.id,m."tenantId",m."scheduledAt" FROM "BookingMessage" m JOIN "Tenant" t ON t.id=m."tenantId"
      WHERE m."tenantId"=${tenantId} AND m.status IN ('QUEUED','SENDING') AND m."automationError" IS NULL
      AND t."operationalSettings"#>>'{communications,enabled}'='true' AND ${liveReady}
      AND ${recipientCondition(Prisma.sql`m."tenantId"`,Prisma.sql`m.recipient`)}
      AND (m."automationKey" IS NULL OR m."automationAt" IS DISTINCT FROM m."scheduledAt" OR (m."automationRunId" IS NULL AND m."automationClaimedAt"<${new Date(now.getTime()-120000)}))
      ORDER BY m."scheduledAt",m.id LIMIT 10 FOR UPDATE OF m SKIP LOCKED`);
    const claims:EmailClaim[]=[];
    for(const row of rows){const key=randomUUID();await tx.bookingMessage.update({where:{id:row.id},data:{automationKey:key,automationAt:row.scheduledAt,automationClaimedAt:now,automationRunId:null,automationError:null}});claims.push({id:row.id,tenantId:row.tenantId,key});}
    return claims;
  });
}
export async function rememberEmailRun(claim:EmailClaim,runId:string){
  "use step";
  await prisma.bookingMessage.updateMany({where:{id:claim.id,tenantId:claim.tenantId,automationKey:claim.key},data:{automationRunId:runId}});
}
export async function failEmailAutomation(claim:EmailClaim,code:string){
  "use step";
  await prisma.bookingMessage.updateMany({where:{id:claim.id,tenantId:claim.tenantId,automationKey:claim.key},data:{automationKey:null,automationError:code}});
}
async function release(claim:EmailClaim){await prisma.bookingMessage.updateMany({where:{id:claim.id,tenantId:claim.tenantId,automationKey:claim.key},data:{automationKey:null,automationError:null}});}
export async function runEmailAttempt(claim:EmailClaim):Promise<number|null>{
  "use step";
  const m=await prisma.bookingMessage.findFirst({where:{id:claim.id,tenantId:claim.tenantId,automationKey:claim.key},include:{tenant:true,party:{include:{primaryParent:{select:{email:true}}}}}});
  if(!m)return null; // A changed schedule claimed a new worker; this old run has no authority to send.
  if(!["QUEUED","SENDING"].includes(m.status)){await release(claim);return null;}
  if(!automationEnabled()||!senderReady()||!operations(m.tenant.operationalSettings).communications?.enabled||!await businessRecipientAllowed(prisma,claim.tenantId,m.recipient)){await failEmailAutomation(claim,"WAITING_SETUP");return null;}
  const now=new Date();
  // Retire stale future reminders promptly, including a cancelled party that will never reach its due time.
  if(["CANCELLED","COMPLETED"].includes(m.party.status)||m.party.startTime<=now||m.party.primaryParent?.email?.trim().toLowerCase()!==m.recipient||!m.dedupeKey.includes(m.party.startTime.toISOString())||m.kind==="HOLD"&&(m.party.status!=="PENDING"||!!m.party.confirmationExpiresAt&&m.party.confirmationExpiresAt<=now)||m.kind!=="HOLD"&&m.party.status==="PENDING"){
    await prisma.bookingMessage.updateMany({where:{id:m.id,tenantId:claim.tenantId,automationKey:claim.key,status:{in:["QUEUED","SENDING"]}},data:{status:"CANCELLED",failureCode:"BOOKING_CHANGED",automationKey:null}});return null;
  }
  const due=Math.max(m.scheduledAt.getTime(),m.retryAt?.getTime()??0,m.status==="SENDING"?m.updatedAt.getTime()+61000:0);
  if(due>now.getTime())return due;
  await prisma.communicationJobState.upsert({where:{id:"booking-email"},create:{id:"booking-email",startedAt:now},update:{startedAt:now}});
  await deliverMessage(m.id,claim.tenantId);
  await prisma.communicationJobState.update({where:{id:"booking-email"},data:{completedAt:new Date()}});
  const next=await prisma.bookingMessage.findFirst({where:{id:claim.id,tenantId:claim.tenantId,automationKey:claim.key}});
  if(!next)return null;
  if(!["QUEUED","SENDING"].includes(next.status)){await release(claim);return null;}
  return Math.max(Date.now()+1000,next.scheduledAt.getTime(),next.retryAt?.getTime()??0,next.status==="SENDING"?next.updatedAt.getTime()+61000:0);
}
export async function completeAutomationCheck(tenantId:string,startedAt:string,failed=false){
  "use step";
  await prisma.communicationJobState.updateMany({where:{id:`booking-email-check:${tenantId}`,startedAt:new Date(startedAt)},data:failed?{failedAt:new Date()}:{completedAt:new Date()}});
}
