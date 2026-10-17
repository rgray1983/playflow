import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { BookingError } from "./rules";

type LinkParty = {id:string;tenantId:string;status:string;inviteToken:string|null;hostToken:string|null;inviteUrl:string|null};
export function linksReleased(status:string) {return ["CONFIRMED","READY","IN_PROGRESS","CLEANING_UP","COMPLETED"].includes(status);}
export function partyLinkPaths(party: Pick<LinkParty,"status"|"inviteToken"|"hostToken">) {
  if(!linksReleased(party.status)||!party.inviteToken||!party.hostToken||party.inviteToken===party.hostToken)return null;
  return {hostUrl:`/rsvp/${encodeURIComponent(party.hostToken)}/host`,guestUrl:`/rsvp/${encodeURIComponent(party.inviteToken)}`};
}
// Call while holding the tenant reservation lock; never rotate existing valid links.
export async function ensurePartyLinks(tx:Prisma.TransactionClient,party:LinkParty) {
  if(!linksReleased(party.status))throw new BookingError("Party links are available after confirmation.",409);
  const inviteToken=party.inviteToken||randomBytes(32).toString("base64url");
  const hostToken=party.hostToken&&party.hostToken!==inviteToken?party.hostToken:randomBytes(32).toString("base64url");
  const inviteUrl=`/rsvp/${encodeURIComponent(inviteToken)}`;
  if(!party.inviteToken||!party.hostToken||party.hostToken===inviteToken||!party.inviteUrl){
    await tx.party.update({where:{id:party.id,tenantId:party.tenantId},data:{inviteToken,hostToken,inviteUrl}});
    await tx.eventTimelineItem.create({data:{tenantId:party.tenantId,partyId:party.id,title:"Party links available",body:"Separate private host and shareable guest links are ready. No email was sent.",icon:"🔗"}});
  }
  return {inviteToken,hostToken,inviteUrl:party.inviteUrl||inviteUrl};
}
