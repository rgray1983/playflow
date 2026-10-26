import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {FormError} from "@/lib/waivers/signing";
import {recordId} from "@/lib/visits/service";
import {staffFamilyHistory} from "@/lib/families/history";
async function get(request:Request,{params}:{params:Promise<{familyId:string}>}){try{return NextResponse.json(await staffFamilyHistory(prisma,getStaffContext(),recordId((await params).familyId,"a family"),new URL(request.url).searchParams));}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const GET = withStaff("families.read",get);
