import type { Prisma } from "@/generated/prisma/client";
import { normalizePhone } from "@/lib/booking/rules";
import { FormError } from "@/lib/waivers/signing";

function text(value:unknown,label:string,max:number,required=false) {
  if(value===null||value===undefined||value===""){if(required)throw new FormError(`Enter ${label}.`);return null;}
  if(typeof value!=="string"||value.length>max)throw new FormError(`Enter a valid ${label}.`);
  const result=value.trim();if(required&&!result)throw new FormError(`Enter ${label}.`);return result||null;
}
function phone(value:unknown,label:string,required=false){const result=text(value,label,30,required);if(result&&(!/^[+0-9() .-]+$/.test(result)||!/^[0-9]{7,15}$/.test(normalizePhone(result))))throw new FormError(`Enter a valid ${label}.`);return result;}
export function childFields(body:Record<string,unknown>) {
  let dateOfBirth:Date|null=null;
  if(body.dateOfBirth!==undefined&&body.dateOfBirth!==null&&body.dateOfBirth!==""){
    if(typeof body.dateOfBirth!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth))throw new FormError("Enter a valid birth date.");
    dateOfBirth=new Date(`${body.dateOfBirth}T00:00:00Z`);
    if(!Number.isFinite(dateOfBirth.getTime())||dateOfBirth.toISOString().slice(0,10)!==body.dateOfBirth||dateOfBirth>new Date())throw new FormError("Enter a valid birth date.");
  }
  return {firstName:text(body.firstName,"child first name",100,true)!,lastName:text(body.lastName,"child last name",100,true)!,dateOfBirth,allergies:text(body.allergies,"allergy notes",2000),medicalNotes:text(body.medicalNotes,"medical or accessibility notes",2000)};
}
export function profileFields(body:Record<string,unknown>){
  return {firstName:text(body.firstName,"first name",100,true)!,lastName:text(body.lastName,"last name",100,true)!,phone:phone(body.phone,"phone number",true)!,address1:text(body.address1,"street address",200),address2:text(body.address2,"address line 2",200),city:text(body.city,"city",100),state:text(body.state,"state",100),zip:text(body.zip,"ZIP code",20),emergencyContact:text(body.emergencyContact,"emergency contact name",150),emergencyPhone:phone(body.emergencyPhone,"emergency contact phone"),relationshipToChild:text(body.relationshipToChild,"relationship to children",100)};
}
export function checkVersion(expected:unknown,actual:Date){if(typeof expected!=="string"||expected!==actual.toISOString())throw new FormError("This record changed in another session. Close this form, refresh, and try again.",409);}

export async function updateFamilyRecord(tx:Prisma.TransactionClient,tenantId:string,parent:{id:string;familyId:string;updatedAt:Date},body:Record<string,unknown>){
  if(body.action==="profile"){
    checkVersion(body.updatedAt,parent.updatedAt);
    await tx.parent.update({where:{id:parent.id,tenantId,familyId:parent.familyId},data:profileFields(body)});
    return {saved:true};
  }
  return updateChildRecord(tx,tenantId,parent.familyId,body);
}

export async function updateChildRecord(tx:Prisma.TransactionClient,tenantId:string,familyId:string,body:Record<string,unknown>){
  const childId=text(body.childId,"child",100,true)!;
  const child=await tx.child.findFirst({where:{id:childId,tenantId,familyId:familyId}});
  if(!child)throw new FormError("Child not found in your family.",404);
  if((body.action==="child-archive"&&!child.active)||(body.action==="child-restore"&&child.active))return {saved:true};
  checkVersion(body.updatedAt,child.updatedAt);
  if(body.action==="child-update"){
    const fields=childFields(body);
    const identityChanged=fields.firstName.toLowerCase()!==child.firstName.toLowerCase()||fields.lastName.toLowerCase()!==child.lastName.toLowerCase()||fields.dateOfBirth?.toISOString()!==child.dateOfBirth?.toISOString();
    await tx.child.update({where:{id:child.id,tenantId,familyId:familyId},data:fields});
    if(identityChanged){
      await tx.waiverChild.updateMany({where:{childId:child.id,status:"VALID",waiver:{tenantId,familyId:familyId,kind:"LIABILITY"}},data:{status:"REVOKED"}});
      await tx.partyGuest.updateMany({where:{tenantId,childId:child.id,status:"EXPECTED",rsvpStatus:{not:"DECLINED"},party:{tenantId,status:{notIn:["CANCELLED","COMPLETED"]},endTime:{gt:new Date()}}},data:{waiverStatus:"NEEDED"}});
    }
    return {saved:true,needsNewWaiver:identityChanged};
  }
  if(body.action==="child-archive"){
    const now=new Date();
    const [visit,membership,partyGuest]=await Promise.all([
      tx.visit.findFirst({where:{tenantId,familyId:familyId,childId:child.id,status:"CHECKED_IN",checkedOutAt:null},select:{id:true}}),
      tx.membership.findFirst({where:{tenantId,familyId:familyId,childId:child.id,status:{in:["ACTIVE","PENDING","PAUSED"]},OR:[{autoRenew:true},{endsAt:null},{endsAt:{gt:now}}]},select:{id:true}}),
      tx.partyGuest.findFirst({where:{tenantId,childId:child.id,rsvpStatus:{not:"DECLINED"},party:{tenantId,status:{notIn:["CANCELLED","COMPLETED"]},endTime:{gt:now},OR:[{status:{not:"PENDING"}},{confirmationExpiresAt:null},{confirmationExpiresAt:{gt:now}}]}},select:{id:true}}),
    ]);
    if(visit||membership||partyGuest)throw new FormError("This child has an active visit, membership, or upcoming party. Contact the venue before archiving.",409);
  }else if(body.action!=="child-restore")throw new FormError("Unknown family update.");
  await tx.child.update({where:{id:child.id,tenantId,familyId:familyId},data:{active:body.action==="child-restore"}});
  return {saved:true};
}
