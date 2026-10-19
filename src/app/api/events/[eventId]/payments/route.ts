import {FormError} from "@/lib/waivers/signing";
import { withStaff, getStaffContext } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import {recordPartyPayment} from "@/lib/payments/party";
import { normalizeCommerceSettings } from "@/lib/commerce-settings";
import { prisma } from "@/lib/prisma";
import { PaymentError } from "@/lib/payments/rules";

type Params = { params: Promise<{ eventId: string }> };
async function handlePOST(request: Request, { params }: Params) {
  try {
    const staff = getStaffContext();
    const { eventId } = await params;
    let body;
    try { body = await request.json(); } catch { throw new PaymentError("Invalid payment request."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new PaymentError("Invalid payment request.");
    const result = await prisma.$transaction(tx=>recordPartyPayment(tx,staff,eventId,body),{maxWait:10000,timeout:15000});
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentError || error instanceof FormError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Unable to record payment", error);
    return NextResponse.json({ error: "Unable to record payment. Retry the same submission to check whether it was saved." }, { status: 500 });
  }
}
export const POST = withStaff("payments.write", handlePOST);

async function handleGET(_request:Request,{params}:Params){
  const {eventId}=await params,staff=getStaffContext();
  const party=await prisma.party.findFirst({where:{id:eventId,tenantId:staff.tenantId},select:{id:true,title:true,status:true,familyId:true,depositStatus:true,depositAmount:true,balanceDue:true,confirmationExpiresAt:true,payments:{where:{status:"PAID",purpose:"DEPOSIT"},select:{amount:true}}}});
  if(!party)return NextResponse.json({error:"Party not found."},{status:404});
  const settings=normalizeCommerceSettings(await prisma.commerceSettings.findUnique({where:{tenantId:staff.tenantId}})??{});
  const balance=Math.round(Number(party.balanceDue)*100),deposit=party.depositStatus==="WAIVED"||party.depositStatus.endsWith("COLLECTED")?0:Math.max(0,Math.round(Number(party.depositAmount)*100)-party.payments.reduce((n,p)=>n+Math.round(Number(p.amount)*100),0));
  return NextResponse.json({id:party.id,title:party.title,familyId:party.familyId,status:party.status,expired:party.status==="PENDING"&&!!party.confirmationExpiresAt&&party.confirmationExpiresAt<=new Date(),balanceCents:balance,depositCents:settings.depositRules.applyDepositToBalance?Math.min(balance,deposit):deposit,methods:settings.paymentMethods.filter(m=>m.enabled&&["cash","card","other"].includes(m.key)),allowPartial:settings.checkoutRules.allowPartialPayments,allowSplit:settings.checkoutRules.allowSplitPayments});
}
export const GET=withStaff("payments.write",handleGET);
