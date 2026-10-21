import {Prisma,type PaymentRefund} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import type {VisitStaff} from "@/lib/visits/service";
import {PaymentError} from "./rules";
import {accessToken,squareMode,squareRequest} from "./square/client";
import {verifyPayment,type SquarePayment} from "./square/checkout";
export function refundInput(body:Record<string,unknown>){
 if(typeof body.checkoutId!=="string"||!body.checkoutId||body.checkoutId.length>100||typeof body.requestId!=="string"||!/^[-a-zA-Z0-9]{16,100}$/.test(body.requestId)||!Number.isSafeInteger(body.amountCents)||Number(body.amountCents)<=0||typeof body.reason!=="string"||!body.reason.trim()||body.reason.length>192)throw new PaymentError("Choose a Square payment, refund amount and reason (up to 192 characters).");
 return {checkoutId:body.checkoutId,requestId:body.requestId,amountCents:Number(body.amountCents),reason:body.reason.trim()};
}
export async function prepareRefund(actor:VisitStaff,body:Record<string,unknown>){
 const input=refundInput(body);
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${actor.tenantId} FOR UPDATE`);
  const existing=await tx.paymentRefund.findUnique({where:{tenantId_requestId:{tenantId:actor.tenantId,requestId:input.requestId}}});
  if(existing){if(existing.checkoutId!==input.checkoutId||existing.amountCents!==input.amountCents||existing.reason!==input.reason)throw new PaymentError("This refund request already has different details.",409);return existing;}
  const c=await tx.providerCheckout.findFirst({where:{id:input.checkoutId,tenantId:actor.tenantId,status:"PAID",providerPaymentId:{not:null}}});
  if(!c)throw new PaymentError("A completed Square checkout was not found in this business.",404);
  const connection=await tx.paymentConnection.findFirst({where:{id:c.connectionId,tenantId:actor.tenantId,mode:c.mode}});if(!connection)throw new PaymentError("The original Square connection is unavailable.",409);
  const reserved=await tx.paymentRefund.aggregate({where:{tenantId:actor.tenantId,checkoutId:c.id,status:{in:["PENDING","COMPLETED","REVIEW"]}},_sum:{amountCents:true}});
  if(input.amountCents>c.amountCents-(reserved._sum.amountCents??0))throw new PaymentError("Refund exceeds the remaining amount, including pending refunds.",409);
  return tx.paymentRefund.create({data:{...input,tenantId:actor.tenantId,mode:c.mode,staffId:actor.employeeId,staffName:actor.name}});
 });
}
type SquareRefund={id:string;payment_id:string;status:string;amount_money:{amount:number;currency:string}};
export function verifyRefund(refund:SquareRefund,request:Pick<PaymentRefund,"amountCents">,paymentId:string){
 if(refund.payment_id!==paymentId||refund.amount_money?.amount!==request.amountCents||refund.amount_money?.currency!=="USD"||!["PENDING","COMPLETED","FAILED","REJECTED"].includes(refund.status))throw new PaymentError("Square refund details need manager review.",409);
 return refund.status;
}
export async function processRefund(actor:VisitStaff,id:string){
 const refund=await prisma.paymentRefund.findFirst({where:{id,tenantId:actor.tenantId}});if(!refund)throw new PaymentError("Refund not found.",404);if(refund.status!=="PENDING")return refund;
 const checkout=await prisma.providerCheckout.findFirstOrThrow({where:{id:refund.checkoutId,tenantId:actor.tenantId}}),connection=await prisma.paymentConnection.findFirstOrThrow({where:{id:checkout.connectionId,tenantId:actor.tenantId,mode:checkout.mode}}),token=await accessToken(connection),mode=squareMode(refund.mode);
 if(!checkout.providerPaymentId)throw new PaymentError("The original Square payment is missing.",409);
 let result:{refund:SquareRefund};
 if(refund.providerRefundId)result=await squareRequest(mode,`/v2/refunds/${encodeURIComponent(refund.providerRefundId)}`,token);
 else {
  const {payment}=await squareRequest<{payment:SquarePayment}>(mode,`/v2/payments/${encodeURIComponent(checkout.providerPaymentId)}`,token);
  // Refunded amounts are permitted here; all original checkout identity checks must still match.
  if(!verifyPayment({...payment,refunded_money:{amount:0}},checkout,connection.locationId!))throw new PaymentError("The original payment is not completed.",409);
  result=await squareRequest(mode,"/v2/refunds",token,{idempotency_key:refund.id,payment_id:checkout.providerPaymentId,amount_money:{amount:refund.amountCents,currency:"USD"},reason:refund.reason});
 }
 let status:string;try{status=verifyRefund(result.refund,refund,checkout.providerPaymentId);}catch(e){await prisma.paymentRefund.update({where:{id},data:{status:"REVIEW"}});throw e;}
 return prisma.paymentRefund.update({where:{id},data:{providerRefundId:result.refund.id,status,completedAt:status==="COMPLETED"?new Date():null}});
}
