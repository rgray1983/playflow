import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {FormError} from "@/lib/waivers/signing";
import {recordId} from "@/lib/visits/service";
import {archiveBlockers} from "@/lib/families/lifecycle";
import {manageFamily} from "@/lib/families/management";
type Params={params:Promise<{familyId:string}>};
async function get(_request:Request,{params}:Params){try{
 const staff=getStaffContext(),id=recordId((await params).familyId,"a family");
 const family=await prisma.family.findFirst({where:{id,tenantId:staff.tenantId},select:{id:true,name:true,status:true,updatedAt:true}});if(!family)throw new FormError("Family not found.",404);
 return NextResponse.json({family,blockers:family.status==="ACTIVE"?await archiveBlockers(prisma,staff.tenantId,id):[]});
}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
async function post(request:Request,{params}:Params){try{
 let b;try{b=await request.json();}catch{throw new FormError("Invalid management request.");}if(!b||typeof b!=="object"||Array.isArray(b))throw new FormError("Invalid management request.");
 const staff=getStaffContext(),id=recordId((await params).familyId,"a family");
 return NextResponse.json(await prisma.$transaction(tx=>manageFamily(tx,staff,id,b),{timeout:20000}));
}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const GET = withStaff("families.manage",get);
export const POST = withStaff("families.manage",post);
