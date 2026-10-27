import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
import {Webhook} from "svix";
let messages:any[]=[],receipts:any[]=[],suppressions:any[]=[],reads=0,unavailable=false,tail=Promise.resolve();
const db:any={$queryRaw:async()=>[],bookingMessage:{
 findFirst:async({where}:any)=>{reads++;if(unavailable)throw new Error("private database error");return messages.find(m=>Object.entries(where).every(([key,value])=>m[key]===value))??null;},
 findUniqueOrThrow:async({where}:any)=>structuredClone(messages.find(m=>m.id===where.id)),
 update:async({where,data}:any)=>Object.assign(messages.find(m=>m.id===where.id),data),
},emailDeliveryEvent:{createMany:async({data}:any)=>{if(receipts.some(r=>r.id===data[0].id))return {count:0};receipts.push(...data);return {count:1};}},emailSuppression:{upsert:async({where,create,update}:any)=>{const key=where.tenantId_recipient,old=suppressions.find(s=>s.tenantId===key.tenantId&&s.recipient===key.recipient);if(old)Object.assign(old,update);else suppressions.push(create);}}};
db.$transaction=async(callback:any)=>{const previous=tail;let done!:()=>void;tail=new Promise<void>(resolve=>{done=resolve;});await previous;try{return await callback(db);}finally{done();}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
const {POST}=await import("../src/app/api/communications/webhook/route");
const secret="whsec_"+Buffer.alloc(32,7).toString("base64"),wh=new Webhook(secret);
function event(kind="email.delivered",extra:any={}){return {type:kind,created_at:new Date().toISOString(),data:{email_id:"provider-id",from:"Venue <sender@example.invalid>",to:["parent@example.invalid"],tags:{playflow_message:"message-a",playflow_tenant:"tenant-a"},...extra}};}
function request(value:any,id="msg_delivery_1",date=new Date(),signature?:string){const body=typeof value==="string"?value:JSON.stringify(value);return new Request("https://app.example.invalid/api/communications/webhook",{method:"POST",headers:{"svix-id":id,"svix-timestamp":String(Math.floor(date.getTime()/1000)),"svix-signature":signature??wh.sign(id,date,body)},body});}
beforeEach(()=>{messages=[{id:"message-a",tenantId:"tenant-a",recipient:"parent@example.invalid",senderFrom:"Venue <sender@example.invalid>",providerId:"provider-id",attemptedAt:new Date(),transportVersion:1,status:"SENT",sentAt:new Date(),deliveryStatus:"UNKNOWN",deliveryUpdatedAt:null,deliveredAt:null}];receipts=[];suppressions=[];reads=0;unavailable=false;tail=Promise.resolve();process.env.RESEND_WEBHOOK_SECRET=secret;});
test("signed delivery updates are idempotent, minimal and do not claim that the parent opened the email",async()=>{
 const response=await POST(request(event()));assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal(messages[0].deliveryStatus,"DELIVERED");assert.ok(messages[0].deliveredAt);assert.equal(receipts.length,1);assert.ok(!("subject" in receipts[0]));const snapshot=structuredClone(messages);
 assert.equal((await POST(request(event()))).status,200);assert.deepEqual(messages,snapshot);assert.equal(receipts.length,1);
});
test("tampered signatures, stale requests and missing configuration never reach the database",async()=>{
 assert.equal((await POST(request(event(),"msg_bad",new Date(),"v1,not-a-valid-signature"))).status,403);
 assert.equal((await POST(request(event(),"msg_old",new Date(Date.now()-10*60000)))).status,403);
 const original=JSON.stringify(event());const signed=request(original,"msg_tampered");assert.equal((await POST(new Request(signed.url,{method:"POST",headers:signed.headers,body:original+" "}))).status,403);
 delete process.env.RESEND_WEBHOOK_SECRET;assert.equal((await POST(request(event()))).status,503);assert.equal(reads,0);
});
test("out-of-order events cannot turn a complaint or bounce back into delivered",async()=>{
 for(const [n,kind]of ["email.bounced","email.delivered","email.delivery_delayed","email.sent","email.complained","email.delivered"].entries())assert.equal((await POST(request(event(kind),`msg_${n}`))).status,200);
 assert.equal(messages[0].deliveryStatus,"COMPLAINED");assert.equal(suppressions.length,1);assert.equal(suppressions[0].tenantId,"tenant-a");assert.equal(suppressions[0].reason,"COMPLAINED");assert.equal(receipts.length,6);
});
test("delays can progress to delivery; a delayed email is never automatically resent",async()=>{
 await POST(request(event("email.delivery_delayed"),"msg_delay"));assert.equal(messages[0].deliveryStatus,"DELAYED");assert.equal(messages[0].status,"SENT");assert.equal(suppressions.length,0);
 await POST(request(event(),"msg_delivered"));await POST(request(event("email.delivery_delayed"),"msg_old_delay"));assert.equal(messages[0].deliveryStatus,"DELIVERED");
});
test("tags reconcile a signed event before the send response, including an uncertain delivery",async()=>{
 messages[0].providerId=null;messages[0].status="QUEUED";messages[0].sentAt=null;messages[0].failureCode="DELIVERY_UNCERTAIN";messages[0].retryAt=new Date();
 await POST(request(event()));assert.equal(messages[0].providerId,"provider-id");assert.equal(messages[0].status,"SENT");assert.equal(messages[0].retryAt,null);assert.equal(messages[0].failureCode,null);
});
test("forged associations, unrelated provider emails and recipient mismatches cannot change another message",async()=>{
 for(const [n,changes]of [{tags:{playflow_message:"message-a",playflow_tenant:"tenant-b"}},{to:["different@example.invalid"]},{from:"other@example.invalid"},{email_id:"different-provider-id"},{tags:{playflow_message:"missing",playflow_tenant:"tenant-a"}}].entries())assert.equal((await POST(request(event("email.delivered",changes),`msg_scope_${n}`))).status,200);
 assert.equal(receipts.length,0);assert.equal(messages[0].deliveryStatus,"UNKNOWN");messages[0].attemptedAt=null;await POST(request(event(),"msg_unattempted"));assert.equal(receipts.length,0);
});
test("old messages with a known provider ID support tracking without changing their legacy payload",async()=>{
 messages[0].transportVersion=0;await POST(request(event("email.failed",{tags:undefined})));assert.equal(messages[0].deliveryStatus,"FAILED");assert.equal(suppressions.length,0);assert.equal(messages[0].status,"SENT");
});
test("unsupported events are acknowledged without storing engagement data; malformed events are rejected",async()=>{
 assert.equal((await POST(request(event("email.opened")))).status,200);assert.equal(reads,0);
 assert.equal((await POST(request({...event(),created_at:"bad-date"}))).status,400);assert.equal((await POST(request(event("email.delivered",{to:[]})))).status,400);
 assert.equal((await POST(request("x".repeat(65537)))).status,413);assert.equal(reads,0);
});
test("temporary storage failures return a retryable response without private error details",async()=>{
 unavailable=true;const response=await POST(request(event()));assert.equal(response.status,503);assert.ok(!JSON.stringify(await response.json()).includes("private database"));assert.equal(receipts.length,0);
});
