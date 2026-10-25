import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {hasPermission} from "@/lib/auth/permissions";
import {readFamily} from "@/lib/families/queries";
import {editStaffFamily} from "@/lib/families/changes";
import {FormError} from "@/lib/waivers/signing";
import {recordId} from "@/lib/visits/service";
type Params={params:Promise<{familyId:string}>};
async function get(_request:Request,{params}:Params){try{const staff=getStaffContext(),id=recordId((await params).familyId,"a family"),canManage=hasPermission(staff.accessRole,"families.manage"),family=await readFamily(prisma,staff.tenantId,id,canManage);const changes=await prisma.familyChange.findMany({where:{tenantId:staff.tenantId,familyId:id},orderBy:[{createdAt:"desc"},{id:"desc"}],take:20,select:{id:true,action:true,memberId:true,actorKind:true,actorName:true,changedFields:true,needsNewWaiver:true,createdAt:true}});return NextResponse.json({family,changes,canManage,canEdit:family.status==="ACTIVE"&&hasPermission(staff.accessRole,"families.write")});}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
async function put(request:Request,{params}:Params){try{let b;try{b=await request.json();}catch{throw new FormError("Invalid edit.");}if(!b||typeof b!=="object"||Array.isArray(b))throw new FormError("Invalid edit.");const id=recordId((await params).familyId,"a family"),staff=getStaffContext();return NextResponse.json(await prisma.$transaction(tx=>editStaffFamily(tx,staff,id,b),{timeout:20000}));}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const GET = withStaff("families.read",get);
export const PUT = withStaff("families.write",put);
