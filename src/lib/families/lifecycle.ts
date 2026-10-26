import {Prisma} from "@/generated/prisma/client";
import {FormError} from "@/lib/waivers/signing";
// Existing money and activity are resolved in their owning workflows, never by archive.
export const blockerDefinitions=[
 ["visits","Children still checked in","/check-in"],
 ["guestVisits","Party guests still checked in","/parties"],
 ["hostedParties","Upcoming or ongoing hosted parties","/parties"],
 ["guestParties","Upcoming or ongoing guest attendance","/parties"],
 ["memberships","Active, pending or paused memberships","/pos"],
 ["bills","Unpaid counter bills","/pos"],
 ["unbilled","Unbilled admission visits","/pos"],
 ["partyBalances","Unpaid party balances","/parties"],
 ["legacyPayments","Unresolved membership or party payments","/reports"],
 ["checkouts","Pending or review Square payments","/reports"],
 ["refunds","Pending or review refunds","/reports"],
] as const;
export function familyCheckoutCondition(tenantId:string,familyId:string){
 const hosted=Prisma.sql`p."tenantId"=${tenantId} AND (p."familyId"=${familyId} OR EXISTS(SELECT 1 FROM "Parent" a WHERE a.id=p."primaryParentId" AND a."tenantId"=${tenantId} AND a."familyId"=${familyId}))`;
 return Prisma.sql`c."tenantId"=${tenantId} AND ((c.payload->>'kind'='counter' AND c.payload->>'familyId'=${familyId}) OR EXISTS(SELECT 1 FROM "CounterSale" s WHERE s."tenantId"=${tenantId} AND s."familyId"=${familyId} AND ('sale:'||s.id)=ANY(c."targetKeys")) OR EXISTS(SELECT 1 FROM "Party" p WHERE ${hosted} AND ((c.payload->>'kind'='party' AND c.payload->>'partyId'=p.id) OR ('party:'||p.id)=ANY(c."targetKeys"))))`;
}
export function archiveBlockerQuery(tenantId:string,familyId:string,now=new Date()){
 const hosted=Prisma.sql`p."tenantId"=${tenantId} AND (p."familyId"=${familyId} OR EXISTS(SELECT 1 FROM "Parent" a WHERE a.id=p."primaryParentId" AND a."tenantId"=${tenantId} AND a."familyId"=${familyId}))`;
 const viable=Prisma.sql`p.status <> 'CANCELLED' AND (p.status <> 'PENDING' OR p."confirmationExpiresAt" IS NULL OR p."confirmationExpiresAt">${now})`;
 const guestFamily=Prisma.sql`g."tenantId"=${tenantId} AND EXISTS(SELECT 1 FROM "Child" c WHERE c.id=g."childId" AND c."tenantId"=${tenantId} AND c."familyId"=${familyId})`;
 // Check both the canonical payload and bill keys, including old intents.
 const checkoutFamily=familyCheckoutCondition(tenantId,familyId);
 return Prisma.sql`SELECT
 (SELECT count(*)::integer FROM "Visit" v WHERE v."tenantId"=${tenantId} AND v."familyId"=${familyId} AND v.status='CHECKED_IN' AND v."checkedOutAt" IS NULL) AS visits,
 (SELECT count(*)::integer FROM "PartyGuest" g WHERE ${guestFamily} AND g.status='CHECKED_IN' AND g."checkedOutAt" IS NULL) AS "guestVisits",
 (SELECT count(*)::integer FROM "Party" p WHERE ${hosted} AND ${viable} AND p.status <> 'COMPLETED' AND p."endTime">${now}) AS "hostedParties",
 (SELECT count(*)::integer FROM "PartyGuest" g JOIN "Party" p ON p.id=g."partyId" AND p."tenantId"=${tenantId} WHERE ${guestFamily} AND ${viable} AND p.status <> 'COMPLETED' AND p."endTime">${now} AND g."rsvpStatus" <> 'DECLINED' AND g.status IN ('EXPECTED','CHECKED_IN')) AS "guestParties",
 (SELECT count(*)::integer FROM "Membership" m WHERE m."tenantId"=${tenantId} AND m."familyId"=${familyId} AND (m.status IN ('PENDING','PAUSED') OR (m.status='ACTIVE' AND (m."autoRenew" OR m."endsAt" IS NULL OR m."endsAt">${now})))) AS memberships,
 (SELECT count(*)::integer FROM "CounterSale" s WHERE s."tenantId"=${tenantId} AND s."familyId"=${familyId} AND s.status='OPEN' AND s."totalCents">COALESCE((SELECT sum(cp."amountCents") FROM "CounterPayment" cp WHERE cp."saleId"=s.id AND cp."tenantId"=${tenantId}),0)) AS bills,
 (SELECT count(*)::integer FROM "Visit" v WHERE v."tenantId"=${tenantId} AND v."familyId"=${familyId} AND v.status <> 'CANCELLED' AND v."counterSaleId" IS NULL AND v."membershipId" IS NULL AND v."admissionSnapshot"->>'mode'='ADMISSION' AND (CASE WHEN jsonb_typeof(v."admissionSnapshot"->'listedPrice')='number' THEN (v."admissionSnapshot"->>'listedPrice')::numeric>0 ELSE true END)) AS unbilled,
 (SELECT count(*)::integer FROM "Party" p WHERE ${hosted} AND ${viable} AND (COALESCE(p."balanceDue",0)>0 OR (p."depositStatus"='PENDING' AND COALESCE(p."depositAmount",0)>COALESCE((SELECT sum(e.amount) FROM "EventPayment" e WHERE e."tenantId"=${tenantId} AND e."partyId"=p.id AND e.purpose='DEPOSIT' AND e.status='PAID'),0)))) AS "partyBalances",
 ((SELECT count(*) FROM "MembershipPayment" m WHERE m."tenantId"=${tenantId} AND m."familyId"=${familyId} AND m.status='PENDING' AND m.amount>0)+(SELECT count(*) FROM "EventPayment" e JOIN "Party" p ON p.id=e."partyId" WHERE e."tenantId"=${tenantId} AND ${hosted} AND e.status='PENDING' AND e.amount>0))::integer AS "legacyPayments",
 (SELECT count(*)::integer FROM "ProviderCheckout" c WHERE ${checkoutFamily} AND c.status IN ('PENDING','REVIEW')) AS checkouts,
 (SELECT count(*)::integer FROM "PaymentRefund" r JOIN "ProviderCheckout" c ON c.id=r."checkoutId" WHERE r."tenantId"=${tenantId} AND ${checkoutFamily} AND r.status IN ('PENDING','REVIEW')) AS refunds`;
}
export async function archiveBlockers(tx:Prisma.TransactionClient,tenantId:string,familyId:string){
 const [counts]=await tx.$queryRaw<Record<string,number>[]>(archiveBlockerQuery(tenantId,familyId));
 if(!counts)throw new FormError("Unable to check archive blockers. Refresh before trying again.",409);
 return blockerDefinitions.map(([key,label,href])=>({key,label,href,count:Number(counts[key]??0)})).filter(b=>b.count>0);
}
