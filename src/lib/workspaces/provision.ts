import {Prisma} from "@/generated/prisma/client";
import {normalizeCommerceSettings} from "@/lib/commerce-settings";
import {workspaceFields,WorkspaceError} from "./rules";
type Owner={id:string;email:string;name?:string|null};
export async function provisionWorkspace(tx:Prisma.TransactionClient,user:Owner,input:unknown,mode:"sandbox"|"live"){
 const fields=workspaceFields(input);
 // Serialize duplicate submissions for this verified account; distinct owners remain independent.
 await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`playflow:onboard:${user.id}`},0))::text`);
 const employee=await tx.employee.findUnique({where:{authUserId:user.id},include:{tenant:true}});
 if(employee){
  if(employee.accessRole==="OWNER"&&employee.accessApproved&&employee.status==="ACTIVE"&&employee.tenant.ownerAuthUserId===user.id)return {business:{id:employee.tenant.id,name:employee.tenant.name,slug:employee.tenant.slug},created:false};
  throw new WorkspaceError("This login already belongs to a staff workspace. Use that workspace or a separate owner login.",409,"WORKSPACE_EXISTS");
 }
 const invitation=await tx.employee.findFirst({where:{email:{equals:user.email.trim(),mode:"insensitive"},authUserId:null,accessApproved:true,status:"ACTIVE"},select:{id:true}});
 if(invitation)throw new WorkspaceError("You have a staff invitation. Sign in to open the business that invited you.",409,"STAFF_INVITATION_PENDING");
 if(await tx.tenant.findUnique({where:{slug:fields.slug},select:{id:true}}))throw new WorkspaceError("That business address is unavailable. Choose another.",409,"SLUG_UNAVAILABLE");
 const name=(user.name||user.email.split("@")[0]).trim(),[firstName,...last]=name.split(/\s+/);
 const business=await tx.tenant.create({data:{...fields,ownerAuthUserId:user.id,email:user.email.trim().toLowerCase()},select:{id:true,name:true,slug:true}});
 await tx.employee.create({data:{tenantId:business.id,authUserId:user.id,email:user.email.trim().toLowerCase(),firstName:firstName.slice(0,100),lastName:last.join(" ").slice(0,100),role:"Owner",accessRole:"OWNER",accessApproved:true,status:"ACTIVE"}});
 const defaults=normalizeCommerceSettings({});
 await tx.commerceSettings.create({data:{tenantId:business.id,...defaults,depositRules:{...defaults.depositRules,enabled:false,requiredByDefault:false,flatAmount:0},refundRules:{...defaults.refundRules,enabled:false,allowFullRefund:false,allowPartialRefund:false,allowStoreCredit:false},receiptRules:{...defaults.receiptRules,emailReceiptEnabled:false,smsReceiptEnabled:false},processorRules:{provider:"square",mode,connected:false,accountLabel:""}}});
 // No sample families, prices, waivers, Square credentials, or paid subscription are copied.
 return {business,created:true};
}
