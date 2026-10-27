import {Prisma} from "@/generated/prisma/client";
import {deliveryPolicy,recipientAllowed} from "./delivery-policy";
type Client=Pick<Prisma.TransactionClient,"$queryRaw">;
const normalize=(value:string)=>value.trim().toLowerCase();
const valid=(value:string)=>/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
// Shared by individual checks and the queue's SQL filter, before its batch limit is applied.
export function savedRecipientCondition(tenant:Prisma.Sql,email:Prisma.Sql) {
  return Prisma.sql`(
    EXISTS (SELECT 1 FROM "Parent" p JOIN "Family" f ON f.id=p."familyId" AND f."tenantId"=p."tenantId"
      WHERE p."tenantId"=${tenant} AND f.status='ACTIVE' AND lower(btrim(p.email))=${email})
    OR EXISTS (SELECT 1 FROM "Employee" e WHERE e."tenantId"=${tenant} AND e.status='ACTIVE' AND e."accessApproved"=true AND lower(btrim(e.email))=${email})
    OR EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id=${tenant} AND lower(btrim(t.email))=${email})
  )`;
}
export async function allowedBusinessRecipients(db:Client,tenantId:string,recipients:string[]) {
  const emails=[...new Set(recipients.map(normalize).filter(valid))],allowed=new Set(emails.filter(recipientAllowed));
  if(!tenantId)return new Set<string>();
  const remaining=emails.filter(email=>!allowed.has(email));
  if(deliveryPolicy().savedRecipientsEnabled&&remaining.length){
    const rows=await db.$queryRaw<{email:string}[]>(Prisma.sql`SELECT target.email FROM (VALUES ${Prisma.join(remaining.map(email=>Prisma.sql`(${email})`))}) AS target(email) WHERE ${savedRecipientCondition(Prisma.sql`${tenantId}`,Prisma.sql`target.email`)}`);
    for(const row of rows)if(remaining.includes(row.email))allowed.add(row.email);
  }
  return allowed;
}
export async function businessRecipientAllowed(db:Client,tenantId:string,recipient:string){return (await allowedBusinessRecipients(db,tenantId,[recipient])).has(normalize(recipient));}
export function recipientCondition(tenant:Prisma.Sql,email:Prisma.Sql){
  const policy=deliveryPolicy();
  if(!policy.testMode)return Prisma.sql`true`;
  const explicit=policy.recipients.length?Prisma.sql`${email} IN (${Prisma.join(policy.recipients)})`:Prisma.sql`false`;
  return policy.savedRecipientsEnabled?Prisma.sql`(${explicit} OR ${savedRecipientCondition(tenant,email)})`:explicit;
}
export function savedRecipientQueueQuery(tenantId:string|undefined,now:Date){
  const policy=deliveryPolicy();
  const extra=policy.recipients.length?Prisma.sql`m.recipient IN (${Prisma.join(policy.recipients)})`:Prisma.sql`false`;
  return Prisma.sql`SELECT m.id,m."tenantId" FROM "BookingMessage" m JOIN "Tenant" business ON business.id=m."tenantId"
    WHERE ${tenantId?Prisma.sql`m."tenantId"=${tenantId}`:Prisma.sql`true`}
      AND business."operationalSettings"#>>'{communications,enabled}'='true'
      AND m."scheduledAt"<=${now} AND (m."retryAt" IS NULL OR m."retryAt"<=${now})
      AND (m.status='QUEUED' OR (m.status='SENDING' AND m."updatedAt"<${new Date(now.getTime()-60000)}))
      AND (${extra} OR ${savedRecipientCondition(Prisma.sql`m."tenantId"`,Prisma.sql`m.recipient`)})
    ORDER BY m."scheduledAt" ASC,m.id ASC LIMIT 3`;
}
