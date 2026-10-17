import assert from "node:assert/strict";
import {test} from "node:test";
import type {Prisma} from "../src/generated/prisma/client";
import {ensurePartyLinks,partyLinkPaths,linksReleased} from "../src/lib/booking/party-links";
import {BookingError} from "../src/lib/booking/rules";

test("confirmed parties receive distinct private host and guest links, with stable retries",async()=>{
 const party={id:"party",tenantId:"tenant",status:"CONFIRMED",inviteToken:null as string|null,hostToken:null as string|null,inviteUrl:null as string|null};
 let writes=0,timeline=0;
 const tx={party:{update:async({where,data}:{where:unknown;data:object})=>{assert.deepEqual(where,{id:"party",tenantId:"tenant"});writes++;Object.assign(party,data);return party;}},eventTimelineItem:{create:async()=>{timeline++;}}} as unknown as Prisma.TransactionClient;
 const first=await ensurePartyLinks(tx,party);assert.notEqual(first.inviteToken,first.hostToken);assert.match(first.hostToken,/^[-_A-Za-z0-9]{43}$/);assert.match(first.inviteToken,/^[-_A-Za-z0-9]{43}$/);
 const paths=partyLinkPaths({...party,...first});assert.equal(paths?.guestUrl,`/rsvp/${first.inviteToken}`);assert.equal(paths?.hostUrl,`/rsvp/${first.hostToken}/host`);assert.ok(!paths?.guestUrl.includes(first.hostToken));
 assert.deepEqual(await ensurePartyLinks(tx,party),first);assert.equal(writes,1);assert.equal(timeline,1);
});
test("pending, cancelled and unknown states do not release links",async()=>{
 const tx={} as Prisma.TransactionClient;
 for(const status of ["PENDING","CANCELLED","UNKNOWN"]){const party={id:"p",tenantId:"t",status,inviteToken:"guest",hostToken:"host",inviteUrl:"/rsvp/guest"};assert.equal(linksReleased(status),false);assert.equal(partyLinkPaths(party),null);await assert.rejects(ensurePartyLinks(tx,party),(error:unknown)=>error instanceof BookingError&&error.status===409);}
});
test("repair preserves an existing guest invitation while separating a legacy shared token",async()=>{
 const party={id:"party",tenantId:"tenant",status:"CONFIRMED",inviteToken:"existing-guest",hostToken:"existing-guest",inviteUrl:"/rsvp/existing-guest"};
 const tx={party:{update:async()=>party},eventTimelineItem:{create:async()=>({})}} as unknown as Prisma.TransactionClient;
 const repaired=await ensurePartyLinks(tx,party);assert.equal(repaired.inviteToken,"existing-guest");assert.notEqual(repaired.hostToken,"existing-guest");
});
