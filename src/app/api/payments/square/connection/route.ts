import {NextResponse} from "next/server";
import {randomBytes} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {prisma} from "@/lib/prisma";
import {normalizeCommerceSettings} from "@/lib/commerce-settings";
import {PaymentError} from "@/lib/payments/rules";
import {base,config,locations,publicConnection,squareMode,squareRequest} from "@/lib/payments/square/client";
import {decrypt,hash} from "@/lib/payments/square/crypto";
function failure(e:unknown){return NextResponse.json({error:e instanceof PaymentError?e.message:"Unable to update Square connection."},{status:e instanceof PaymentError?e.status:500});}
async function get(){return NextResponse.json(await publicConnection(getStaffContext().tenantId));}
async function post(request:Request){try{
 const staff=getStaffContext(),body=await request.json(),mode=squareMode(body.mode),where={tenantId_mode:{tenantId:staff.tenantId,mode}};
 if(body.action==="mode"){
  if(await prisma.providerCheckout.count({where:{tenantId:staff.tenantId,status:{in:["PENDING","REVIEW"]}}}))throw new PaymentError("Resolve pending Square payments before switching environments.",409);
  const raw=await prisma.commerceSettings.findUnique({where:{tenantId:staff.tenantId}}),settings=normalizeCommerceSettings(raw??{}),processorRules={provider:"square",mode,connected:false,accountLabel:""};
  await prisma.commerceSettings.upsert({where:{tenantId:staff.tenantId},create:{tenantId:staff.tenantId,...settings,processorRules},update:{processorRules}});return NextResponse.json(await publicConnection(staff.tenantId));
 }
 const c=config(mode);
 if(body.action==="connect"){
  const existing=await prisma.paymentConnection.findUnique({where});if(existing?.accessToken)throw new PaymentError("Disconnect the current Square account before connecting another.",409);
  const state=randomBytes(32).toString("base64url");
  if(await prisma.providerCheckout.count({where:{tenantId:staff.tenantId,mode,status:{in:["PENDING","REVIEW"]}}}))throw new PaymentError("Resolve pending payments before changing the Square account.",409);
  await prisma.paymentConnection.upsert({where,create:{tenantId:staff.tenantId,mode,stateHash:hash(state),stateExpiresAt:new Date(Date.now()+10*60000),stateUserId:staff.authUserId},update:{stateHash:hash(state),stateExpiresAt:new Date(Date.now()+10*60000),stateUserId:staff.authUserId}});
  const url=new URL(`${base(mode)}/oauth2/authorize`);url.search=new URLSearchParams({client_id:c.appId,scope:"MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE ORDERS_READ ORDERS_WRITE",state,redirect_uri:c.redirectUri,...(mode==="live"?{session:"false"}:{})}).toString();return NextResponse.json({url:url.toString()});
 }
 const connection=await prisma.paymentConnection.findUnique({where});if(!connection?.accessToken)throw new PaymentError("Connect Square first.",409);
 if(body.action==="health"||body.action==="location"){
  const options=await locations(connection);let locationId=connection.locationId;
  if(body.action==="location"){if(typeof body.locationId!=="string"||!options.some(l=>l.id===body.locationId))throw new PaymentError("Choose an active USD card-processing location.");locationId=body.locationId;}
  if(!locationId&&options.length===1)locationId=options[0].id;
  const location=options.find(l=>l.id===locationId);
  await prisma.paymentConnection.update({where:{id:connection.id},data:{locationId:location?.id??null,locationLabel:location?.name??null,checkedAt:new Date()}});return NextResponse.json({...await publicConnection(staff.tenantId),locations:options});
 }
 if(body.action==="disconnect"){
  await prisma.$transaction(async tx=>{await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${staff.tenantId} FOR UPDATE`);if(await tx.providerCheckout.count({where:{tenantId:staff.tenantId,mode,status:{in:["PENDING","REVIEW"]}}}))throw new PaymentError("Resolve pending payments before disconnecting.",409);
   await squareRequest(mode,"/oauth2/revoke",`Client ${c.secret}`,{client_id:c.appId,access_token:decrypt(connection.accessToken!),revoke_only_access_token:false});
   await tx.paymentConnection.update({where:{id:connection.id},data:{accessToken:null,refreshToken:null,expiresAt:null,locationId:null,locationLabel:null,merchantId:null,stateHash:null,stateUserId:null}});
  },{timeout:20000});return NextResponse.json(await publicConnection(staff.tenantId));
 }
 throw new PaymentError("Choose a supported Square action.");
}catch(e){return failure(e);}}
export const GET = withStaff("read",get);
export const POST = withStaff("settings.write",post);
