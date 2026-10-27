import {start} from "workflow/api";
import {dispatchBookingEmails,checkEmailTimer} from "./email-workflows";
import {automationEnabled} from "./automation-config";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {FormError} from "@/lib/waivers/signing";
export async function startEmailAutomation(tenantId:string){
  if(!automationEnabled())return;
  const pending=await prisma.bookingMessage.findFirst({where:{tenantId,status:{in:["QUEUED","SENDING"]},automationError:null,OR:[{automationKey:null},{NOT:{automationAt:{equals:prisma.bookingMessage.fields.scheduledAt}}},{automationRunId:null,automationClaimedAt:{lt:new Date(Date.now()-120000)}}]},select:{id:true}});
  if(!pending)return;
  try{await start(dispatchBookingEmails,[tenantId]);}
  catch{await prisma.communicationJobState.upsert({where:{id:"booking-email"},create:{id:"booking-email",failedAt:new Date()},update:{failedAt:new Date()}});throw new Error("Automatic email scheduling could not start.");}
}
export async function startAutomationCheck(tenantId:string){
  if(!automationEnabled())throw new FormError("Automatic email jobs are not enabled on this deployment.",409);
  const id=`booking-email-check:${tenantId}`,now=new Date();
  await prisma.$transaction(async tx=>{
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);
    const saved=await tx.communicationJobState.findUnique({where:{id}});
    if(saved?.startedAt&&now.getTime()-saved.startedAt.getTime()<120000)throw new FormError("Wait two minutes before starting another timer check.",429);
    await tx.communicationJobState.upsert({where:{id},create:{id,startedAt:now},update:{startedAt:now,completedAt:null,failedAt:null}});
  });
  try{await start(checkEmailTimer,[tenantId,now.toISOString()]);}
  catch{await prisma.communicationJobState.updateMany({where:{id,startedAt:now},data:{failedAt:new Date()}});throw new FormError("The timer check could not start. Retry after reviewing the platform setup.",503);}
}
