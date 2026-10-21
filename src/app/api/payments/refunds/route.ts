import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prepareRefund,processRefund} from "@/lib/payments/refunds";
import {checkoutFailure} from "@/lib/payments/square/response";
async function post(request:Request){try{const actor=getStaffContext(),b=await request.json();const id=b.action==="status"?b.id:(await prepareRefund(actor,b)).id;if(typeof id!=="string"||!id||id.length>100)return NextResponse.json({error:"Choose a refund."},{status:400});const r=await processRefund(actor,id);return NextResponse.json({id:r.id,status:r.status,amountCents:r.amountCents,mode:r.mode});}catch(e){return checkoutFailure(e);}}
export const POST = withStaff("payments.refund",post);
