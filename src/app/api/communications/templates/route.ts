import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {operations} from "@/lib/operations/settings";
import {emailKinds,emailTemplates,validateEmailCopy,type EmailKind} from "@/lib/communications/copy";
function snapshot(settings:unknown) {
  const templates=emailTemplates(operations(settings).communications?.templates);
  return {templates,revision:createHash("sha256").update(JSON.stringify(templates)).digest("hex")};
}
async function get() {
  const t=await prisma.tenant.findUniqueOrThrow({where:{id:getStaffContext().tenantId},select:{operationalSettings:true,name:true,logoUrl:true,primaryColor:true,accentColor:true,phone:true,email:true,address1:true,address2:true,city:true,state:true,zip:true,timezone:true}});
  const {operationalSettings,...brand}=t;
  return NextResponse.json({...snapshot(operationalSettings),brand});
}
async function put(request:Request) {
  let body;
  try {body=await request.json();}catch{return NextResponse.json({error:"Enter valid email wording."},{status:400});}
  if(!body||typeof body!=="object"||Array.isArray(body)||!emailKinds.includes(body.kind)||typeof body.revision!=="string"||!/^[a-f0-9]{64}$/.test(body.revision))return NextResponse.json({error:"Choose an email and reload its saved wording before editing."},{status:400});
  let template;
  try {template=validateEmailCopy(body.template);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Enter the email wording."},{status:400});}
  const kind=body.kind as EmailKind,tenantId=getStaffContext().tenantId;
  const result=await prisma.$transaction(async tx=>{
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);
    const tenant=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}}),current=snapshot(tenant.operationalSettings);
    if(current.revision!==body.revision)return null;
    const settings=operations(tenant.operationalSettings),updated={...settings,communications:{enabled:false,reminderHours:48,...settings.communications,templates:{...settings.communications?.templates,[kind]:template}}};
    await tx.tenant.update({where:{id:tenantId},data:{operationalSettings:updated as Prisma.InputJsonValue}});
    return snapshot(updated);
  });
  if(!result)return NextResponse.json({error:"Email wording changed in another session. Your edits are still here; load the latest saved wording before saving again."},{status:409});
  return NextResponse.json(result);
}
export const GET = withStaff("settings.write",get);
export const PUT = withStaff("settings.write",put,{scheduleEmailDelivery:false});
