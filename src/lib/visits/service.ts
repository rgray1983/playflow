import {Prisma} from "@/generated/prisma/client";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {childFields,profileFields} from "@/lib/parent/profile";
import {normalizePhone} from "@/lib/booking/rules";

type DB=Prisma.TransactionClient;
export type VisitStaff={tenantId:string;employeeId:string;name:string};
export function visitRequestId(value:unknown){if(typeof value!=="string"||!/^[A-Za-z0-9-]{16,100}$/.test(value))throw new FormError("Refresh this form and try again.");return value;}
export function recordId(value:unknown,label:string){if(typeof value!=="string"||!value||value.length>100)throw new FormError(`Choose ${label}.`);return value;}
export async function lockVisits(tx:DB,tenantId:string){await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);}
export function validCoverageWhere(tenantId:string,familyId:string,now=new Date()):Prisma.WaiverChildWhereInput{return{status:"VALID",signedAt:{not:null},waiver:{tenantId,familyId,kind:"LIABILITY",status:"VALID",signedAt:{not:null},version:{not:null},OR:[{expiresAt:null},{expiresAt:{gt:now}}]}};}
export type RecordedMembership={id:string;tenantId:string;familyId:string;childId:string|null;name:string;status:string;startsAt:Date;endsAt:Date|null;termsSnapshot?:unknown;membershipPlan:{id:string;tenantId:string;name:string;visitLimit:number|null}|null};
export async function membershipUse(tx:DB,membership:RecordedMembership,tenantId:string,familyId:string,childId:string,now=new Date()){
  if(membership.tenantId!==tenantId||membership.familyId!==familyId||(membership.childId&&membership.childId!==childId))return {eligible:false,reason:"Not assigned to this child or family.",remaining:null,used:0};
  if(membership.status!=="ACTIVE")return{eligible:false,reason:`Membership is ${membership.status.toLowerCase()}.`,remaining:null,used:0};
  if(membership.startsAt>now||membership.endsAt&&membership.endsAt<=now)return{eligible:false,reason:"Membership is outside its recorded dates.",remaining:null,used:0};
  const plan=membership.membershipPlan;
  const terms=membership.termsSnapshot as {version?:number;visitLimit?:number|null}|null|undefined;
  if(terms?.version!==1&&(!plan||plan.tenantId!==tenantId))return{eligible:false,reason:"The membership plan needs venue review.",remaining:null,used:0};
  const limit=terms?.version===1?terms.visitLimit:plan!.visitLimit;
  if(limit===null)return{eligible:true,reason:"Unlimited recorded visits.",remaining:null,used:0};
  if(typeof limit!=="number"||!Number.isInteger(limit)||limit<0)return{eligible:false,reason:"The membership visit limit needs venue review.",remaining:null,used:0};
  const used=await tx.visit.count({where:{tenantId,familyId,membershipId:membership.id,status:{not:"CANCELLED"},checkedInAt:{gte:membership.startsAt}}});
  const remaining=Math.max(0,limit-used);
  return{eligible:remaining>0,reason:remaining?`${remaining} visits left in the recorded membership term.`:"No visits remaining in this membership term.",remaining,used};
}
export async function intakeFamily(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
  const requestId=visitRequestId(input.requestId);
  if(!input.guardian||typeof input.guardian!=="object"||Array.isArray(input.guardian))throw new FormError("Enter the guardian’s details.");
  const guardian=profileFields(input.guardian as Record<string,unknown>),email=(input.guardian as Record<string,unknown>).email;
  if(typeof email!=="string"||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw new FormError("Enter the guardian’s email for their waiver.");
  if(!Array.isArray(input.children)||!input.children.length||input.children.length>10||input.children.some(child=>!child||typeof child!=="object"||Array.isArray(child)))throw new FormError("Add one to ten children.");
  const children=input.children.map(child=>childFields(child as Record<string,unknown>));
  const childKeys=children.map(c=>`${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}|${c.dateOfBirth?.toISOString()??""}`);
  if(new Set(childKeys).size!==children.length)throw new FormError("The same child is listed more than once.");
  const contact={...guardian,email:email.trim().toLowerCase()},hash=signingHash({contact,children});
  await lockVisits(tx,staff.tenantId);
  const existing=await tx.family.findFirst({where:{tenantId:staff.tenantId,intakeRequestId:requestId}});
  if(existing){if(existing.intakeRequestHash!==hash)throw new FormError("This intake request already saved different details. Start a new form.",409);return{familyId:existing.id,replayed:true};}
  const possible=await tx.parent.findMany({where:{tenantId:staff.tenantId,OR:[{email:{equals:contact.email,mode:"insensitive"}},{firstName:{equals:contact.firstName,mode:"insensitive"},lastName:{equals:contact.lastName,mode:"insensitive"}}]},take:21,select:{phone:true,email:true}});
  if(possible.length>20||possible.some(p=>p.email?.toLowerCase()===contact.email||p.phone&&normalizePhone(p.phone)===normalizePhone(contact.phone)))throw new FormError("A matching guardian record already exists. Search and select the existing family before adding another.",409);
  const family=await tx.family.create({data:{tenantId:staff.tenantId,name:`${contact.lastName} Family`,intakeRequestId:requestId,intakeRequestHash:hash,parents:{create:{tenantId:staff.tenantId,...contact}},children:{create:children.map((child,index)=>({tenantId:staff.tenantId,...child,intakeRequestId:`${requestId}-${index}`}))}}});
  return{familyId:family.id,replayed:false};
}
export async function addVisitChild(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
  const requestId=visitRequestId(input.requestId),familyId=recordId(input.familyId,"a family"),fields=childFields(input);
  await lockVisits(tx,staff.tenantId);
  const family=await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId,status:"ACTIVE"}});
  if(!family)throw new FormError("Active family not found.",404);
  const existing=await tx.child.findFirst({where:{tenantId:staff.tenantId,intakeRequestId:requestId}});
  if(existing){if(existing.familyId!==familyId||signingHash({firstName:existing.firstName,lastName:existing.lastName,dateOfBirth:existing.dateOfBirth,allergies:existing.allergies,medicalNotes:existing.medicalNotes})!==signingHash(fields))throw new FormError("This request already saved different child details. Start a new form.",409);return{childId:existing.id,familyId,replayed:true};}
  if(await tx.child.findFirst({where:{tenantId:staff.tenantId,familyId,firstName:{equals:fields.firstName,mode:"insensitive"},lastName:{equals:fields.lastName,mode:"insensitive"},dateOfBirth:fields.dateOfBirth}}))throw new FormError("A child with these details is already on this family. Review the existing record, including archived children.",409);
  const child=await tx.child.create({data:{tenantId:staff.tenantId,familyId,...fields,intakeRequestId:requestId}});
  return{childId:child.id,familyId,replayed:false};
}
export async function checkInVisits(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
  const requestId=visitRequestId(input.requestId),familyId=recordId(input.familyId,"a family"),guardianParentId=recordId(input.guardianParentId,"the attending guardian");
  if(!Array.isArray(input.entries)||!input.entries.length||input.entries.length>10)throw new FormError("Select one to ten children.");
  const entries=input.entries.map(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value))throw new FormError("Choose admission or membership for every child.");
    const entry=value as Record<string,unknown>,childId=recordId(entry.childId,"a child");
    if(entry.mode==="MEMBERSHIP")return{childId,mode:"MEMBERSHIP" as const,membershipId:recordId(entry.membershipId,"a membership")};
    if(entry.mode!=="ADMISSION"||typeof entry.listedPrice!=="number"||!Number.isFinite(entry.listedPrice)||entry.listedPrice<0)throw new FormError("Choose an admission type and check its listed price.");
    return{childId,mode:"ADMISSION" as const,admissionTypeId:recordId(entry.admissionTypeId,"an admission type"),listedPrice:entry.listedPrice};
  }).sort((a,b)=>a.childId.localeCompare(b.childId));
  if(new Set(entries.map(e=>e.childId)).size!==entries.length)throw new FormError("Select each child only once.");
  if(entries.some(e=>e.mode==="ADMISSION")&&input.admissionAcknowledged!==true)throw new FormError("Acknowledge that admission payment is handled separately from check-in.");
  const hash=signingHash({familyId,guardianParentId,entries});
  await lockVisits(tx,staff.tenantId);
  const existing=await tx.visit.findMany({where:{tenantId:staff.tenantId,requestId},orderBy:{childId:"asc"},select:{id:true,requestHash:true,status:true}});
  if(existing.length){if(existing.length!==entries.length||existing.some(v=>v.requestHash!==hash))throw new FormError("This check-in request already saved different details. Refresh before starting another.",409);return{visitIds:existing.map(v=>v.id),replayed:true};}
  const family=await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId,status:"ACTIVE"}});
  const guardian=await tx.parent.findFirst({where:{id:guardianParentId,tenantId:staff.tenantId,familyId},select:{id:true}});
  if(!family||!guardian)throw new FormError("Choose an active family and its attending guardian.",404);
  const ids:string[]=[];
  for(const entry of entries){
    const child=await tx.child.findFirst({where:{id:entry.childId,tenantId:staff.tenantId,familyId,active:true}});
    if(!child)throw new FormError("A selected child is not active in this family.",404);
    if(await tx.visit.findFirst({where:{tenantId:staff.tenantId,childId:child.id,status:"CHECKED_IN",checkedOutAt:null},select:{id:true}}))throw new FormError(`${child.firstName} is already checked in. Refresh the inside list.`,409);
    const now=new Date();
    const coverage=await tx.waiverChild.findFirst({where:{...validCoverageWhere(staff.tenantId,familyId,now),childId:child.id},orderBy:{signedAt:"desc"},include:{waiver:{select:{id:true,version:true,signedAt:true,expiresAt:true}}}});
    if(!coverage)throw new FormError(`A signed, valid liability waiver is required for ${child.firstName}.`,409);
    let admissionTypeId:string|null=null,membershipId:string|null=null,visitType:string,snapshot:Prisma.InputJsonObject;
    if(entry.mode==="MEMBERSHIP"){
      const member=await tx.membership.findFirst({where:{id:entry.membershipId,tenantId:staff.tenantId,familyId},include:{membershipPlan:{select:{id:true,name:true,tenantId:true,visitLimit:true}}}});
      if(!member)throw new FormError("Membership not found in this family.",404);
      const use=await membershipUse(tx,member,staff.tenantId,familyId,child.id,now);
      if(!use.eligible)throw new FormError(`${child.firstName}: ${use.reason}`,409);
      membershipId=member.id;visitType=member.name;
      snapshot={mode:"MEMBERSHIP",name:member.name,planId:member.membershipPlan?.id??null,termStartsAt:member.startsAt.toISOString(),termEndsAt:member.endsAt?.toISOString()??null,visitLimit:member.termsSnapshot?(member.termsSnapshot as {visitLimit:number|null}).visitLimit:member.membershipPlan!.visitLimit,usedAfterEntry:use.remaining===null?null:use.used+1};
    }else{
      const admission=await tx.admissionType.findFirst({where:{id:entry.admissionTypeId,tenantId:staff.tenantId,active:true}});
      const listedPrice=Number(admission?.price);
      if(!admission||!Number.isFinite(listedPrice)||listedPrice<0||listedPrice>99999999)throw new FormError("Choose an active admission type with a valid price.");
      if(Math.round(listedPrice*100)!==Math.round(entry.listedPrice*100))throw new FormError("The admission price changed. Refresh and review it before check-in.",409);
      admissionTypeId=admission.id;visitType=admission.name;snapshot={mode:"ADMISSION",name:admission.name,listedPrice,currency:"USD",pricing:"LIST_PRICE_ONLY",paymentStatus:"NOT_RECORDED"};
    }
    const visit=await tx.visit.create({data:{tenantId:staff.tenantId,familyId,childId:child.id,guardianParentId,requestId,requestHash:hash,status:"CHECKED_IN",checkedInAt:now,visitType,admissionTypeId,membershipId,waiverChildId:coverage.id,admissionSnapshot:{...snapshot,waiver:{documentId:coverage.waiver.id,version:coverage.waiver.version,signedAt:coverage.waiver.signedAt!.toISOString(),coverageId:coverage.id}},checkInStaffId:staff.employeeId,checkInStaffName:staff.name}});
    ids.push(visit.id);
  }
  return{visitIds:ids,replayed:false};
}
export async function checkOutVisits(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
  if(!Array.isArray(input.visitIds)||!input.visitIds.length||input.visitIds.length>20||input.visitIds.some(id=>typeof id!=="string"||id.length>100)||new Set(input.visitIds).size!==input.visitIds.length)throw new FormError("Choose up to twenty current visits.");
  await lockVisits(tx,staff.tenantId);
  const visits=await tx.visit.findMany({where:{tenantId:staff.tenantId,id:{in:input.visitIds as string[]}}});
  if(visits.length!==input.visitIds.length)throw new FormError("One or more visits were not found in this business.",404);
  if(visits.some(v=>v.status==="CANCELLED"))throw new FormError("A cancelled visit cannot be checked out.",409);
  const now=new Date();let changed=0;
  for(const visit of visits){if(visit.status==="CHECKED_OUT")continue;await tx.visit.update({where:{id:visit.id,tenantId:staff.tenantId},data:{status:"CHECKED_OUT",checkedOutAt:visit.checkedOutAt??now,checkOutStaffId:staff.employeeId,checkOutStaffName:staff.name}});changed++;}
  return{checkedOut:changed,visitIds:visits.map(v=>v.id)};
}
