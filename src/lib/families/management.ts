import {Prisma} from "@/generated/prisma/client";
import {createHash,randomBytes} from "node:crypto";
import {hasPermission} from "@/lib/auth/permissions";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {profileFields,checkVersion} from "@/lib/parent/profile";
import {recordId,visitRequestId} from "@/lib/visits/service";
import {archiveBlockers} from "./lifecycle";
type Staff={tenantId:string;employeeId:string;name:string;accessRole:string};
const base=["action","requestId","updatedAt"];
export async function manageFamily(tx:Prisma.TransactionClient,staff:Staff,familyId:string,body:Record<string,unknown>){
 if(!hasPermission(staff.accessRole,"families.manage"))throw new FormError("A manager must manage family access or status.",403);
 const requestId=visitRequestId(body.requestId),fingerprint=signingHash({familyId,body,actorId:staff.employeeId});
 await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${staff.tenantId} FOR UPDATE`);
 const family=await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId}});if(!family)throw new FormError("Family not found.",404);
 const prior=await tx.familyChange.findUnique({where:{tenantId_requestId:{tenantId:staff.tenantId,requestId}}});
 if(prior){if(prior.familyId!==familyId||prior.actorId!==staff.employeeId||prior.requestHash!==fingerprint)throw new FormError("This request already saved different details. Refresh and try again.",409);return {action:prior.action,saved:true,replayed:true,memberId:prior.memberId,linkIssued:prior.action==="portal-link",url:null};}
 const allowed=(keys:string[])=>{if(Object.keys(body).some(key=>!keys.includes(key)))throw new FormError("This form includes a field that cannot be managed here.");};
 let memberId:string|null=null,reason:string|null=null,fields:string[]=[],url:string|null=null,expiresAt:Date|null=null,email:string|null=null;
 if(body.action==="archive"||body.action==="restore"){
  allowed([...base,"reason","confirmFamilyName"]);checkVersion(body.updatedAt,family.updatedAt);
  if(body.confirmFamilyName!==family.name)throw new FormError("Type the family display name exactly to confirm.");
  if(typeof body.reason!=="string"||!body.reason.trim()||body.reason.length>500)throw new FormError("Enter a reason up to 500 characters.");reason=body.reason.trim();
  if(body.action==="archive"){
   if(family.status!=="ACTIVE")throw new FormError("This family is already inactive. Refresh its record.",409);
   const blockers=await archiveBlockers(tx,staff.tenantId,familyId);if(blockers.length)throw new FormError("Archive blocked. Resolve the activity and payments shown in the archive preview, then refresh it.",409);
   await tx.family.update({where:{id:familyId,tenantId:staff.tenantId},data:{status:"ARCHIVED"}});
   await tx.parent.updateMany({where:{familyId,tenantId:staff.tenantId},data:{familyClaimHash:null,familyClaimExpiresAt:null}});
  }else{
   if(family.status==="ACTIVE")throw new FormError("This family is already active. Refresh its record.",409);
   await tx.family.update({where:{id:familyId,tenantId:staff.tenantId},data:{status:"ACTIVE"}});
  }
  fields=["status"];
 }else{
  if(family.status!=="ACTIVE")throw new FormError("Restore this family before changing guardians or portal access.",409);
  if(body.action==="add-guardian"){
   const profile=profileFields(body);allowed([...base,...Object.keys(profile),"email","confirmAccess"]);checkVersion(body.updatedAt,family.updatedAt);
   if(body.confirmAccess!==true)throw new FormError("Confirm that this adult is authorized to join the family.");
   if(typeof body.email!=="string"||body.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))throw new FormError("Enter a valid guardian email.");email=body.email.trim().toLowerCase();
   if(await tx.parent.findFirst({where:{tenantId:staff.tenantId,email:{equals:email,mode:"insensitive"}},select:{id:true}}))throw new FormError("This email already has a parent record in this business. Review the existing family before adding another guardian.",409);
   const parent=await tx.parent.create({data:{tenantId:staff.tenantId,familyId,...profile,email}});memberId=parent.id;fields=["parents"];
   await tx.family.update({where:{id:familyId,tenantId:staff.tenantId},data:{updatedAt:new Date()}});
  }else if(body.action==="portal-link"){
   allowed([...base,"parentId","confirmEmail","confirmAccess"]);
   const parent=await tx.parent.findFirst({where:{id:recordId(body.parentId,"a parent"),tenantId:staff.tenantId,familyId}});
   if(!parent)throw new FormError("Parent not found in this family.",404);checkVersion(body.updatedAt,parent.updatedAt);
   if(parent.authUserId)throw new FormError("This adult already has a connected portal account. This tool cannot transfer account ownership.",409);
   if(!parent.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent.email)||body.confirmEmail!==parent.email||body.confirmAccess!==true)throw new FormError("Confirm the intended adult and their current contact email before creating access.");
   const token=randomBytes(32).toString("base64url");expiresAt=new Date(Date.now()+30*60000);email=parent.email;
   await tx.parent.update({where:{id:parent.id,tenantId:staff.tenantId,familyId},data:{familyClaimHash:createHash("sha256").update(token).digest("hex"),familyClaimExpiresAt:expiresAt}});
   const tenant=await tx.tenant.findUniqueOrThrow({where:{id:staff.tenantId},select:{slug:true}});
   url=`/parent/${encodeURIComponent(tenant.slug)}?claim=${token}`;memberId=parent.id;fields=["portalAccessLink"];
  }else throw new FormError("Choose a supported management action.");
 }
 await tx.familyChange.create({data:{tenantId:staff.tenantId,familyId,memberId,actorKind:"STAFF",actorId:staff.employeeId,actorName:staff.name,action:String(body.action),changedFields:fields,requestId,requestHash:fingerprint,reason}});
 return {action:String(body.action),saved:true,replayed:false,memberId,url,email,expiresAt};
}
