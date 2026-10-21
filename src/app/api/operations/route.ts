import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {configurableModules,operations} from "@/lib/operations/settings";
async function get(){const t=await prisma.tenant.findUniqueOrThrow({where:{id:getStaffContext().tenantId}});return NextResponse.json({settings:operations(t.operationalSettings),senderReady:!!(process.env.RESEND_API_KEY&&process.env.PLAYFLOW_EMAIL_FROM&&process.env.PLAYFLOW_APP_URL),sender:process.env.PLAYFLOW_EMAIL_FROM??null});}
async function put(request:Request){let body;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid settings."},{status:400});}
 if(body?.section==="modules"){
  if(!configurableModules.includes(body.key)||typeof body.enabled!=="boolean")return NextResponse.json({error:"Choose a supported module."},{status:400});
 }else if(body?.section==="communications"){
  if(typeof body.enabled!=="boolean"||![24,48,72].includes(body.reminderHours))return NextResponse.json({error:"Choose a reminder time."},{status:400});
  if(body.enabled&&!(process.env.RESEND_API_KEY&&process.env.PLAYFLOW_EMAIL_FROM&&process.env.PLAYFLOW_APP_URL))return NextResponse.json({error:"Email delivery needs a verified platform sender before automatic messages can be enabled."},{status:409});
 }else return NextResponse.json({error:"Choose settings to update."},{status:400});
 await prisma.$transaction(async tx=>{const id=getStaffContext().tenantId;await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${id} FOR UPDATE`);const t=await tx.tenant.findUniqueOrThrow({where:{id}}),s=operations(t.operationalSettings);const updated=body.section==="modules"?{...s,modules:{...s.modules,[body.key]:body.enabled}}:{...s,communications:{enabled:body.enabled,reminderHours:body.reminderHours}};await tx.tenant.update({where:{id},data:{operationalSettings:updated as Prisma.InputJsonValue}});});
 return NextResponse.json({saved:true});
}
export const GET = withStaff("settings.write",get);
export const PUT = withStaff("settings.write",put);
