import {Prisma} from "@/generated/prisma/client";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {hasPermission} from "@/lib/auth/permissions";
import {checkVersion} from "@/lib/parent/profile";
import {lockVisits,visitRequestId} from "@/lib/visits/service";
import {assertNoPendingPayment} from "@/lib/payments/pending";
import {membershipBalance} from "./balance";
type Staff={tenantId:string;employeeId:string;name:string;accessRole:string};
export async function renewalSource(tx:Prisma.TransactionClient,tenantId:string,familyId:string,id:string,expected:unknown){
 const m=await tx.membership.findFirst({where:{id,tenantId,familyId},include:{membershipPlan:true}});if(!m)throw new FormError("Membership not found in this family.",404);checkVersion(expected,m.updatedAt);
 if(m.autoRenew||m.stripeSubscriptionId)throw new FormError("This membership has an external billing connection. Review that subscription before changing its term.",409);
 if(m.status==="PENDING"||m.status==="PAUSED")throw new FormError("Resolve the pending or paused membership before renewing.",409);
 if(await tx.membership.findFirst({where:{tenantId,familyId,renewedFromId:m.id},select:{id:true}}))throw new FormError("A renewal already exists. Open the newest membership term instead.",409);
 const balance=await membershipBalance(tx,m),ended=m.status==="CANCELLED"||m.status==="EXPIRED"||!!m.endsAt&&m.endsAt<=new Date();
 if(!ended&&(!balance.valid||balance.remaining!==0))throw new FormError("Renew when this term has ended or its finite visit credits are used up. Existing rights remain unchanged.",409);
 if(await tx.visit.findFirst({where:{tenantId,familyId,membershipId:m.id,status:"CHECKED_IN",checkedOutAt:null},select:{id:true}}))throw new FormError("Check out current membership visits before renewing.",409);
 return m;
}
export async function changeMembership(tx:Prisma.TransactionClient,staff:Staff,familyId:string,membershipId:string,body:Record<string,unknown>){
 if(!hasPermission(staff.accessRole,"memberships.manage"))throw new FormError("A manager must change membership rights.",403);
 if(Object.keys(body).some(k=>!["action","requestId","updatedAt","reason","delta","confirmEnd"].includes(k)))throw new FormError("This form includes a protected field.");
 const requestId=visitRequestId(body.requestId),hash=signingHash({familyId,membershipId,body,actor:staff.employeeId});await lockVisits(tx,staff.tenantId);
 const m=await tx.membership.findFirst({where:{id:membershipId,tenantId:staff.tenantId,familyId},include:{family:true,membershipPlan:true,counterSale:{include:{payments:true}}}});if(!m)throw new FormError("Membership not found.",404);
 const prior=await tx.membershipChange.findUnique({where:{tenantId_requestId:{tenantId:staff.tenantId,requestId}}});if(prior){if(prior.membershipId!==m.id||prior.requestHash!==hash||prior.staffId!==staff.employeeId)throw new FormError("This request already saved different details.",409);return {saved:true,replayed:true};}
 checkVersion(body.updatedAt,m.updatedAt);
 if(m.family.status!=="ACTIVE")throw new FormError("Restore this family before changing membership rights.",409);
 if(typeof body.reason!=="string"||!body.reason.trim()||body.reason.length>500)throw new FormError("Enter a reason up to 500 characters.");
 if(m.autoRenew||m.stripeSubscriptionId)throw new FormError("An external subscription is recorded. Ending local access would not cancel its billing. Review the provider subscription first.",409);
 if(m.counterSale)await assertNoPendingPayment(tx,staff.tenantId,[`sale:${m.counterSale.id}`]);
 let delta=0;
 if(body.action==="end"){
  if(body.confirmEnd!==true)throw new FormError("Confirm that membership access ends now and no refund is processed.");
  if(!["ACTIVE","PAUSED"].includes(m.status))throw new FormError(m.status==="PENDING"?"Void its unpaid enrollment bill instead of ending a pending membership.":"This membership has already ended.",409);
  if(await tx.visit.findFirst({where:{tenantId:staff.tenantId,familyId,membershipId:m.id,status:"CHECKED_IN",checkedOutAt:null},select:{id:true}}))throw new FormError("Check out active membership visits before ending access.",409);
  await tx.membership.update({where:{id:m.id,tenantId:staff.tenantId,familyId},data:{status:"CANCELLED",cancelledAt:new Date(),autoRenew:false,nextBillingAt:null}});
 }else if(body.action==="adjust"){
  if(m.status!=="ACTIVE"||m.startsAt>new Date()||m.endsAt&&m.endsAt<=new Date()||m.counterSale&&m.counterSale.status!=="PAID")throw new FormError("Adjust credits only on a current paid membership.",409);
  if(!Number.isSafeInteger(body.delta)||Number(body.delta)===0||Math.abs(Number(body.delta))>1000)throw new FormError("Enter a non-zero whole-number credit correction between -1,000 and 1,000.");delta=Number(body.delta);
  const b=await membershipBalance(tx,m);if(!b.valid||b.totalLimit===null)throw new FormError("Credit corrections require a valid finite visit pack.",409);
  if(b.totalLimit+delta<b.used||b.totalLimit+delta>1000000)throw new FormError("Corrections cannot remove already-used visits or exceed one million credits.",409);
  await tx.membership.update({where:{id:m.id,tenantId:staff.tenantId,familyId},data:{visitCreditAdjustment:{increment:delta}}});
 }else throw new FormError("Choose a supported membership action.");
 await tx.membershipChange.create({data:{tenantId:staff.tenantId,membershipId:m.id,familyId,action:String(body.action),creditDelta:delta,reason:body.reason.trim(),staffId:staff.employeeId,staffName:staff.name,requestId,requestHash:hash}});
 return {saved:true,replayed:false};
}
