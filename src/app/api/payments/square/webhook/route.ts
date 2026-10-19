import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {validSignature} from "@/lib/payments/square/crypto";
import {accessToken,config,squareMode,squareRequest} from "@/lib/payments/square/client";
import {settleCheckout,type SquarePayment} from "@/lib/payments/square/checkout";
export async function POST(request:Request){
 const mode=new URL(request.url).searchParams.get("mode")==="live"?"live":"sandbox",key=process.env[mode==="live"?"SQUARE_LIVE_WEBHOOK_SIGNATURE_KEY":"SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY"];
 if(!key)return NextResponse.json({error:"Webhook not configured."},{status:503});
 const body=await request.text();let origin:string;try{origin=config(mode).origin;}catch{return NextResponse.json({error:"Webhook not configured."},{status:503});}
 if(!validSignature(key,`${origin}/api/payments/square/webhook?mode=${mode}`,body,request.headers.get("x-square-hmacsha256-signature")??""))return NextResponse.json({error:"Invalid signature."},{status:403});
 try{
  const event=JSON.parse(body);if(!["payment.created","payment.updated"].includes(event.type))return NextResponse.json({received:true});
  const payment=event.data?.object?.payment;if(!payment?.reference_id||!payment.id)return NextResponse.json({received:true});
  const intent=await prisma.providerCheckout.findUnique({where:{id:payment.reference_id}});if(!intent||intent.mode!==mode||intent.status==="PAID")return NextResponse.json({received:true});
  const connection=await prisma.paymentConnection.findUniqueOrThrow({where:{id:intent.connectionId}});if(connection.merchantId!==event.merchant_id)return NextResponse.json({error:"Merchant mismatch."},{status:403});
  const verified=await squareRequest<{payment:SquarePayment}>(squareMode(mode),`/v2/payments/${encodeURIComponent(payment.id)}`,await accessToken(connection));
  await settleCheckout(intent.id,verified.payment);return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:"Payment notification could not be reconciled. Retry."},{status:500});}
}
