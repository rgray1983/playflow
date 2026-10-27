import {createHash,randomBytes,randomUUID,timingSafeEqual} from "node:crypto";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {FormError} from "@/lib/waivers/signing";
import {recipientAllowed} from "./delivery-policy";

export function inboxAddress(value:unknown) {
  if(typeof value!=="string")throw new FormError("Enter one email address.",400);
  const email=value.trim().toLowerCase();
  if(email.length>254||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email))throw new FormError("Enter one email address without a display name.",400);
  return email;
}
const hash=(id:string,code:string)=>createHash("sha256").update(`${id}:${code}`).digest("hex");
export async function replyInbox(tenantId:string) {
  const saved=await prisma.emailConfiguration.findUnique({where:{tenantId}});
  return {replyTo:saved?.verifiedAt?saved.replyTo:null,verifiedAt:saved?.verifiedAt??null,pendingEmail:saved?.pendingEmail??null,challengeId:saved?.challengeId??null,expiresAt:saved?.expiresAt??null,requestedAt:saved?.requestedAt??null};
}
export async function requestInboxVerification(tenantId:string,value:unknown) {
  const email=inboxAddress(value);
  if(!recipientAllowed(email))throw new FormError("Test mode: verification can only be sent to an approved test inbox.",409);
  if(!process.env.RESEND_API_KEY||!process.env.PLAYFLOW_EMAIL_FROM)throw new FormError("The PlayFlow sender must be configured first.",409);
  const now=new Date(),id=randomUUID(),code=randomBytes(6).toString("hex").toUpperCase();
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);
    const saved=await tx.emailConfiguration.findUnique({where:{tenantId}});
    if(saved?.requestedAt&&now.getTime()-saved.requestedAt.getTime()<120000)throw new FormError("Wait two minutes before requesting another code.",429);
    const sameWindow=!!saved?.windowStartedAt&&now.getTime()-saved.windowStartedAt.getTime()<3600000;
    if(sameWindow&&saved!.requestCount>=5)throw new FormError("Five codes have been requested. Try again after the hourly limit resets.",429);
    const data={pendingEmail:email,challengeId:id,challengeHash:hash(id,code),expiresAt:new Date(now.getTime()+15*60000),attempts:0,requestedAt:now,windowStartedAt:sameWindow?saved!.windowStartedAt:now,requestCount:sameWindow?saved!.requestCount+1:1};
    await tx.emailConfiguration.upsert({where:{tenantId},create:{tenantId,...data},update:data});
  });
  // Only this explicit staff action sends a code. No booking details or private links are included.
  try {
    const response=await fetch("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`playflow-reply-${id}`},body:JSON.stringify({from:process.env.PLAYFLOW_EMAIL_FROM,to:[email],subject:"Verify your PlayFlow reply inbox",text:`Your PlayFlow verification code is: ${code}\n\nEnter this code in Company Settings → Booking communications. It expires in 15 minutes and can be used once. Only verify this inbox if you manage it and want it to receive replies to your business's booking emails.\n\nIf you did not request this code, you can ignore this email.`})});
    if(!response.ok)throw new Error("Provider rejected verification");
  } catch {throw new FormError("The verification email could not be confirmed. Check your inbox; if it has not arrived, request another code after two minutes.",503);}
  return replyInbox(tenantId);
}
export async function confirmInbox(tenantId:string,id:unknown,value:unknown) {
  if(typeof id!=="string"||typeof value!=="string"||value.length>64)throw new FormError("Enter the code from your email.",400);
  const code=value.trim().toUpperCase();
  const result=await prisma.$transaction(async tx=>{
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);
    const saved=await tx.emailConfiguration.findUnique({where:{tenantId}});
    if(!saved?.challengeHash||saved.challengeId!==id||!saved.pendingEmail||!saved.expiresAt||saved.expiresAt<=new Date()||saved.attempts>=5)return false;
    const matches=timingSafeEqual(Buffer.from(hash(id,code)),Buffer.from(saved.challengeHash));
    if(!matches){await tx.emailConfiguration.update({where:{tenantId},data:{attempts:{increment:1}}});return false;}
    await tx.emailConfiguration.update({where:{tenantId},data:{replyTo:saved.pendingEmail,verifiedAt:new Date(),pendingEmail:null,challengeId:null,challengeHash:null,expiresAt:null,attempts:0}});
    return true;
  });
  if(!result)throw new FormError("This code is incorrect, expired or has reached its five-attempt limit. Use the latest code or request a new one.",400);
  return replyInbox(tenantId);
}
