import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {hasPermission} from "@/lib/auth/permissions";
import {saveCounterProduct} from "@/lib/counter/products";
import {FormError} from "@/lib/waivers/signing";
async function handleGET(){const staff=getStaffContext(),canManage=hasPermission(staff.accessRole,"settings.write");const products=await prisma.counterProduct.findMany({where:{tenantId:staff.tenantId,...(!canManage?{active:true}:{})},orderBy:[{category:"asc"},{name:"asc"}],take:500,select:{id:true,name:true,category:true,priceCents:true,active:true,updatedAt:true}});return NextResponse.json({products,canManage});}
async function handlePOST(request:Request){try{let body;try{body=await request.json();}catch{throw new FormError("Invalid product request.");}if(!body||typeof body!=="object"||Array.isArray(body))throw new FormError("Invalid product request.");const staff=getStaffContext();const product=await prisma.$transaction(tx=>saveCounterProduct(tx,staff,body),{maxWait:10000,timeout:15000});return NextResponse.json({product});}catch(error){if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});console.error("Product save failed",error);return NextResponse.json({error:"Unable to save the product. Refresh before trying again."},{status:500});}}
export const GET = withStaff("payments.write",handleGET);
export const POST = withStaff("settings.write",handlePOST);
