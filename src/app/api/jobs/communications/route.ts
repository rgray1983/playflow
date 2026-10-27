import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {processMessages,senderReady} from "@/lib/communications/service";
import {prisma} from "@/lib/prisma";
export const maxDuration=60;
function json(body:object,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});}
export async function GET(request:Request){
 const expected=process.env.CRON_SECRET,actual=request.headers.get("authorization")??"";
 const received=Buffer.from(actual),wanted=Buffer.from(`Bearer ${expected??""}`);
 if(!expected||received.length!==wanted.length||!timingSafeEqual(received,wanted))return json({error:"Unauthorized."},401);
 // Validate scheduler routing/authentication without reading the queue or sending email.
 if(new URL(request.url).searchParams.get("dryRun")==="1")return json({dryRun:true,configured:senderReady(),processed:0});
 if(!senderReady())return json({processed:0,configured:false});
 try{
  await prisma.communicationJobState.upsert({where:{id:"booking-email"},create:{id:"booking-email",startedAt:new Date()},update:{startedAt:new Date()}});
  const processed=await processMessages();
  await prisma.communicationJobState.update({where:{id:"booking-email"},data:{completedAt:new Date()}});
  return json({processed});
 }
 catch{try{await prisma.communicationJobState.upsert({where:{id:"booking-email"},create:{id:"booking-email",failedAt:new Date()},update:{failedAt:new Date()}});}catch{/* Preserve the retryable response if storage itself is unavailable. */}console.error("Scheduled booking email processing failed.");return json({error:"Email processing is temporarily unavailable. Retry the scheduled request."},503);}
}
