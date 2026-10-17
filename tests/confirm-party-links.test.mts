import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
let party:any,linksIssued=0;
const staff={id:"staff",tenantId:"tenant",authUserId:"user",firstName:"Test",lastName:"Owner",status:"ACTIVE",accessRole:"OWNER",accessApproved:true,staffRole:null};
const db:any={employee:{findUnique:async()=>staff},tenant:{findUniqueOrThrow:async()=>({bookingSettings:{}})},party:{
 findUnique:async({where}:any)=>(where.id===party.id&&(!where.tenantId||where.tenantId==="tenant"))||where.confirmationToken==="confirmation-token"?party:null,
 findUniqueOrThrow:async()=>party,findFirst:async()=>null,
 update:async({data}:any)=>{linksIssued++;Object.assign(party,data);return party;},
},eventTimelineItem:{create:async()=>({})},$queryRaw:async()=>[],
 $executeRawUnsafe:async()=>{party.status="CONFIRMED";party.confirmedAt=new Date();},
 $transaction:async(callback:any)=>callback(db),
};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:{user:{id:"user",email:"test@example.invalid",emailVerified:true}},error:null})})}});
const {POST:confirm}=await import("../src/app/api/events/[eventId]/confirm/route");
const {POST:confirmByLink}=await import("../src/app/api/confirm-party/[token]/route");
const {POST:repair}=await import("../src/app/api/events/[eventId]/links/route");
const request=()=>new Request("http://localhost/api/test",{method:"POST"});
beforeEach(()=>{linksIssued=0;party={id:"party",tenantId:"tenant",status:"PENDING",title:"Test",startTime:new Date("2030-01-01T17:00Z"),endTime:new Date("2030-01-01T19:00Z"),confirmationExpiresAt:new Date("2030-01-01"),confirmedAt:null,hostToken:null,inviteToken:null,inviteUrl:null};});
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
