import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {recordId} from "@/lib/visits/service";
import {FormError} from "@/lib/waivers/signing";
import {familyMemberships} from "@/lib/memberships/queries";
import {changeMembership} from "@/lib/memberships/management";
type Params={params:Promise<{familyId:string}>};
async function get(request:Request,{params}:Params){try{return NextResponse.json(await familyMemberships(prisma,getStaffContext(),recordId((await params).familyId,"a family"),new URL(request.url).searchParams));}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
async function post(request:Request,{params}:Params){try{let b;try{b=await request.json();}catch{throw new FormError("Invalid membership request.");}if(!b||typeof b!=="object"||Array.isArray(b))throw new FormError("Invalid membership request.");const {membershipId,...body}=b;const familyId=recordId((await params).familyId,"a family");return NextResponse.json(await prisma.$transaction(tx=>changeMembership(tx,getStaffContext(),familyId,recordId(membershipId,"a membership"),body),{timeout:20000}));}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const GET = withStaff("memberships.read",get);
export const POST = withStaff("memberships.manage",post);
