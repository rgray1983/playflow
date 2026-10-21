import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
let party:any,linksIssued=0,overlap=false,agreement=true;
const staff={id:"staff",tenantId:"tenant",authUserId:"user",firstName:"Test",lastName:"Owner",status:"ACTIVE",accessRole:"OWNER",accessApproved:true,staffRole:null};
const db:any={waiver:{findFirst:async()=>agreement?{id:"signed-agreement"}:null},employee:{findUnique:async()=>staff},tenant:{findUniqueOrThrow:async()=>({bookingSettings:{}})},party:{
 findUnique:async({where}:any)=>(where.id===party.id&&(!where.tenantId||where.tenantId==="tenant"))||where.confirmationToken==="confirmation-token"?party:null,
 findUniqueOrThrow:async()=>party,findFirst:async()=>overlap?{id:"other-party"}:null,
 update:async({data}:any)=>{linksIssued++;Object.assign(party,data);return party;},
},eventTimelineItem:{create:async()=>({})},$queryRaw:async()=>[],
 $executeRawUnsafe:async()=>{party.status="CONFIRMED";party.confirmedAt=new Date();},
 $transaction:async(callback:any)=>callback(db),
};
mock.module("../src/lib/communications/service.ts",{namedExports:{preparePartyMessages:async()=>{}}});
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:{user:{id:"user",email:"test@example.invalid",emailVerified:true}},error:null})})}});
const {POST:confirm}=await import("../src/app/api/events/[eventId]/confirm/route");
const {POST:confirmByLink}=await import("../src/app/api/confirm-party/[token]/route");
const {POST:repair}=await import("../src/app/api/events/[eventId]/links/route");
const request=()=>new Request("http://localhost/api/test",{method:"POST"});
beforeEach(()=>{agreement=true;overlap=false;linksIssued=0;party={id:"party",tenantId:"tenant",depositStatus:"WAIVED",depositAmount:100,status:"PENDING",title:"Test",startTime:new Date("2030-01-01T17:00Z"),endTime:new Date("2030-01-01T19:00Z"),confirmationExpiresAt:new Date("2030-01-01"),confirmedAt:null,hostToken:null,inviteToken:null,inviteUrl:null};});
test("staff confirmation creates links and confirming an already-confirmed party repairs without rotating them",async()=>{
 const ctx={params:Promise.resolve({eventId:"party"})};assert.equal((await confirm(request(),ctx)).status,200);assert.equal(party.status,"CONFIRMED");assert.ok(party.hostToken);assert.ok(party.inviteToken);assert.notEqual(party.hostToken,party.inviteToken);
 const tokens=[party.hostToken,party.inviteToken];assert.equal((await confirm(request(),ctx)).status,200);assert.deepEqual([party.hostToken,party.inviteToken],tokens);assert.equal(linksIssued,1);
 party.hostToken=null;assert.equal((await confirm(request(),ctx)).status,200);assert.ok(party.hostToken);assert.equal(party.inviteToken,tokens[1]);
});
test("confirmation links generate credentials without exposing them in the public response",async()=>{
 const response=await confirmByLink(request(),{params:Promise.resolve({token:"confirmation-token"})});assert.equal(response.status,200);const json=await response.json();assert.ok(party.hostToken);assert.equal(json.party.hostToken,undefined);assert.equal(json.party.inviteToken,undefined);
});
test("staff link repair cannot target another tenant or a pending party",async()=>{
 assert.equal((await repair(request(),{params:Promise.resolve({eventId:"foreign"})})).status,404);assert.equal(linksIssued,0);
 assert.equal((await repair(request(),{params:Promise.resolve({eventId:"party"})})).status,409);assert.equal(linksIssued,0);
});

test("expired or cancelled holds cannot confirm or issue private/shareable links",async()=>{
 const ctx={params:Promise.resolve({eventId:"party"})},publicCtx={params:Promise.resolve({token:"confirmation-token"})};
 party.confirmationExpiresAt=new Date("2020-01-01");assert.equal((await confirm(request(),ctx)).status,410);assert.equal((await confirmByLink(request(),publicCtx)).status,410);assert.equal(party.status,"PENDING");assert.equal(linksIssued,0);
 party.status="CANCELLED";assert.equal((await confirm(request(),ctx)).status,400);assert.equal((await confirmByLink(request(),publicCtx)).status,400);assert.equal(linksIssued,0);
});
test("overlapping bookings cannot be confirmed through staff or public confirmation links",async()=>{
 overlap=true;assert.equal((await confirm(request(),{params:Promise.resolve({eventId:"party"})})).status,409);assert.equal((await confirmByLink(request(),{params:Promise.resolve({token:"confirmation-token"})})).status,409);assert.equal(linksIssued,0);assert.equal(party.status,"PENDING");
});

test("unpaid or unsigned bookings cannot confirm or release links from staff or public confirmation",async()=>{
 const ctx={params:Promise.resolve({eventId:"party"})},pub={params:Promise.resolve({token:"confirmation-token"})};
 party.depositStatus="PENDING";assert.equal((await confirm(request(),ctx)).status,409);assert.equal((await confirmByLink(request(),pub)).status,409);assert.equal(linksIssued,0);
 party.depositStatus="CARD_COLLECTED";agreement=false;assert.equal((await confirm(request(),ctx)).status,409);assert.equal((await confirmByLink(request(),pub)).status,409);assert.equal(linksIssued,0);
});
