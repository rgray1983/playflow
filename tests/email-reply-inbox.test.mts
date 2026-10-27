import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
let saved:any=null,sends:any[]=[],dispatches=0,signedIn=true,role="OWNER",status=200,transportError=false,tail=Promise.resolve();
const db:any={employee:{findUnique:async()=>({id:"staff",tenantId:"tenant-a",authUserId:"user",firstName:"Test",lastName:"Owner",status:"ACTIVE",accessApproved:true,accessRole:role,staffRole:null}),findMany:async()=>[]},$queryRaw:async()=>[],emailConfiguration:{
 findUnique:async(q:any)=>{assert.equal(q.where.tenantId,"tenant-a");return saved?structuredClone(saved):null;},
 upsert:async(q:any)=>{saved=saved?{...saved,...q.update}:q.create;return saved;},
 update:async(q:any)=>{assert.equal(q.where.tenantId,"tenant-a");const data={...q.data};if(data.attempts?.increment)data.attempts=saved.attempts+data.attempts.increment;saved={...saved,...data};return saved;},
}};
db.$transaction=async(callback:any)=>{const previous=tail;let done!:()=>void;tail=new Promise<void>(resolve=>{done=resolve;});await previous;try{return await callback(db);}finally{done();}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:signedIn?{user:{id:"user",email:"owner@example.invalid",emailVerified:true}}:null,error:null})})}});
mock.module("../src/lib/communications/background.ts",{namedExports:{scheduleDelivery:()=>{dispatches++;}}});
const {GET,POST}=await import("../src/app/api/communications/reply-inbox/route");
const request=(body:any,origin="https://app.example.invalid")=>new Request("https://app.example.invalid/api/communications/reply-inbox",{method:"POST",headers:{"Content-Type":"application/json",origin},body:JSON.stringify(body)});
async function start(email="approved@example.invalid"){return POST(request({action:"request",email,tenantId:"foreign-tenant"}));}
function code(){return sends.at(-1).body.text.match(/code is: ([A-F0-9]{12})/)[1];}
async function confirm(value=code(),id=saved.challengeId){return POST(request({action:"confirm",challengeId:id,code:value}));}
beforeEach(()=>{saved=null;sends=[];dispatches=0;signedIn=true;role="OWNER";status=200;transportError=false;tail=Promise.resolve();process.env.VERCEL_ENV="preview";process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="approved@example.invalid,second@example.invalid";process.env.RESEND_API_KEY="test-not-real";process.env.PLAYFLOW_EMAIL_FROM="PlayFlow <test@example.invalid>";mock.method(globalThis,"fetch",async(input:any,init:any)=>{assert.equal(input,"https://api.resend.com/emails");sends.push({body:JSON.parse(init.body),key:init.headers["Idempotency-Key"]});if(transportError)throw new Error("private transport error");return Response.json({id:"verification-id"},{status});});});
test("reply inbox verification is tenant scoped, hashes the one-time code and never dispatches bookings",async()=>{
 assert.equal((await start(" APPROVED@EXAMPLE.INVALID ")).status,200);assert.deepEqual(sends[0].body.to,["approved@example.invalid"]);assert.match(sends[0].key,/^playflow-reply-/);assert.equal(saved.tenantId,"tenant-a");assert.match(saved.challengeHash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(saved).includes(code()));
 const pending=await (await GET()).json();assert.equal(pending.replyTo,null);assert.ok(!("challengeHash" in pending));assert.ok(!JSON.stringify(pending).includes(code()));
 assert.equal((await confirm(code().toLowerCase())).status,200);assert.equal(saved.replyTo,"approved@example.invalid");assert.ok(saved.verifiedAt);assert.equal(saved.challengeHash,null);assert.equal((await confirm("INVALID-CODE","old-challenge")).status,400);assert.equal(sends.length,1);assert.equal(dispatches,0);
});
test("test mode and invalid mailbox headers block verification before writing or sending",async()=>{
 for(const email of ["other@example.invalid","Name <approved@example.invalid>","approved@example.invalid\r\nBcc:other@example.invalid","a@example.invalid,b@example.invalid",null])assert.ok([400,409].includes((await start(email as any)).status));
 assert.equal(saved,null);assert.equal(sends.length,0);delete process.env.RESEND_API_KEY;assert.equal((await start()).status,409);
});
test("replacing a reply inbox preserves the verified address until the new inbox proves ownership",async()=>{
 await start();await confirm();saved.requestedAt=new Date(0);await start("second@example.invalid");assert.equal(saved.replyTo,"approved@example.invalid");assert.equal(saved.pendingEmail,"second@example.invalid");await confirm();assert.equal(saved.replyTo,"second@example.invalid");assert.equal(saved.pendingEmail,null);
});
test("codes expire, stale challenges do not consume a new challenge and five wrong attempts lock it",async()=>{
 await start();const oldId=saved.challengeId,oldCode=code();saved.requestedAt=new Date(0);await start();assert.equal((await confirm(oldCode,oldId)).status,400);assert.equal(saved.attempts,0);
 for(let n=0;n<5;n++)assert.equal((await confirm("not-the-code")).status,400);assert.equal((await confirm()).status,400);assert.equal(saved.replyTo,undefined);
 saved.requestedAt=new Date(0);await start();saved.expiresAt=new Date(0);assert.equal((await confirm()).status,400);
});
test("per-business cooldown, hourly quota and concurrent requests prevent verification spam",async()=>{
 const both=await Promise.all([start(),start()]);assert.deepEqual(both.map(r=>r.status),[200,429]);assert.equal(sends.length,1);
 for(let n=0;n<4;n++){saved.requestedAt=new Date(0);assert.equal((await start()).status,200);}saved.requestedAt=new Date(0);assert.equal((await start()).status,429);assert.equal(sends.length,5);saved.windowStartedAt=new Date(0);assert.equal((await start()).status,200);
});
test("an uncertain provider response exposes no error details and a received code remains usable",async()=>{
 transportError=true;const response=await start();assert.equal(response.status,503);assert.ok(!JSON.stringify(await response.json()).includes("private transport"));assert.equal((await confirm()).status,200);assert.equal(sends.length,1);assert.equal(dispatches,0);
});
test("reply settings require verified settings staff and same-origin writes",async()=>{
 signedIn=false;assert.equal((await GET()).status,401);signedIn=true;for(const value of ["FRONT_DESK","PARTY_HOST"]){role=value;assert.equal((await GET()).status,403);assert.equal((await start()).status,403);}role="MANAGER";assert.equal((await GET()).status,200);assert.equal((await POST(request({action:"request",email:"approved@example.invalid"},"https://foreign.invalid"))).status,403);assert.equal(sends.length,0);assert.equal(dispatches,0);
});
