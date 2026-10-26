import {withStaff,getStaffContext} from "@/lib/auth/staff";
import {NextResponse} from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {FormError} from "@/lib/waivers/signing";
type Params={params:Promise<{eventId:string;guestId:string}>};
async function post(_request:Request,{params}:Params){try{
 const {eventId,guestId}=await params,staff=getStaffContext();
 const result=await prisma.$transaction(async tx=>{
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${staff.tenantId} FOR UPDATE`);
  const guest=await tx.partyGuest.findFirst({where:{id:guestId,partyId:eventId,tenantId:staff.tenantId},include:{party:true,waiverChild:{include:{waiver:true}}}});
  if(!guest)throw new FormError("Guest was not found for this party.",404);
  if(guest.party.status==="CANCELLED")throw new FormError("Cancelled parties cannot be updated.");
  if(guest.rsvpStatus==="DECLINED")throw new FormError("This guest declined the invitation.");
  if(guest.party.familyId&&!await tx.family.findFirst({where:{id:guest.party.familyId,tenantId:staff.tenantId,status:"ACTIVE"},select:{id:true}}))throw new FormError("Restore the hosting family before checking in guests.",409);
  const coverage=guest.waiverChild,waiver=coverage?.waiver;
  if(!coverage||!waiver||coverage.childId!==guest.childId||waiver.tenantId!==guest.tenantId||waiver.kind!=="LIABILITY"||coverage.status!=="VALID"||waiver.status!=="VALID"||!coverage.signedAt||!waiver.signedAt||!waiver.version||(waiver.expiresAt&&waiver.expiresAt.getTime()<=Date.now()))throw new FormError("A signed liability waiver linked to this child is required before check-in.");
  if(!await tx.child.findFirst({where:{id:guest.childId!,tenantId:staff.tenantId,familyId:waiver.familyId,active:true,family:{tenantId:staff.tenantId,status:"ACTIVE"}},select:{id:true}}))throw new FormError("Restore this child's family and child record before checking in.",409);
  if(guest.status==="CHECKED_IN")return guest;
  const updated=await tx.partyGuest.update({where:{id:guestId,tenantId:staff.tenantId},data:{status:"CHECKED_IN",checkedInAt:new Date(),checkedOutAt:null}});
  await tx.eventTimelineItem.create({data:{tenantId:staff.tenantId,partyId:eventId,icon:"✓",title:"Guest Checked In",body:`${guest.guestName||"Unnamed guest"} was checked in.`,metadata:{source:"party-manager",action:"check-in",guestId}}});return updated;
 });return NextResponse.json({guest:result});
}catch(e){if(e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const POST = withStaff("guests.write",post);
