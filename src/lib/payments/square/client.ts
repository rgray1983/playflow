import type {PaymentConnection} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {decrypt,encrypt,secretKey} from "./crypto";
import {PaymentError} from "../rules";
export type SquareMode="sandbox"|"live";
export function squareMode(value:unknown):SquareMode{if(value!=="sandbox"&&value!=="live")throw new PaymentError("Choose Sandbox or Live.");return value;}
export const base=(mode:SquareMode)=>mode==="sandbox"?"https://connect.squareupsandbox.com":"https://connect.squareup.com";
export function config(mode:SquareMode){const prefix=mode==="sandbox"?"SQUARE_SANDBOX":"SQUARE_LIVE",appId=process.env[`${prefix}_APPLICATION_ID`],secret=process.env[`${prefix}_APPLICATION_SECRET`],origin=process.env.PLAYFLOW_APP_URL;if(!appId||!secret||!origin)throw new PaymentError("Square application setup is pending. A developer must configure the server credentials.",503);secretKey();const url=new URL(origin);if(url.protocol!=="https:"&&url.hostname!=="localhost")throw new PaymentError("Square requires an HTTPS app address.",503);return{appId,secret,origin:url.origin,redirectUri:`${url.origin}/api/payments/square/callback`};}
export class SquareError extends PaymentError{constructor(public code:string,status=502){super(code==="CARD_DECLINED"?"Card declined. Try another card.":"Square could not complete this request. Check payment status before retrying.",status);}}
export async function squareRequest<T>(mode:SquareMode,path:string,token?:string,body?:object,method=body?"POST":"GET"):Promise<T>{
 const response=await fetch(`${base(mode)}${path}`,{method,cache:"no-store",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json","Square-Version":"2026-09-16",...(token?{Authorization:token.startsWith("Client ")?token:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json();if(!response.ok||result.errors?.length)throw new SquareError(result.errors?.[0]?.code??"SQUARE_ERROR",response.status===401?503:502);return result;
}
export type Location={id:string;name:string;status:string;currency:string;capabilities?:string[]};
export async function locations(connection:PaymentConnection){return (await squareRequest<{locations?:Location[]}>(squareMode(connection.mode),"/v2/locations",await accessToken(connection))).locations?.filter(l=>l.status==="ACTIVE"&&l.currency==="USD"&&l.capabilities?.includes("CREDIT_CARD_PROCESSING"))??[];}
export async function accessToken(connection:PaymentConnection){
 if(!connection.accessToken)throw new PaymentError("Connect Square in Payment Providers first.",409);
 if(connection.expiresAt&&connection.expiresAt.getTime()<Date.now()+86400000){
  const mode=squareMode(connection.mode),c=config(mode);if(!connection.refreshToken)throw new PaymentError("Reconnect Square to continue.",409);
  const result=await squareRequest<{access_token:string;refresh_token:string;expires_at:string}>(mode,"/oauth2/token",undefined,{client_id:c.appId,client_secret:c.secret,grant_type:"refresh_token",refresh_token:decrypt(connection.refreshToken)});
  await prisma.paymentConnection.updateMany({where:{id:connection.id,accessToken:connection.accessToken},data:{accessToken:encrypt(result.access_token),refreshToken:encrypt(result.refresh_token),expiresAt:new Date(result.expires_at)}});return result.access_token;
 }
 return decrypt(connection.accessToken);
}
export async function publicConnection(tenantId:string){
 const raw=await prisma.commerceSettings.findUnique({where:{tenantId},select:{processorRules:true}});const mode=(raw?.processorRules as {mode?:unknown}|null)?.mode==="live"?"live":"sandbox";
 let applicationId="",configured=false;try{applicationId=config(mode).appId;configured=true;}catch{}
 const c=await prisma.paymentConnection.findUnique({where:{tenantId_mode:{tenantId,mode}}});
 return{mode,configured,applicationId,connected:!!c?.accessToken,ready:configured&&!!c?.accessToken&&!!c.locationId,merchantId:c?.merchantId??null,locationId:c?.locationId??null,locationLabel:c?.locationLabel??null,checkedAt:c?.checkedAt??null};
}
