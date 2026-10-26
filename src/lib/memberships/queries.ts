import {Prisma} from "@/generated/prisma/client";
import {FormError} from "@/lib/waivers/signing";
import {hasPermission} from "@/lib/auth/permissions";
import {recordId} from "@/lib/visits/service";
import {receiptSelect} from "@/lib/counter/select";
import {moduleEnabled} from "@/lib/operations/settings";
import {membershipBalance} from "./balance";
type Staff={tenantId:string;accessRole:string};
export async function familyMemberships(tx:Prisma.TransactionClient,staff:Staff,familyId:string,q:URLSearchParams){
 if(!hasPermission(staff.accessRole,"memberships.read"))throw new FormError("Membership access is required.",403);
 const family=await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId},select:{id:true,status:true}});if(!family)throw new FormError("Family not found.",404);
 const page=Number(q.get("page")??1);if(!Number.isInteger(page)||page<1||page>10000)throw new FormError("Choose a valid membership page.");
 const where={tenantId:staff.tenantId,familyId,...(q.has("memberId")?{id:recordId(q.get("memberId"),"a membership")}:{} )};
 const memberships=await tx.membership.findMany({where,skip:(page-1)*20,take:21,orderBy:[{startsAt:"desc"},{id:"desc"}],include:{membershipPlan:{select:{tenantId:true,visitLimit:true}},child:{select:{firstName:true,lastName:true}},counterSale:{select:receiptSelect}}});
 if(q.has("memberId")&&!memberships.length)throw new FormError("Membership not found.",404);
 const successor=memberships.length?await tx.membership.findMany({where:{tenantId:staff.tenantId,familyId,renewedFromId:{in:memberships.map(m=>m.id)}},select:{id:true,renewedFromId:true}}):[];
 const [tenant,plans]=await Promise.all([tx.tenant.findUniqueOrThrow({where:{id:staff.tenantId},select:{operationalSettings:true,timezone:true}}),tx.membershipPlan.findMany({where:{tenantId:staff.tenantId,active:true},orderBy:{name:"asc"},take:100,select:{id:true,name:true,price:true,visitLimit:true,durationDays:true,billingInterval:true}})]);
 const items=await Promise.all(memberships.slice(0,20).map(async m=>{
  const balance=await membershipBalance(tx,m),external=!!(m.autoRenew||m.stripeSubscriptionId),next=successor.find(s=>s.renewedFromId===m.id),expired=!!m.endsAt&&m.endsAt<=new Date(),ended=m.status==="CANCELLED"||m.status==="EXPIRED"||expired;
  return {id:m.id,name:m.name,status:m.status,effectiveStatus:m.status==="ACTIVE"?(expired?"EXPIRED":balance.remaining===0?"USED_UP":"ACTIVE"):m.status,childId:m.childId,child:m.child,startsAt:m.startsAt,endsAt:m.endsAt,updatedAt:m.updatedAt,cancelledAt:m.cancelledAt,balance,renewedFromId:m.renewedFromId,successorId:next?.id??null,externalBilling:external,sale:hasPermission(staff.accessRole,"payments.write")?m.counterSale:null,canRenew:family.status==="ACTIVE"&&moduleEnabled(tenant.operationalSettings,"memberships")&&hasPermission(staff.accessRole,"payments.write")&&!external&&!next&&!["PENDING","PAUSED"].includes(m.status)&&(ended||balance.valid&&balance.remaining===0)};
 }));
 const detail=q.has("memberId")&&items[0];
 const [visits,changes]=detail?await Promise.all([
  tx.visit.findMany({where:{tenantId:staff.tenantId,familyId,membershipId:detail.id},orderBy:[{checkedInAt:"desc"},{id:"desc"}],take:21,select:{id:true,checkedInAt:true,checkedOutAt:true,status:true,child:{select:{firstName:true,lastName:true}}}}),
  tx.membershipChange.findMany({where:{tenantId:staff.tenantId,familyId,membershipId:detail.id},orderBy:[{createdAt:"desc"},{id:"desc"}],take:21,select:{id:true,action:true,creditDelta:true,reason:true,staffName:true,createdAt:true,relatedMembershipId:true}}),
 ]):[[],[]];
 return {items,hasMore:memberships.length>20,page,familyStatus:family.status,canManage:hasPermission(staff.accessRole,"memberships.manage"),canSell:family.status==="ACTIVE"&&moduleEnabled(tenant.operationalSettings,"memberships")&&hasPermission(staff.accessRole,"payments.write"),plans:plans.map(p=>({...p,price:Number(p.price)})),timezone:tenant.timezone,visits:visits.slice(0,20),moreVisits:visits.length>20,changes:changes.slice(0,20),moreChanges:changes.length>20};
}
