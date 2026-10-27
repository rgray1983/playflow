import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
import {deliveryPolicy,recipientAllowed} from "../src/lib/communications/delivery-policy";
let updates=0,runs=0,lastLookup:any,lookupExists=true;
const db={bookingMessage:{
 findFirst:async(q:any)=>{lastLookup=q;return lookupExists?{recipient:"parent@example.invalid"}:null;},
 updateMany:async()=>{updates++;return {count:1};},
 findMany:async()=>[{id:"message",recipient:"parent@example.invalid"}],
},tenant:{findUniqueOrThrow:async()=>({operationalSettings:{communications:{enabled:true}}})}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/staff.ts",{namedExports:{getStaffContext:()=>({tenantId:"tenant"}),withStaff:(permission:string,handler:any)=>{assert.equal(permission,"settings.write");return handler;}}});
mock.module("../src/lib/communications/service.ts",{namedExports:{preparePartyMessages:async()=>{},senderReady:()=>true,emailSetup:()=>({testMode:true}),processMessages:async(tenantId:string)=>{assert.equal(tenantId,"tenant");runs++;}}});
const {POST,GET}=await import("../src/app/api/communications/route");
beforeEach(()=>{updates=0;runs=0;lastLookup=null;lookupExists=true;delete process.env.PLAYFLOW_EMAIL_DELIVERY_MODE;delete process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS;process.env.VERCEL_ENV="preview";});
const request=(action:string,id:any="message")=>new Request("https://app.example.invalid/api/communications",{method:"POST",body:JSON.stringify({action,id})});
test("test recipients require exact addresses; malformed config and unknown mode fail closed",()=>{
 for(const value of [undefined,"","parent@example.invalid;other@example.invalid","Parent <parent@example.invalid>","parent@example.invalid,broken"]){
  if(value===undefined)delete process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS;else process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS=value;
  assert.equal(recipientAllowed("parent@example.invalid"),false);
 }
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS=" PARENT@example.invalid,parent@example.invalid ";
 assert.deepEqual(deliveryPolicy().recipients,["parent@example.invalid"]);
 assert.equal(recipientAllowed("Parent@EXAMPLE.INVALID"),true);
 assert.equal(recipientAllowed("different@example.invalid"),false);
 process.env.PLAYFLOW_EMAIL_DELIVERY_MODE="typo";assert.equal(deliveryPolicy().testMode,true);
});
test("live delivery is explicit and cannot be enabled on Vercel previews",()=>{
 process.env.PLAYFLOW_EMAIL_DELIVERY_MODE="live";assert.equal(recipientAllowed("other@example.invalid"),false);
 process.env.VERCEL_ENV="production";assert.equal(recipientAllowed("other@example.invalid"),true);
 delete process.env.PLAYFLOW_EMAIL_DELIVERY_MODE;assert.equal(recipientAllowed("other@example.invalid"),false);
});
test("manual draft approval and retry cannot bypass test restrictions",async()=>{
 for(const action of ["queue","retry"]){const response=await POST(request(action));assert.equal(response.status,409);assert.match((await response.json()).error,/approved test inbox/);}
 assert.deepEqual(lastLookup.where,{id:"message",tenantId:"tenant"});assert.equal(updates,0);assert.equal(runs,0);
});
test("approved test approval processes only the requesting business",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="parent@example.invalid";
 assert.equal((await POST(request("queue"))).status,200);assert.equal(updates,1);assert.equal(runs,1);
});
test("unknown message and invalid IDs do not disclose or mutate another business",async()=>{
 lookupExists=false;assert.equal((await POST(request("retry"))).status,404);
 assert.equal((await POST(request("queue",null))).status,400);assert.equal(updates,0);assert.equal(runs,0);
});
test("queue view marks blocked recipients without changing message content",async()=>{
 const data=await (await GET()).json();assert.equal(data.items[0].deliveryAllowed,false);
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="parent@example.invalid";
 const allowed=await (await GET()).json();assert.equal(allowed.items[0].deliveryAllowed,true);
 assert.equal(allowed.items[0].recipient,"parent@example.invalid");
});
