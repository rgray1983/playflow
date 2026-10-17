import assert from "node:assert/strict";
import {test,mock,beforeEach} from "node:test";
import {legalForm,FORM_VERSION} from "../src/lib/waivers/forms";
let records:Record<string,unknown>[]=[],guests:Record<string,unknown>[]=[],children:Record<string,unknown>[]=[],parents:Record<string,unknown>[]=[],status="CONFIRMED";
const party={id:"party",tenantId:"tenant",status:"CONFIRMED",confirmationExpiresAt:null};
const tx={
 $queryRaw:async()=>[],
 party:{findUnique:async({where}:{where:{inviteToken:string}})=>where.inviteToken==="guest-token"?{...party,status}:null,findUniqueOrThrow:async()=>({...party,status})},
 tenant:{findUniqueOrThrow:async()=>({id:"tenant",slug:"palmetto-playhouse",waiverValidityDays:null})},
 family:{create:async()=>({id:"family"})},parent:{create:async({data}:{data:Record<string,unknown>})=>{parents.push(data);return{id:"parent",...data};}},
 child:{create:async({data}:{data:Record<string,unknown>})=>{const child={id:`child-${children.length}`,...data,dateOfBirth:null};children.push(child);return child;}},
 waiver:{findFirst:async({where}:{where:{requestId:string}})=>records.find(r=>r.requestId===where.requestId)||null,
 create:async({data}:{data:Record<string,unknown>})=>{const record={id:"waiver",...data,children:(data.children as {create:Record<string,unknown>[]}).create.map((c,i)=>({...c,id:`coverage-${i}`}))};records.push(record);return record;},
 update:async({data}:{data:Record<string,unknown>})=>Object.assign(records[0],data)},
 partyGuest:{create:async({data}:{data:Record<string,unknown>})=>{guests.push(data);return{id:`guest-${guests.length}`,...data};}},eventTimelineItem:{create:async()=>({})},
};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:{$transaction:async(callback:(db:object)=>Promise<unknown>)=>callback(tx)}}});
const {POST}=await import("../src/app/api/rsvp/[token]/route");
const body=()=>({response:"attending",guestName:"First Child",children:["First Child","Second Child"],parentName:"Test Guardian",guestEmail:"guardian@example.invalid",signing:{version:FORM_VERSION,requestId:"guest-request-12345678",signerName:"Test Guardian",signerEmail:"guardian@example.invalid",signature:"Test Guardian",signatureConsent:true,photoConsent:false,acknowledgments:legalForm("LIABILITY").clauses.map(c=>c[0])}});
const submit=(value:object)=>POST(new Request("http://localhost/api/rsvp/guest-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)}),{params:Promise.resolve({token:"guest-token"})});
beforeEach(()=>{records=[];guests=[];children=[];parents=[];status="CONFIRMED";});
test("RSVP saves one signed document with individual parent, child, and coverage links",async()=>{
 assert.equal((await submit(body())).status,200);assert.equal(records.length,1);assert.equal(children.length,2);assert.equal(guests.length,2);
 assert.deepEqual(guests.map(g=>g.waiverChildId),["coverage-0","coverage-1"]);assert.deepEqual(guests.map(g=>g.childId),["child-0","child-1"]);
 assert.ok(guests.every(g=>g.waiverStatus==="SIGNED"));assert.equal(parents[0].authUserId,undefined);assert.equal(records[0].photoConsent,false);assert.equal(records[0].partyId,"party");
});
test("identical RSVP signature retries do not duplicate family, children or waiver records",async()=>{
 const input=body();await submit(input);const response=await submit(input);assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);assert.equal(guests.length,2);assert.equal(parents.length,1);
 const changed={...input,children:["Different Child"]};assert.equal((await submit(changed)).status,409);assert.equal(children.length,2);
});
test("the old waiver checkbox cannot manufacture a signed record",async()=>{
 const old={response:"attending",guestName:"Child",children:["Child"],waiverAccepted:true};assert.equal((await submit(old)).status,400);assert.equal(records.length,0);assert.equal(guests.length,0);
});
test("cancelled parties reject new signatures and declines do not create waiver coverage",async()=>{
 status="CANCELLED";assert.equal((await submit(body())).status,410);assert.equal(records.length,0);
 status="CONFIRMED";assert.equal((await submit({response:"declined",guestName:"Child"})).status,200);assert.equal(records.length,0);assert.equal(guests[0].waiverStatus,"NOT_NEEDED");
});
