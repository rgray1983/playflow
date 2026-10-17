import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getParentContext, withParent } from "@/lib/parent/access";
import { bookingOptions } from "@/lib/booking/service";
import { BookingError, scheduleFrom } from "@/lib/booking/rules";
import { createParentBooking, parentQuoteToken } from "@/lib/booking/parent-booking";
import { FormError } from "@/lib/waivers/signing";

type Params={params:Promise<{slug:string}>};
async function handleGET(request: Request, context:Params) {
  void context;
  const {tenant,parent}=getParentContext();
  if(!parent)throw new FormError("Set up your family before booking.",403);
  if(tenant.slug!=="palmetto-playhouse")throw new FormError("Parent booking is not configured for this venue.",404);
  const query=new URL(request.url).searchParams;
  if(query.has("date")){
    try {
      const options=await bookingOptions(prisma,tenant,{eventTypeId:query.get("eventTypeId")??"",packageId:query.get("packageId")??"",eventDate:query.get("date")??"",addOnIds:query.getAll("addOnId")});
      return NextResponse.json({slots:options.slots,quote:options.quote,timezone:tenant.timezone,setupMinutes:scheduleFrom(tenant.bookingSettings).setupMinutes,quoteToken:parentQuoteToken(options,scheduleFrom(tenant.bookingSettings).setupMinutes)});
    }catch(error){if(error instanceof BookingError)throw new FormError(error.message,error.status);throw error;}
  }
  const [eventTypes,packages,addOns]=await Promise.all([
    prisma.eventType.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},select:{id:true,name:true,description:true}}),
    prisma.package.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},select:{id:true,eventTypeId:true,name:true,description:true,price:true,durationMinutes:true,guestLimit:true}}),
    prisma.partyAddOn.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},select:{id:true,name:true,description:true,price:true,durationMinutes:true}}),
  ]);
  return NextResponse.json({eventTypes,packages:packages.map(p=>({...p,price:Number(p.price)})),addOns:addOns.map(a=>({...a,price:Number(a.price)})),setupMinutes:scheduleFrom(tenant.bookingSettings).setupMinutes});
}
async function handlePOST(request:Request,context:Params){
  void context;
  const {tenant,user,parent}=getParentContext();
  if(!parent)throw new FormError("Set up your family before booking.",403);
  let body;try{body=await request.json();}catch{throw new FormError("Invalid booking request.");}
  if(body?.action==="cancel"){
    if(typeof body.partyId!=="string")throw new FormError("Choose a booking.");
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenant.id} FOR UPDATE`);
      const currentParent=await tx.parent.findFirst({where:{tenantId:tenant.id,authUserId:user.id},include:{family:true}});
      if(!currentParent||currentParent.family.status!=="ACTIVE")throw new FormError("Family access is inactive.",403);
      const party=await tx.party.findFirst({where:{id:body.partyId,tenantId:tenant.id,primaryParentId:currentParent.id,familyId:currentParent.familyId},include:{payments:{where:{status:"PAID"},select:{id:true}}}});
      if(!party)throw new FormError("Booking not found.",404);
      if(party.status==="CANCELLED")return;
      if(party.status!=="PENDING"||party.depositStatus!=="PENDING"||party.payments.length>0)throw new FormError("Contact the venue to cancel a confirmed or paid booking.",409);
      await tx.party.update({where:{id:party.id},data:{status:"CANCELLED",workflowStep:"CANCELLED"}});
      await tx.eventTimelineItem.create({data:{tenantId:tenant.id,partyId:party.id,title:"Pending booking cancelled by parent",body:"The unpaid temporary hold was released.",icon:"×"}});
    });
    return NextResponse.json({cancelled:true});
  }
  try {
    const booking=await prisma.$transaction(tx=>createParentBooking(tx,tenant.id,user,body),{maxWait:10000,timeout:15000});
    return NextResponse.json({booking});
  }catch(error){if(error instanceof BookingError)throw new FormError(error.message,error.status);throw error;}
}
export const GET=withParent(handleGET);
export const POST=withParent(handlePOST);
