import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
async function handleGET(request:Request){const q=new URL(request.url).searchParams.get("q")?.trim()||"";if(q.length<2||q.length>254)return NextResponse.json({parents:[]});const parents=await prisma.parent.findMany({where:{tenantId:getStaffContext().tenantId,family:{status:"ACTIVE"},OR:[{email:{contains:q,mode:"insensitive"}},{lastName:{contains:q,mode:"insensitive"}}]},select:{id:true,firstName:true,lastName:true,email:true,authUserId:true},take:20,orderBy:{lastName:"asc"}});return NextResponse.json({parents:parents.map(p=>({...p,authUserId:undefined,linked:!!p.authUserId}))});}
async function handlePOST(){return NextResponse.json({error:"Open Families → the family record → Access & management to create a verified, audited access link."},{status:410});}
export const GET = withStaff("settings.write",handleGET);
export const POST = withStaff("settings.write",handlePOST);
