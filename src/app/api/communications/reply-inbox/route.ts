import {NextResponse} from "next/server";
import {withStaff,getStaffContext} from "@/lib/auth/staff";
import {FormError} from "@/lib/waivers/signing";
import {replyInbox,requestInboxVerification,confirmInbox} from "@/lib/communications/reply-inbox";
async function get(){return NextResponse.json(await replyInbox(getStaffContext().tenantId));}
async function post(request:Request) {
  let body;try{body=await request.json();}catch{return NextResponse.json({error:"Enter a verification request."},{status:400});}
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Enter a verification request."},{status:400});
  try {
    const tenantId=getStaffContext().tenantId;
    if(body.action==="request")return NextResponse.json(await requestInboxVerification(tenantId,body.email));
    if(body.action==="confirm")return NextResponse.json(await confirmInbox(tenantId,body.challengeId,body.code));
    return NextResponse.json({error:"Choose a verification action."},{status:400});
  }catch(error){if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});throw error;}
}
export const GET = withStaff("settings.write",get);
export const POST = withStaff("settings.write",post,{scheduleEmailDelivery:false});
