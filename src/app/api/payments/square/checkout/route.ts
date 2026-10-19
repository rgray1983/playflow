import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {prepareCheckout,processCheckout,publicCheckout} from "@/lib/payments/square/checkout";
import {checkoutFailure} from "@/lib/payments/square/response";
async function post(request:Request){try{const actor=getStaffContext(),body=await request.json();if(body.action==="status"){
 if(typeof body.id!=="string"||!body.id||body.id.length>100)return NextResponse.json({error:"Choose a valid checkout."},{status:400});
 const intent=await prisma.providerCheckout.findFirst({where:{id:body.id,tenantId:actor.tenantId}});if(!intent)return NextResponse.json({error:"Checkout not found."},{status:404});return NextResponse.json(publicCheckout(await processCheckout(intent.id)));
 }const intent=await prepareCheckout(actor,body);return NextResponse.json(publicCheckout(await processCheckout(intent.id)));}catch(e){return checkoutFailure(e);}}
export const POST = withStaff("payments.write",post);

async function get(request:Request){const staff=getStaffContext(),q=new URL(request.url).searchParams,familyId=q.get("familyId"),partyId=q.get("partyId");
 const keys=partyId?[`party:${partyId}`]:familyId?(await prisma.counterSale.findMany({where:{tenantId:staff.tenantId,familyId},select:{id:true}})).map(s=>`sale:${s.id}`):[];
 const items=await prisma.providerCheckout.findMany({where:{tenantId:staff.tenantId,status:{in:["PENDING","REVIEW"]},...(keys.length?{targetKeys:{hasSome:keys}}:familyId||partyId?{id:"no-match"}:{})},orderBy:{createdAt:"desc"},take:50});return NextResponse.json({items:items.map(publicCheckout)});
}
export const GET = withStaff("payments.write",get);
