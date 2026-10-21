import type {Prisma} from "@/generated/prisma/client";
import {BookingError} from "./rules";
import {assertReservation} from "./service";
import {ensurePartyLinks} from "./party-links";
export async function assertBookingReady(tx:Prisma.TransactionClient,party:{id:string;tenantId:string;depositStatus:string;depositAmount:unknown}){
 if(Number(party.depositAmount)>0&&party.depositStatus!=="WAIVED"&&!party.depositStatus.endsWith("COLLECTED"))throw new BookingError("Collect or explicitly waive the required deposit before confirming this booking.",409);
 const agreement=await tx.waiver.findFirst({where:{tenantId:party.tenantId,partyId:party.id,kind:"RENTAL",status:"VALID",signedAt:{not:null},version:{not:null}}});
 if(!agreement)throw new BookingError("The hosting parent must sign the party rental agreement before confirmation.",409);
}
export async function confirmReadyBooking(tx:Prisma.TransactionClient,tenantId:string,id:string){
 const party=await tx.party.findUniqueOrThrow({where:{id,tenantId}});if(party.status!=="PENDING")return;
 try{await assertBookingReady(tx,party);await assertReservation(tx,party);}catch(e){if(e instanceof BookingError)return;throw e;}
 const confirmed=await tx.party.update({where:{id,tenantId},data:{status:"CONFIRMED",workflowStep:"CONFIRMED",confirmedAt:new Date()}});
 await ensurePartyLinks(tx,confirmed);
 await tx.eventTimelineItem.create({data:{tenantId,partyId:id,title:"Booking confirmed automatically",body:"The required deposit and signed rental agreement are on file. Private host and guest invitation links are ready.",icon:"✓"}});
}
