import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {operations,tenantForms,validateFormContent} from "@/lib/operations/settings";
async function get(){const tenant=await prisma.tenant.findUniqueOrThrow({where:{id:getStaffContext().tenantId}});return NextResponse.json({validityDays:tenant.waiverValidityDays,forms:tenantForms(tenant)});}
async function put(request:Request){
 let body;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid settings."},{status:400});}
 try{
  return await prisma.$transaction(async tx=>{
   const tenantId=getStaffContext().tenantId;
   await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);
   const tenant=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
   if(body?.action==="publish"){
    if(body.kind!=="LIABILITY"&&body.kind!=="RENTAL")return NextResponse.json({error:"Choose a form."},{status:400});
    const kind=body.kind as "LIABILITY"|"RENTAL",current=kind==="LIABILITY"?tenantForms(tenant)?.liability:tenantForms(tenant)?.rental;
    if((current?.version??null)!==body.previousVersion)return NextResponse.json({error:"Another staff member updated this form. Reload before publishing."},{status:409});
    const content=validateFormContent(body.form,kind),form={...content,version:`form-${randomUUID()}`},settings=operations(tenant.operationalSettings);
    await tx.tenant.update({where:{id:tenantId},data:{operationalSettings:{...settings,forms:{...settings.forms,[kind]:form}} as unknown as Prisma.InputJsonValue}});
    return NextResponse.json({saved:true,form});
   }
   if(!body||!(body.validityDays===null||(Number.isInteger(body.validityDays)&&body.validityDays>=1&&body.validityDays<=3650)))return NextResponse.json({error:"Use no automatic expiration or 1–3650 days."},{status:400});
   await tx.tenant.update({where:{id:tenantId},data:{waiverValidityDays:body.validityDays}});return NextResponse.json({saved:true});
  });
 }catch(error){if(error instanceof Error&&error.message.startsWith("Enter ")||error instanceof Error&&/^(Add |Each section|Section IDs)/.test(error.message))return NextResponse.json({error:error.message},{status:400});throw error;}
}
export const GET = withStaff("read",get);
export const PUT = withStaff("settings.write",put);
