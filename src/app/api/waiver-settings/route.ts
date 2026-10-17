import {NextResponse} from "next/server";
import {getStaffTenant,getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {legalForm} from "@/lib/waivers/forms";
async function handleGET(){const tenant=await getStaffTenant();return NextResponse.json({validityDays:tenant?.waiverValidityDays??null,forms:tenant?.slug==="palmetto-playhouse"?{liability:legalForm("LIABILITY"),rental:legalForm("RENTAL")}:null});}
async function handlePUT(request:Request){let body;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid settings."},{status:400});}if(!body||!(body.validityDays===null||(Number.isInteger(body.validityDays)&&body.validityDays>=1&&body.validityDays<=3650)))return NextResponse.json({error:"Use no automatic expiration or 1–3650 days."},{status:400});await prisma.tenant.update({where:{id:getStaffContext().tenantId},data:{waiverValidityDays:body.validityDays}});return NextResponse.json({saved:true});}
export const GET = withStaff("read",handleGET);
export const PUT = withStaff("settings.write",handlePUT);
