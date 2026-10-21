import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prepareCheckout,launchForReader,reconcileReader,publicCheckout} from "@/lib/payments/square/checkout";
import {checkoutFailure} from "@/lib/payments/square/response";
async function post(request:Request){try{const body=await request.json(),actor=getStaffContext();if(body.action==="return")return NextResponse.json(publicCheckout(await reconcileReader(actor,body)));const intent=await prepareCheckout(actor,{...body,channel:"READER"});return NextResponse.json({...publicCheckout(intent),launchUrl:intent.status==="PENDING"?await launchForReader(intent):null});}catch(e){return checkoutFailure(e);}}
export const POST = withStaff("payments.write",post);
