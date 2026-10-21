import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {preparePartyMessages,processMessages,senderReady} from "@/lib/communications/service";
async function get(){return NextResponse.json({senderReady:senderReady(),items:await prisma.bookingMessage.findMany({where:{tenantId:getStaffContext().tenantId},orderBy:{createdAt:"desc"},take:100,select:{id:true,partyId:true,kind:true,recipient:true,subject:true,body:true,status:true,scheduledAt:true,sentAt:true,failureCode:true}})});}
async function post(request:Request){let b;try{b=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}const tenantId=getStaffContext().tenantId;
 if(b?.action==="prepare"){
  const parties=await prisma.party.findMany({where:{tenantId,status:{notIn:["CANCELLED","COMPLETED"]},startTime:{gt:new Date()}},take:100,orderBy:{startTime:"asc"},select:{id:true}});
  for(const p of parties)await prisma.$transaction(async tx=>{await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${tenantId} FOR UPDATE`);await preparePartyMessages(tx,tenantId,p.id);});
 }else if(b?.action==="queue"&&typeof b.id==="string"){
  if(!senderReady())return NextResponse.json({error:"Connect a verified platform sender first."},{status:409});
  await prisma.bookingMessage.updateMany({where:{id:b.id,tenantId,status:"DRAFT"},data:{status:"QUEUED"}});
 }else if(b?.action==="cancel"&&typeof b.id==="string")await prisma.bookingMessage.updateMany({where:{id:b.id,tenantId,status:{in:["DRAFT","QUEUED"]}},data:{status:"CANCELLED"}});
 else if(b?.action!=="process")return NextResponse.json({error:"Choose a message action."},{status:400});
 if(b.action!=="prepare"&&senderReady())await processMessages(tenantId);
 return NextResponse.json({saved:true});
}
export const GET = withStaff("settings.write",get);
export const POST = withStaff("settings.write",post);
