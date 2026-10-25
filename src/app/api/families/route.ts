import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {listFamilies} from "@/lib/families/queries";
import {intakeFamily,addVisitChild} from "@/lib/visits/service";
import {FormError,signingHash} from "@/lib/waivers/signing";
async function get(request:Request){try{return NextResponse.json(await listFamilies(prisma,getStaffContext().tenantId,new URL(request.url).searchParams));}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
async function post(request:Request){try{let b;try{b=await request.json();}catch{throw new FormError("Invalid family request.");}if(!b||typeof b!=="object"||Array.isArray(b))throw new FormError("Invalid family request.");const staff=getStaffContext();const result=await prisma.$transaction(async tx=>{const r=b.action==="intake"?await intakeFamily(tx,staff,b):b.action==="add-child"?await addVisitChild(tx,staff,b):null;if(!r)throw new FormError("Choose a supported family action.");if(!r.replayed)await tx.familyChange.create({data:{tenantId:staff.tenantId,familyId:r.familyId,actorKind:"STAFF",actorId:staff.employeeId,actorName:staff.name,action:b.action==="intake"?"family-created":"child-added",changedFields:b.action==="intake"?["family","parents","children"]:["children"],requestId:b.requestId,requestHash:signingHash({actorId:staff.employeeId,body:b})}});return r;},{timeout:20000});return NextResponse.json(result);}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const GET = withStaff("families.read",get);
export const POST = withStaff("families.write",post);
