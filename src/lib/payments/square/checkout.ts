import {randomBytes} from "node:crypto";
import {Prisma,type ProviderCheckout} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {recordCheckoutPayment} from "@/lib/counter/service";
import {recordPartyPayment} from "../party";
import {PaymentError} from "../rules";
import type {VisitStaff} from "@/lib/visits/service";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {accessToken,config,publicConnection,squareMode,squareRequest,SquareError} from "./client";
import {encrypt,decrypt} from "./crypto";
import {assertNoPendingPayment,type PaymentExecution} from "../pending";
export type CheckoutPayload={kind:"counter";familyId:string;bills:{id:string;dueCents:number}[];amountCents:number}|{kind:"party";partyId:string;purpose:"DEPOSIT"|"BALANCE";amountCents:number};
export type SquarePayment={id:string;status:string;reference_id?:string;location_id?:string;amount_money?:{amount:number;currency:string};refunded_money?:{amount:number};receipt_url?:string;note?:string;source_type?:string};
const label=(mode:string)=>mode==="sandbox"?"Square SANDBOX — test payment":"Square card";
export function verifyPayment(payment:SquarePayment,intent:Pick<ProviderCheckout,"id"|"amountCents"> & Partial<Pick<ProviderCheckout,"channel"|"readerState">>,locationId:string){
 if((intent.channel==="READER"?payment.note!==`PlayFlow checkout ${intent.id} ${intent.readerState}`||payment.source_type!=="CARD":payment.reference_id!==intent.id)||payment.location_id!==locationId||payment.amount_money?.currency!=="USD"||payment.amount_money.amount!==intent.amountCents||(payment.refunded_money?.amount??0)>0)throw new PaymentError("Square payment details do not match this checkout. A manager must review it.",409);
 return payment.status==="COMPLETED";
}
export function parsePayload(body:Record<string,unknown>):CheckoutPayload{
 if(!Number.isSafeInteger(body.amountCents)||Number(body.amountCents)<=0||Number(body.amountCents)>100000000)throw new PaymentError("Choose a valid payment amount.");
 const amountCents=Number(body.amountCents);
 if(body.kind==="party"&&typeof body.partyId==="string"&&body.partyId.length<=100&&(body.purpose==="DEPOSIT"||body.purpose==="BALANCE"))return{kind:"party",partyId:body.partyId,purpose:body.purpose,amountCents};
 if(body.kind==="counter"&&typeof body.familyId==="string"&&body.familyId.length<=100&&Array.isArray(body.bills)&&body.bills.length>0&&body.bills.length<=20){
  const bills=body.bills.map((b:unknown)=>{if(!b||typeof b!=="object"||!("id"in b)||typeof b.id!=="string"||b.id.length>100||!("dueCents"in b)||!Number.isSafeInteger(b.dueCents)||Number(b.dueCents)<=0)throw new PaymentError("Choose valid bills.");return{id:b.id,dueCents:Number(b.dueCents)};}).sort((a,b)=>a.id.localeCompare(b.id));
  if(new Set(bills.map(b=>b.id)).size!==bills.length)throw new PaymentError("Select each bill only once.");return{kind:"counter",familyId:body.familyId,bills,amountCents};
 }
 throw new PaymentError("Choose a valid checkout.");
}
async function apply(tx:Prisma.TransactionClient,actor:VisitStaff,payload:CheckoutPayload,requestId:string,mode:string,execution:PaymentExecution){
 const notes=label(mode);
 if(payload.kind==="counter")return recordCheckoutPayment(tx,actor,{...payload,requestId,method:"card",notes,collectedAcknowledged:true},execution);
 return recordPartyPayment(tx,actor,payload.partyId,{purpose:payload.purpose,amount:(payload.amountCents/100).toFixed(2),requestId,method:"card",notes},execution);
}
export async function prepareCheckout(actor:VisitStaff,body:Record<string,unknown>){
 const payload=parsePayload(body),requestId=body.requestId,sourceToken=body.sourceToken,reader=body.channel==="READER";
 if(typeof requestId!=="string"||!/^[a-zA-Z0-9-]{16,100}$/.test(requestId))throw new PaymentError("A checkout reference is required.");
 if(!reader&&(typeof sourceToken!=="string"||sourceToken.length<10||sourceToken.length>2000))throw new PaymentError("Enter your payment details using the secure Square form.");
 if(body.mode!=="sandbox"&&body.mode!=="live")throw new PaymentError("Refresh checkout to load the payment environment.");
 if(reader&&body.mode!=="live")throw new PaymentError("Square Reader payments require Live mode and an iPad running Square Point of Sale. Sandbox supports the card test form.",409);
 if(reader&&process.env.SQUARE_POS_ENABLED!=="true")throw new PaymentError("The platform’s Square Point of Sale callback must be registered before reader checkout can be enabled.",409);
 const fingerprint=signingHash({payload,mode:body.mode,locationId:body.locationId,...(reader?{channel:"READER"}:{})});
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${actor.tenantId} FOR UPDATE`);
  const existing=await tx.providerCheckout.findUnique({where:{tenantId_requestId:{tenantId:actor.tenantId,requestId}}});
  if(existing){if(existing.requestHash!==fingerprint)throw new PaymentError("This checkout reference was already used with different details.",409);return existing;}
  const status=await publicConnection(actor.tenantId);if(!status.ready)throw new PaymentError("Square checkout is not connected. Contact the venue to arrange payment.",409);
  if(status.mode!==body.mode||status.locationId!==body.locationId)throw new PaymentError("The Square account or environment changed. Close checkout and refresh before paying.",409);
  const connection=await tx.paymentConnection.findUniqueOrThrow({where:{tenantId_mode:{tenantId:actor.tenantId,mode:status.mode}}});
  const keys=payload.kind==="party"?[`party:${payload.partyId}`]:payload.bills.map(b=>`sale:${b.id}`);
  await assertNoPendingPayment(tx,actor.tenantId,keys);
  // The exact same domain rules run both before charging and before posting the ledger.
  await apply(tx,actor,payload,requestId,connection.mode,{validateOnly:true});
  return tx.providerCheckout.create({data:{tenantId:actor.tenantId,connectionId:connection.id,mode:connection.mode,requestId,requestHash:fingerprint,amountCents:payload.amountCents,targetKeys:keys,payload:payload as unknown as Prisma.InputJsonValue,actor:actor as unknown as Prisma.InputJsonValue,channel:reader?"READER":"CARD",readerState:reader?randomBytes(32).toString("base64url"):null,sourceToken:reader?null:encrypt(sourceToken as string)}});
 },{timeout:20000});
}
export function publicCheckout(intent:ProviderCheckout){return{id:intent.id,status:intent.status,channel:intent.channel,mode:intent.mode,amountCents:intent.amountCents,receiptUrl:intent.receiptUrl,error:intent.status==="REVIEW"?"Square received a payment that needs manager review. Do not pay again.":intent.status==="FAILED"?"Square did not complete this payment. Start a new payment.":null};}
export async function settleCheckout(intentId:string,payment:SquarePayment){
 const intent=await prisma.providerCheckout.findUniqueOrThrow({where:{id:intentId}}),connection=await prisma.paymentConnection.findUniqueOrThrow({where:{id:intent.connectionId}});
 if(intent.status==="PAID")return intent;
 try{
  if(!connection.locationId||!verifyPayment(payment,intent,connection.locationId))return intent;
  return await prisma.$transaction(async tx=>{
   await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${intent.tenantId} FOR UPDATE`);
   const current=await tx.providerCheckout.findUniqueOrThrow({where:{id:intent.id}});if(current.status==="PAID")return current;
   if(current.status==="FAILED")throw new PaymentError("Payment needs review.",409);
   await apply(tx,intent.actor as VisitStaff,intent.payload as CheckoutPayload,intent.requestId,intent.mode,{providerCheckoutId:intent.id,sourceLabel:label(intent.mode),sourceMode:squareMode(intent.mode)});
   return tx.providerCheckout.update({where:{id:intent.id},data:{status:"PAID",providerPaymentId:payment.id,receiptUrl:payment.receipt_url??null,sourceToken:null,failureCode:null}});
  },{timeout:20000});
 }catch(e){
  if(!(e instanceof PaymentError||e instanceof FormError))throw e;
  // Preserve proof of funds even if a hold expired or business rules changed while paying.
  const updated=await prisma.providerCheckout.updateMany({where:{id:intent.id,status:{not:"PAID"}},data:{status:"REVIEW",providerPaymentId:payment.id,receiptUrl:payment.receipt_url??null,sourceToken:null,failureCode:"LEDGER_REVIEW"}});
  void updated;return prisma.providerCheckout.findUniqueOrThrow({where:{id:intent.id}});
 }
}
export async function processCheckout(id:string){
 const intent=await prisma.providerCheckout.findUniqueOrThrow({where:{id}});if(intent.status!=="PENDING")return intent;
 if(intent.channel==="READER"&&!intent.providerPaymentId)return intent;
 const connection=await prisma.paymentConnection.findUniqueOrThrow({where:{id:intent.connectionId}}),mode=squareMode(intent.mode),token=await accessToken(connection);
 try{
  const result= intent.providerPaymentId?await squareRequest<{payment:SquarePayment}>(mode,`/v2/payments/${encodeURIComponent(intent.providerPaymentId)}`,token):await squareRequest<{payment:SquarePayment}>(mode,"/v2/payments",token,{idempotency_key:intent.id,source_id:decrypt(intent.sourceToken!),amount_money:{amount:intent.amountCents,currency:"USD"},location_id:connection.locationId,reference_id:intent.id,autocomplete:true,accept_partial_authorization:false,note:`PlayFlow ${label(mode)}`});
  const p=result.payment;
  if(p.status==="FAILED"||p.status==="CANCELED")return prisma.providerCheckout.update({where:{id:intent.id},data:{status:"FAILED",providerPaymentId:p.id,sourceToken:null,failureCode:p.status}});
  await prisma.providerCheckout.updateMany({where:{id:intent.id,status:"PENDING"},data:{providerPaymentId:p.id}});
  return settleCheckout(intent.id,p);
 }catch(e){
  if(e instanceof SquareError&&["CARD_DECLINED","CVV_FAILURE","ADDRESS_VERIFICATION_FAILURE","VERIFY_CVV_FAILURE","VERIFY_AVS_FAILURE","CARD_EXPIRED","INVALID_CARD","GENERIC_DECLINE","INSUFFICIENT_FUNDS"].includes(e.code))return prisma.providerCheckout.update({where:{id:intent.id},data:{status:"FAILED",sourceToken:null,failureCode:e.code}});
  // Timeouts are ambiguous. Keep the same idempotency key and encrypted token for a safe retry.
  throw e;
 }
}

export function readerLaunch(intent:ProviderCheckout,applicationId:string,origin:string,locationId:string){
 if(intent.channel!=="READER"||intent.status!=="PENDING"||!intent.readerState)throw new PaymentError("This reader payment is no longer open.",409);
 return "square-commerce-v1://payment/create?data="+encodeURIComponent(JSON.stringify({amount_money:{amount:intent.amountCents,currency_code:"USD"},callback_url:`${origin}/payments/reader-return`,client_id:applicationId,location_id:locationId,version:"1.3",state:intent.readerState,notes:`PlayFlow checkout ${intent.id} ${intent.readerState}`,options:{supported_tender_types:["CREDIT_CARD"],clear_default_fees:true,auto_return:true,skip_receipt:false}}));
}
export async function reconcileReader(actor:VisitStaff,input:Record<string,unknown>){
 if(typeof input.state!=="string"||input.state.length!==43||typeof input.transactionId!=="string"||!/^[-a-zA-Z0-9_]{1,200}$/.test(input.transactionId))throw new PaymentError("Square has not supplied an online transaction reference. Keep this checkout pending and check Square before collecting again.",409);
 const intent=await prisma.providerCheckout.findFirst({where:{tenantId:actor.tenantId,readerState:input.state,channel:"READER"}});if(!intent)throw new PaymentError("Reader checkout not found in this business.",404);
 if(intent.status==="PAID")return intent;
 const c=await prisma.paymentConnection.findUniqueOrThrow({where:{id:intent.connectionId}}),token=await accessToken(c);
 const result=await squareRequest<{order:{id:string;location_id:string;tenders?:{payment_id?:string}[]}}>("live",`/v2/orders/${encodeURIComponent(input.transactionId)}`,token);
 if(result.order.location_id!==c.locationId||result.order.tenders?.length!==1||!result.order.tenders[0].payment_id)throw new PaymentError("The reader transaction needs review in Square. Do not collect again.",409);
 const {payment}=await squareRequest<{payment:SquarePayment}>("live",`/v2/payments/${encodeURIComponent(result.order.tenders[0].payment_id)}`,token);
 // A callback is not proof of payment. Bind verified money, location, card tender and exact server-generated note.
 verifyPayment(payment,intent,c.locationId!);
 await prisma.providerCheckout.updateMany({where:{id:intent.id,status:"PENDING"},data:{readerOrderId:result.order.id,providerPaymentId:payment.id}});
 return settleCheckout(intent.id,payment);
}
export async function launchForReader(intent:ProviderCheckout){const c=await prisma.paymentConnection.findUniqueOrThrow({where:{id:intent.connectionId}}),app=config("live");return readerLaunch(intent,app.appId,app.origin,c.locationId!);}
