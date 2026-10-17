import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, withStaff } from "@/lib/auth/staff";
import { lockReservation } from "@/lib/booking/service";
import { ensurePartyLinks } from "@/lib/booking/party-links";
import { BookingError } from "@/lib/booking/rules";

async function handlePOST(request:Request,{params}:{params:Promise<{eventId:string}>}) {
  const {eventId}=await params;
  const tenantId=getStaffContext().tenantId;
  const found=await prisma.party.findUnique({where:{id:eventId,tenantId}});
  if(!found)return NextResponse.json({error:"Party not found."},{status:404});
  try{
    const links=await prisma.$transaction(async tx=>{
      const party=await lockReservation(tx,tenantId,eventId);
      return ensurePartyLinks(tx,party);
    });
    return NextResponse.json({...links,inviteUrl:new URL(`/rsvp/${encodeURIComponent(links.inviteToken)}`,request.url).href});
  }catch(error){if(error instanceof BookingError)return NextResponse.json({error:error.message},{status:error.status});throw error;}
}
export const POST = withStaff("parties.write",handlePOST);
