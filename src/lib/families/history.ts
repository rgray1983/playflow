import {Prisma} from "@/generated/prisma/client";
import {FormError} from "@/lib/waivers/signing";
import {hasPermission} from "@/lib/auth/permissions";
import {recordId,membershipUse} from "@/lib/visits/service";
import {receiptSelect} from "@/lib/counter/select";
import {familyCheckoutCondition} from "./lifecycle";
type Staff={tenantId:string;accessRole:string};
export async function staffFamilyHistory(tx:Prisma.TransactionClient,staff:Staff,familyId:string,q:URLSearchParams){
 if(!hasPermission(staff.accessRole,"families.read"))throw new FormError("Family history permission is required.",403);
 if(!await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId},select:{id:true}}))throw new FormError("Family not found.",404);
 const family={tenantId:staff.tenantId,familyId};
 if(q.has("document")){
  const document=await tx.waiver.findFirst({where:{...family,id:recordId(q.get("document"),"a saved document"),signedAt:{not:null}},select:{id:true,kind:true,status:true,version:true,signedAt:true,expiresAt:true,signerName:true,signerEmail:true,signature:true,photoConsent:true,waiverText:true,children:{select:{childId:true,childNameSnapshot:true,dateOfBirthSnapshot:true,signedAt:true,status:true}},party:{select:{title:true}}}});
  if(!document)throw new FormError("Saved document not found.",404);return {document};
 }
 const section=q.get("section")??"forms",page=Number(q.get("page")??1);
 if(!Number.isInteger(page)||page<1||page>10000)throw new FormError("Choose a valid history page.");
 if(["counter","payments","square"].includes(section)&&!hasPermission(staff.accessRole,"payments.write"))throw new FormError("Payment permission is required for financial history.",403);
 const pagination={skip:(page-1)*20,take:21};let records:unknown[];
 switch(section){
 case "forms":records=await tx.waiver.findMany({where:{...family,signedAt:{not:null}},...pagination,orderBy:[{signedAt:"desc"},{id:"desc"}],select:{id:true,kind:true,status:true,version:true,signedAt:true,expiresAt:true,signerName:true,children:{select:{childNameSnapshot:true,status:true}},party:{select:{title:true}}}});break;
 case "visits":records=await tx.visit.findMany({where:family,...pagination,orderBy:[{checkedInAt:"desc"},{id:"desc"}],select:{id:true,checkedInAt:true,checkedOutAt:true,status:true,visitType:true,admissionSnapshot:true,counterSale:{select:{status:true}},child:{select:{firstName:true,lastName:true}}}});break;
 case "bookings":{
  const parties=await tx.party.findMany({where:{tenantId:staff.tenantId,OR:[{familyId},{primaryParent:{tenantId:staff.tenantId,familyId}},{guests:{some:{tenantId:staff.tenantId,child:{tenantId:staff.tenantId,familyId}}}}]},...pagination,orderBy:[{startTime:"desc"},{id:"desc"}],select:{id:true,title:true,status:true,startTime:true,endTime:true,familyId:true,primaryParent:{select:{familyId:true}},guests:{where:{tenantId:staff.tenantId,child:{tenantId:staff.tenantId,familyId}},take:100,select:{guestName:true,status:true,rsvpStatus:true}}}});
  records=parties.map(({familyId:hostId,primaryParent,...p})=>({...p,role:hostId===familyId||primaryParent?.familyId===familyId?"Hosting family":"Guest family"}));break;
 }
 case "memberships":{
  const memberships=await tx.membership.findMany({where:family,...pagination,orderBy:[{startsAt:"desc"},{id:"desc"}],select:{id:true,tenantId:true,familyId:true,childId:true,name:true,status:true,startsAt:true,endsAt:true,autoRenew:true,visitCreditAdjustment:true,termsSnapshot:true,membershipPlan:{select:{id:true,tenantId:true,name:true,visitLimit:true}},child:{select:{firstName:true,lastName:true}}}});
  records=await Promise.all(memberships.map(async m=>{const use=await membershipUse(tx,m,staff.tenantId,familyId,m.childId??"");return {id:m.id,name:m.name,status:m.status,startsAt:m.startsAt,endsAt:m.endsAt,autoRenew:m.autoRenew,child:m.child,remaining:use.remaining,eligibilityReason:use.reason};}));break;
 }
 case "counter":records=await tx.counterSale.findMany({where:family,...pagination,orderBy:[{createdAt:"desc"},{id:"desc"}],select:receiptSelect});break;
 case "payments":records=await tx.eventPayment.findMany({where:{tenantId:staff.tenantId,party:{tenantId:staff.tenantId,OR:[{familyId},{primaryParent:{tenantId:staff.tenantId,familyId}}]}},...pagination,orderBy:[{collectedAt:"desc"},{id:"desc"}],select:{id:true,amount:true,method:true,providerMode:true,status:true,purpose:true,collectedAt:true,party:{select:{title:true}}}});break;
 case "square":{
  const ids=await tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT c.id FROM "ProviderCheckout" c WHERE ${familyCheckoutCondition(staff.tenantId,familyId)} ORDER BY c."createdAt" DESC,c.id DESC LIMIT 21 OFFSET ${(page-1)*20}`);
  records=ids.length?await tx.providerCheckout.findMany({where:{tenantId:staff.tenantId,id:{in:ids.map(c=>c.id)}},orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,mode:true,status:true,amountCents:true,createdAt:true,refunds:{where:{tenantId:staff.tenantId},orderBy:{createdAt:"desc"},take:20,select:{id:true,status:true,amountCents:true,createdAt:true}}}}):[];break;
 }
 case "archived":records=await tx.child.findMany({where:{...family,active:false},...pagination,orderBy:[{firstName:"asc"},{id:"asc"}],select:{id:true,firstName:true,lastName:true,dateOfBirth:true,updatedAt:true}});break;
 default:throw new FormError("Choose a history section.");
 }
 return {records:records.slice(0,20),hasMore:records.length>20,page};
}
