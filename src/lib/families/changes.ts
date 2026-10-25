import {Prisma} from "@/generated/prisma/client";
import {randomUUID} from "node:crypto";
import {hasPermission} from "@/lib/auth/permissions";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {profileFields,childFields,checkVersion,updateChildRecord} from "@/lib/parent/profile";
import {recordId,visitRequestId} from "@/lib/visits/service";
type Staff={tenantId:string;employeeId:string;name:string;accessRole:string};
const equal=(a:unknown,b:unknown)=>a instanceof Date||b instanceof Date?(a instanceof Date?a.toISOString():a)===(b instanceof Date?b.toISOString():b):a===b;
export function changedFields(before:Record<string,unknown>,after:Record<string,unknown>){return Object.keys(after).filter(key=>!equal(before[key],after[key]));}
function allowed(body:Record<string,unknown>,fields:string[]){if(Object.keys(body).some(k=>!fields.includes(k)))throw new FormError("This form includes a field that cannot be edited here.");}
export async function editStaffFamily(tx:Prisma.TransactionClient,staff:Staff,familyId:string,body:Record<string,unknown>){
 if(!hasPermission(staff.accessRole,"families.write"))throw new FormError("Family editing permission is required.",403);
 const requestId=visitRequestId(body.requestId),fingerprint=signingHash({familyId,body,actorId:staff.employeeId});
 await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${staff.tenantId} FOR UPDATE`);
 const family=await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId}});if(!family)throw new FormError("Family not found.",404);
 const existing=await tx.familyChange.findUnique({where:{tenantId_requestId:{tenantId:staff.tenantId,requestId}}});
 if(existing){if(existing.requestHash!==fingerprint||existing.familyId!==familyId||existing.actorId!==staff.employeeId)throw new FormError("This edit request already saved different details. Refresh before trying again.",409);return{saved:true,replayed:true,needsNewWaiver:existing.needsNewWaiver};}
 if(family.status!=="ACTIVE")throw new FormError("This family is inactive. Profile corrections require an active family.",409);
 let memberId:string|null=null,fields:string[]=[],needsNewWaiver=false;
 if(body.action==="family-update"){
  allowed(body,["action","requestId","updatedAt","name","notes"]);checkVersion(body.updatedAt,family.updatedAt);
  if(typeof body.name!=="string"||!body.name.trim()||body.name.length>150)throw new FormError("Enter a family display name up to 150 characters.");
  const data:{name:string;notes?:string|null}={name:body.name.trim()};
  if(body.notes!==undefined){if(!hasPermission(staff.accessRole,"families.manage"))throw new FormError("A manager must update internal family notes.",403);if(body.notes!==null&&(typeof body.notes!=="string"||body.notes.length>2000))throw new FormError("Internal notes must be up to 2,000 characters.");data.notes=typeof body.notes==="string"?body.notes.trim()||null:null;}
  fields=changedFields(family,data);if(fields.length)await tx.family.update({where:{id:familyId,tenantId:staff.tenantId},data});
 }else if(body.action==="parent-update"){
  const data=profileFields(body);allowed(body,["action","requestId","updatedAt","parentId","email",...Object.keys(data)]);
  const parent=await tx.parent.findFirst({where:{id:recordId(body.parentId,"a parent"),familyId,tenantId:staff.tenantId}});if(!parent)throw new FormError("Parent not found in this family.",404);checkVersion(body.updatedAt,parent.updatedAt);
  let email=parent.email;if(body.email!==undefined){if(body.email!==null&&(typeof body.email!=="string"||body.email.length>254))throw new FormError("Enter a valid contact email.");email=typeof body.email==="string"?body.email.trim().toLowerCase()||null:null;if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new FormError("Enter a valid contact email.");}
  fields=changedFields(parent,{...data,email});memberId=parent.id;
  if(fields.length)await tx.parent.update({where:{id:parent.id,tenantId:staff.tenantId,familyId},data:{...data,email,...(email!==parent.email?{familyClaimHash:null,familyClaimExpiresAt:null}:{})}});
 }else if(body.action==="child-update"){
  const data=childFields(body);allowed(body,["action","requestId","updatedAt","childId",...Object.keys(data)]);
  const child=await tx.child.findFirst({where:{id:recordId(body.childId,"a child"),tenantId:staff.tenantId,familyId}});if(!child)throw new FormError("Child not found in this family.",404);if(!child.active)throw new FormError("This child is archived. Restore the child before editing.",409);checkVersion(body.updatedAt,child.updatedAt);
  fields=changedFields(child,data);memberId=child.id;
  if(fields.length){const result=await updateChildRecord(tx,staff.tenantId,familyId,body);needsNewWaiver=!!result.needsNewWaiver;}
 }else throw new FormError("Choose a supported family edit.");
 if(fields.length&&body.action!=="family-update")await tx.family.update({where:{id:familyId,tenantId:staff.tenantId},data:{updatedAt:new Date()}});
 await tx.familyChange.create({data:{tenantId:staff.tenantId,familyId,memberId,actorKind:"STAFF",actorId:staff.employeeId,actorName:staff.name,action:String(body.action),changedFields:fields,requestId,requestHash:fingerprint,needsNewWaiver}});
 return{saved:true,replayed:false,needsNewWaiver};
}
// Parent self-service retains its existing field/access rules. Record who changed permitted fields without copying sensitive values.
export async function auditParentEdit(tx:Prisma.TransactionClient,tenantId:string,parent:{id:string;familyId:string;firstName:string;lastName:string},body:Record<string,unknown>,result:{saved:boolean;needsNewWaiver?:boolean},before:Record<string,unknown>){
 const data=body.action==="profile"?profileFields(body):body.action==="child-update"?childFields(body):{active:body.action==="child-restore"};
 const fields=changedFields(before,data);
 const requestId=typeof body.requestId==="string"?visitRequestId(body.requestId):randomUUID();
 await tx.familyChange.create({data:{tenantId,familyId:parent.familyId,memberId:body.action==="profile"?parent.id:String(body.childId),actorKind:"PARENT",actorId:parent.id,actorName:`${parent.firstName} ${parent.lastName}`.trim(),action:String(body.action),changedFields:fields,requestId,requestHash:signingHash({parentId:parent.id,body}),needsNewWaiver:result.needsNewWaiver??false}});
}
