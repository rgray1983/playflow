import {NextResponse} from "next/server";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {hash,encrypt} from "@/lib/payments/square/crypto";
import {config,locations,squareMode,squareRequest} from "@/lib/payments/square/client";
async function callback(request:Request){
 const staff=getStaffContext(),url=new URL(request.url),state=url.searchParams.get("state"),code=url.searchParams.get("code");
 if(!state||!code)return NextResponse.json({error:"Square authorization was cancelled or incomplete. Return to Payment Providers and try again."},{status:400});
 const connection=await prisma.paymentConnection.findUnique({where:{stateHash:hash(state)}});
 if(!connection||connection.tenantId!==staff.tenantId||connection.stateUserId!==staff.authUserId||!connection.stateExpiresAt||connection.stateExpiresAt<=new Date())return NextResponse.json({error:"Square authorization expired. Start again from Payment Providers."},{status:400});
 const mode=squareMode(connection.mode),c=config(mode);
 const claimed=await prisma.paymentConnection.updateMany({where:{id:connection.id,stateHash:hash(state)},data:{stateHash:null,stateUserId:null,stateExpiresAt:null}});if(claimed.count!==1)return NextResponse.json({error:"This authorization was already used."},{status:409});
 try{
  const tokens=await squareRequest<{access_token:string;refresh_token:string;merchant_id:string;expires_at:string}>(mode,"/oauth2/token",undefined,{client_id:c.appId,client_secret:c.secret,code,grant_type:"authorization_code",redirect_uri:c.redirectUri});
  if(!tokens.access_token||!tokens.refresh_token||!tokens.merchant_id)throw new Error("Incomplete authorization");
  // Keep the old connection intact until the complete new authorization is available.
  const saved=await prisma.paymentConnection.update({where:{id:connection.id},data:{accessToken:encrypt(tokens.access_token),refreshToken:encrypt(tokens.refresh_token),merchantId:tokens.merchant_id,expiresAt:new Date(tokens.expires_at),locationId:null,locationLabel:null,connectedBy:staff.employeeId}});
  try{const options=await locations(saved);if(options.length===1)await prisma.paymentConnection.update({where:{id:saved.id},data:{locationId:options[0].id,locationLabel:options[0].name,checkedAt:new Date()}});}catch{}
  return NextResponse.redirect(`${c.origin}/company-settings?section=Payment%20Providers`);
 }catch{return NextResponse.json({error:"Square authorization could not be completed. Return to Payment Providers to reconnect."},{status:502});}
}
export const GET = withStaff("settings.write",callback);
