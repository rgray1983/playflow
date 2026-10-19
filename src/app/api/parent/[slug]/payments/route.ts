import {normalizeCommerceSettings} from "@/lib/commerce-settings";
import {NextResponse} from "next/server";
import {getParentContext,withParent} from "@/lib/parent/access";
import {prisma} from "@/lib/prisma";
import {prepareCheckout,processCheckout,publicCheckout} from "@/lib/payments/square/checkout";
import {publicConnection} from "@/lib/payments/square/client";
import {checkoutFailure} from "@/lib/payments/square/response";
import {PaymentError} from "@/lib/payments/rules";
async function owns(partyId:unknown){const {tenant,parent}=getParentContext();if(!parent||typeof partyId!=="string")throw new PaymentError("Set up your family before paying.",403);const party=await prisma.party.findFirst({where:{id:partyId,tenantId:tenant.id,familyId:parent.familyId,primaryParentId:parent.id}});if(!party)throw new PaymentError("Booking not found.",404);if(!await prisma.waiver.findFirst({where:{tenantId:tenant.id,partyId:party.id,familyId:parent.familyId,signedById:parent.id,kind:"RENTAL",status:"VALID",signedAt:{not:null}}}))throw new PaymentError("Sign the Party Rental Agreement before payment.",409);return party;}
async function get(request:Request){try{const {tenant,parent}=getParentContext();if(!parent)return NextResponse.json({error:"Family access required."},{status:403});const query=new URL(request.url).searchParams;
 if(query.has("pending")){
  const parties=await prisma.party.findMany({where:{tenantId:tenant.id,familyId:parent.familyId,primaryParentId:parent.id,...(query.get("partyId")?{id:query.get("partyId")!}:{})},select:{id:true}});
  const items=await prisma.providerCheckout.findMany({where:{tenantId:tenant.id,status:{in:["PENDING","REVIEW"]},targetKeys:{hasSome:parties.map(p=>`party:${p.id}`)}},orderBy:{createdAt:"desc"},take:50});return NextResponse.json({items:items.map(publicCheckout)});
 }
 if(query.has("partyId")){const party=await owns(query.get("partyId")),paid=await prisma.eventPayment.aggregate({where:{tenantId:tenant.id,partyId:party.id,status:"PAID",purpose:"DEPOSIT"},_sum:{amount:true}});const settings=normalizeCommerceSettings(await prisma.commerceSettings.findUnique({where:{tenantId:tenant.id}})??{});const depositCents=party.depositStatus==="WAIVED"||party.depositStatus.endsWith("COLLECTED")?0:Math.max(0,Math.round(Number(party.depositAmount)*100)-Math.round(Number(paid._sum.amount??0)*100));return NextResponse.json({depositCents:settings.depositRules.applyDepositToBalance?Math.min(depositCents,Math.round(Number(party.balanceDue)*100)):depositCents});}
 const c=await publicConnection(tenant.id);return NextResponse.json({mode:c.mode,ready:c.ready,applicationId:c.applicationId,locationId:c.locationId});
 }catch(e){return checkoutFailure(e);}}
async function post(request:Request){try{const context=getParentContext(),body=await request.json();if(body.action==="status"){
 if(typeof body.id!=="string"||!body.id||body.id.length>100)throw new PaymentError("Choose a valid checkout.");
 const intent=await prisma.providerCheckout.findFirst({where:{id:body.id,tenantId:context.tenant.id}});if(!intent)throw new PaymentError("Checkout not found.",404);const payload=intent.payload as {partyId?:string};await owns(payload.partyId);return NextResponse.json(publicCheckout(await processCheckout(intent.id)));
 }
 await owns(body.partyId);if(body.kind!=="party"||body.purpose!=="DEPOSIT")throw new PaymentError("Use the venue for other payment types.",403);
 const actor={tenantId:context.tenant.id,employeeId:"",name:`Parent portal: ${context.parent!.firstName} ${context.parent!.lastName}`};const intent=await prepareCheckout(actor,body);return NextResponse.json(publicCheckout(await processCheckout(intent.id)));
}catch(e){return checkoutFailure(e);}}
export const GET = withParent(get);
export const POST = withParent(post);
