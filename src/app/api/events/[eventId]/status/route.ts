import {withStaff,getStaffContext} from "@/lib/auth/staff";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {BookingError} from "@/lib/booking/rules";
import {lockReservation,assertReservation} from "@/lib/booking/service";
import {assertBookingReady} from "@/lib/booking/confirmation";
import {ensurePartyLinks} from "@/lib/booking/party-links";
import {assertNoPendingPayment} from "@/lib/payments/pending";
import {FormError} from "@/lib/waivers/signing";
import {completeWorkflowStep,getNextWorkflowStep,getWorkflowStep,isPartyWorkflowStepKey} from "@/lib/party-workflow";
type Params={params:Promise<{eventId:string}>};
async function post(request:Request,{params}:Params){try{
 const {eventId}=await params,staff=getStaffContext();let body;try{body=await request.json();}catch{throw new BookingError("Invalid workflow request.");}
 if(!body||typeof body!=="object"||Array.isArray(body))throw new BookingError("Invalid workflow request.");
 const event=await prisma.$transaction(async tx=>{
  const party=await lockReservation(tx,staff.tenantId,eventId);
  if(party.familyId&&!await tx.family.findFirst({where:{id:party.familyId,tenantId:staff.tenantId,status:"ACTIVE"},select:{id:true}}))throw new BookingError("Restore the hosting family before starting party activity.",409);
  if(party.status==="CANCELLED")throw new BookingError("Restore this party before changing its workflow.");
  const current=party.workflowStep&&isPartyWorkflowStepKey(party.workflowStep)?party.workflowStep:"PENDING";
  const next=getNextWorkflowStep(current),requested=typeof body.workflowStep==="string"&&isPartyWorkflowStepKey(body.workflowStep)?body.workflowStep:body.complete===true?completeWorkflowStep.key:next?.key??completeWorkflowStep.key;
  if(party.status==="COMPLETED"){if(body.complete===true)return party;throw new BookingError("This party is already completed.",409);}
  const step=getWorkflowStep(requested),status=body.complete===true?"COMPLETED":step.partyStatus;
  if(current===requested&&party.status===status)return party;
  if(body.complete===true&&current!==completeWorkflowStep.key||body.complete!==true&&requested!==next?.key)throw new BookingError("Refresh and complete the next party step in order.",409);
  if(party.status==="PENDING"){
   if(requested!=="CONFIRMED")throw new BookingError("Confirm the booking before starting the party workflow.",409);
   await assertBookingReady(tx,party);await assertReservation(tx,party);
  }
  if(requested==="CLEANUP"||body.complete===true){await assertNoPendingPayment(tx,staff.tenantId,[`party:${party.id}`]);if(Number(party.balanceDue)>0)throw new BookingError("Settle the remaining party balance before cleanup or completion.",409);}
  if(body.complete===true&&await tx.partyGuest.count({where:{tenantId:staff.tenantId,partyId:party.id,status:"CHECKED_IN"}}))throw new BookingError("Check out all guests before completing the party.",409);
  const updated=await tx.party.update({where:{id:party.id,tenantId:staff.tenantId},data:{status,workflowStep:requested,...(party.status==="PENDING"?{confirmedAt:new Date()}: {})}});
  if(party.status==="PENDING")await ensurePartyLinks(tx,updated);
  await tx.eventTimelineItem.create({data:{tenantId:staff.tenantId,partyId:party.id,icon:body.complete===true?"✓":step.timelineIcon,title:body.complete===true?"Party Completed":step.timelineTitle,body:`${party.eventNumber||party.title} ${body.complete===true?"was completed by staff":`moved to ${step.label}`}.`,metadata:{source:"party-manager",previousStatus:party.status,nextStatus:status,previousWorkflowStep:current,nextWorkflowStep:requested,staffId:staff.employeeId}}});
  return updated;
 });return NextResponse.json({event});
 }catch(e){if(e instanceof BookingError||e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const POST = withStaff("parties.write",post);
