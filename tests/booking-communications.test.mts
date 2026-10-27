import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
let savedContact=false,lastSavedQueue:any=null;
let responseStatus=200,transportError=false,lastCandidates:any,changeBeforeClaim=false;
let messages:any[]=[],sends:any[]=[],enabled=false,party:any,agreement=true,clock=new Date();
const tenant:any={id:"tenant",slug:"venue",name:"Test Venue",timezone:"America/New_York",operationalSettings:{communications:{enabled:false,reminderHours:48}}};
let inbox:any={replyTo:"business@example.invalid",verifiedAt:new Date()},suppression:any=null;
const db:any={$queryRaw:async(q:any)=>{if(q.text.startsWith("SELECT m.id")){lastSavedQueue=q;return messages.slice(0,3).map(m=>({id:m.id,tenantId:m.tenantId}));}return savedContact?[{email:party.primaryParent.email.trim().toLowerCase()}]:[];},emailConfiguration:{findUnique:async()=>inbox},emailSuppression:{findUnique:async()=>suppression},tenant:{findUniqueOrThrow:async()=>tenant},waiver:{findFirst:async()=>agreement?{id:"agreement"}:null},party:{findFirst:async()=>party},bookingMessage:{
 upsert:async({where,create}:any)=>{const key=where.tenantId_dedupeKey;const old=messages.find(m=>m.tenantId===key.tenantId&&m.dedupeKey===key.dedupeKey);if(old)return old;const m={id:`message-${messages.length}`,createdAt:clock,updatedAt:clock,attemptedAt:null,...create};messages.push(m);return m;},
 findMany:async(q:any)=>{lastCandidates=q;return messages.map(m=>({id:m.id,tenantId:m.tenantId}));},
 findFirst:async({where}:any)=>{const m=messages.find(m=>m.id===where.id&&m.tenantId===where.tenantId);return m?{...m,party,tenant}:null;},
 update:async({where,data}:any)=>Object.assign(messages.find(m=>m.id===where.id),data),
 updateMany:async({where,data}:any)=>{const m=messages.find(m=>m.id===where.id&&(!where.tenantId||m.tenantId===where.tenantId));if(!m)return {count:0};if(changeBeforeClaim&&data.status==="SENDING"){changeBeforeClaim=false;m.updatedAt=new Date(m.updatedAt.getTime()+1000);m.body="Changed before claim";}if(where.updatedAt instanceof Date&&m.updatedAt.getTime()!==where.updatedAt.getTime())return {count:0};if(typeof where.status==="string"&&m.status!==where.status)return {count:0};if(where.status?.in&&!where.status.in.includes(m.status))return {count:0};if(where.OR&&!where.OR.some((w:any)=>m.status===w.status&&(!w.updatedAt||m.updatedAt<w.updatedAt.lt)))return {count:0};const applied={...data};if(data.attemptCount?.increment)applied.attemptCount=(m.attemptCount??0)+data.attemptCount.increment;Object.assign(m,applied,{updatedAt:new Date()});return {count:1};},
}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/booking/party-links.ts",{namedExports:{partyLinkPaths:(p:any)=>p.status!=="PENDING"?{hostUrl:"/rsvp/private-host/host",guestUrl:"/rsvp/shareable-guest"}:null}});
const {preparePartyMessages,deliverMessage,processMessages,retryTime,emailSetup,senderReady}=await import("../src/lib/communications/service");
beforeEach(()=>{delete process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE;savedContact=false;lastSavedQueue=null;inbox={replyTo:"business@example.invalid",verifiedAt:new Date()};suppression=null;delete tenant.operationalSettings.communications.templates;changeBeforeClaim=false;responseStatus=200;transportError=false;lastCandidates=null;messages=[];sends=[];enabled=false;agreement=true;tenant.operationalSettings.communications.enabled=false;party={id:"party",tenantId:"tenant",status:"PENDING",depositAmount:100,depositStatus:"PENDING",title:"Test Child Party",startTime:new Date(Date.now()+10*86400000),confirmationExpiresAt:new Date(Date.now()+2*86400000),primaryParent:{email:"parent@example.invalid"}};process.env.PLAYFLOW_EMAIL_DELIVERY_MODE="live";process.env.VERCEL_ENV="production";delete process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS;process.env.RESEND_API_KEY="test-only-not-real";process.env.PLAYFLOW_EMAIL_FROM="PlayFlow <test@example.invalid>";process.env.PLAYFLOW_APP_URL="https://app.example.invalid";mock.method(globalThis,"fetch",async(input:any,init:any)=>{assert.equal(input,"https://api.resend.com/emails");sends.push({body:JSON.parse(init.body),key:init.headers["Idempotency-Key"]});if(transportError)throw new Error("simulated timeout");return Response.json({id:"provider-test-message"},{status:responseStatus,headers:{"retry-after":"120"}});});});
test("unpaid holds prepare draft previews without releasing host or guest secrets or sending email",async()=>{await preparePartyMessages(db,"tenant","party");assert.equal(messages.length,1);assert.equal(messages[0].status,"DRAFT");assert.match(messages[0].body,/not confirmed/);assert.ok(!messages[0].body.includes("private-host"));await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,0);});
test("confirmed paid signed parties get distinct host and guest links only in host-addressed messages",async()=>{party.status="CONFIRMED";party.depositStatus="CARD_COLLECTED";await preparePartyMessages(db,"tenant","party");await preparePartyMessages(db,"tenant","party");assert.equal(messages.length,2);assert.equal(messages[0].recipient,"parent@example.invalid");assert.match(messages[0].body,/Private host page \(keep this link private\)/);assert.match(messages[0].body,/Guest invitation link \(share this with guests\)/);assert.ok(messages[1].scheduledAt<party.startTime);});
test("a confirmed status alone cannot trigger emails without a deposit and agreement",async()=>{party.status="CONFIRMED";await preparePartyMessages(db,"tenant","party");assert.equal(messages.length,0);party.depositStatus="WAIVED";agreement=false;await preparePartyMessages(db,"tenant","party");assert.equal(messages.length,0);});
test("enabled queue delivery uses a stable provider key and sent retries do not send twice",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].status,"QUEUED");await deliverMessage(messages[0].id,"tenant");await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,1);assert.equal(sends[0].key,`playflow-message-${messages[0].id}`);assert.equal(messages[0].status,"SENT");assert.ok(messages[0].sentAt);});
test("cancelled or rescheduled bookings cancel obsolete messages instead of sending stale links",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");party.status="CANCELLED";await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"CANCELLED");assert.equal(sends.length,0);});
test("uncertain delivery outside provider deduplication window requires review and never auto-resends",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");messages[0].status="SENDING";messages[0].attemptedAt=new Date(Date.now()-24*3600000);messages[0].updatedAt=new Date(Date.now()-120000);await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"REVIEW");assert.equal(sends.length,0);});
test("message IDs cannot be used across businesses",async()=>{await preparePartyMessages(db,"tenant","party");await assert.rejects(deliverMessage(messages[0].id,"other-business"));assert.equal(sends.length,0);});

test("sender setup checks HTTPS and exposes only configured flags",()=>{assert.equal(senderReady(),true);assert.equal(emailSetup().providerKeyConfigured,true);assert.equal(JSON.stringify(emailSetup()).includes("test-only-not-real"),false);process.env.PLAYFLOW_APP_URL="http://unsafe.example.invalid";assert.equal(senderReady(),false);});
test("changed contact recipients and withdrawn confirmation prerequisites cancel queued private links",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");party.primaryParent.email="different@example.invalid";await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"CANCELLED");assert.equal(sends.length,0);messages=[];party.status="CONFIRMED";party.depositStatus="WAIVED";await preparePartyMessages(db,"tenant","party");agreement=false;await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].failureCode,"BOOKING_NOT_READY");assert.equal(sends.length,0);});
test("rate limits back off and retries preserve the sender snapshot, body and provider key",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");responseStatus=429;await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"QUEUED");assert.ok(messages[0].retryAt>Date.now());assert.equal(messages[0].attemptCount,1);await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,1);messages[0].retryAt=new Date(0);responseStatus=200;process.env.PLAYFLOW_EMAIL_FROM="Changed <changed@example.invalid>";await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"SENT");assert.deepEqual(sends[1],sends[0]);});
test("uncertain transport retries stay within one idempotent request and stop after the retry ceiling",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");transportError=true;await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"QUEUED");assert.equal(messages[0].failureCode,"DELIVERY_UNCERTAIN");messages[0].retryAt=new Date(0);transportError=false;await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"SENT");assert.deepEqual(sends[1],sends[0]);messages[0].status="QUEUED";messages[0].attemptCount=8;await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"REVIEW");assert.equal(sends.length,2);});
test("definitive authorization failure is not automatically retried and active leases cannot be stolen",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");messages[0].status="SENDING";messages[0].updatedAt=new Date();await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,0);messages[0].status="QUEUED";responseStatus=403;await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"FAILED");await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,1);});
test("processor bounds its batch, skips disabled businesses, and retries are scheduled with capped delays",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");await processMessages("tenant");assert.equal(lastCandidates.where.tenantId,"tenant");assert.equal(lastCandidates.where.tenant.operationalSettings.equals,true);assert.equal(lastCandidates.take,3);assert.ok(lastCandidates.where.AND[0].OR.some((c:any)=>c.retryAt?.lte instanceof Date));const now=new Date();assert.equal(retryTime(30,now,"99999").getTime()-now.getTime(),3600000);assert.ok(retryTime(0,now,"bad").getTime()>now.getTime());});
test("re-preparing a reminder updates its unattempted schedule without queueing drafts",async()=>{party.status="CONFIRMED";party.depositStatus="WAIVED";await preparePartyMessages(db,"tenant","party");const original=messages.find(m=>m.kind==="REMINDER"),oldTime=original.scheduledAt;tenant.operationalSettings.communications.reminderHours=24;await preparePartyMessages(db,"tenant","party");assert.ok(original.scheduledAt>oldTime);assert.equal(original.status,"DRAFT");tenant.operationalSettings.communications.reminderHours=48;});

test("missing delivery mode blocks new and previously queued messages without consuming attempts",async()=>{
 tenant.operationalSettings.communications.enabled=true;
 await preparePartyMessages(db,"tenant","party");
 assert.equal(messages[0].status,"QUEUED");
 delete process.env.PLAYFLOW_EMAIL_DELIVERY_MODE;
 await deliverMessage(messages[0].id,"tenant");
 assert.equal(sends.length,0);assert.equal(messages[0].attemptedAt,null);
 assert.equal(await processMessages("tenant"),0);assert.equal(lastCandidates,null);
 messages=[];await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].status,"DRAFT");
});
test("preview delivery stays restricted even if live mode is accidentally configured",async()=>{
 tenant.operationalSettings.communications.enabled=true;process.env.VERCEL_ENV="preview";
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="  PARENT@EXAMPLE.INVALID  ";
 await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].status,"QUEUED");
 await processMessages("tenant");assert.deepEqual(lastCandidates.where.recipient.in,["parent@example.invalid"]);
 assert.equal(sends.length,1);assert.deepEqual(sends[0].body.to,["parent@example.invalid"]);
});
test("removing approval blocks an uncertain retry and does not redirect private host messages",async()=>{
 tenant.operationalSettings.communications.enabled=true;process.env.PLAYFLOW_EMAIL_DELIVERY_MODE="test";
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="parent@example.invalid";
 await preparePartyMessages(db,"tenant","party");transportError=true;await deliverMessage(messages[0].id,"tenant");
 messages[0].retryAt=new Date(0);process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="different@example.invalid";
 await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,1);assert.equal(messages[0].attemptCount,1);
 assert.deepEqual(sends[0].body.to,["parent@example.invalid"]);
});
test("HTML, logo attachments and text remain identical when branding changes during an uncertain retry",async()=>{
 tenant.operationalSettings.communications.enabled=true;tenant.logoUrl="data:image/png;base64,aGVsbG8=";tenant.primaryColor="#374151";
 await preparePartyMessages(db,"tenant","party");responseStatus=429;await deliverMessage(messages[0].id,"tenant");
 assert.ok(sends[0].body.html);assert.equal(sends[0].body.attachments[0].content,"aGVsbG8=");
 tenant.primaryColor="#FFFFFF";tenant.logoUrl=null;messages[0].retryAt=new Date(0);responseStatus=200;
 await preparePartyMessages(db,"tenant","party");await deliverMessage(messages[0].id,"tenant");assert.deepEqual(sends[1],sends[0]);tenant.primaryColor=null;
});
test("preparing old drafts upgrades their design but never rewrites attempted legacy payloads",async()=>{
 await preparePartyMessages(db,"tenant","party");messages[0].presentation=null;messages[0].body="Legacy draft";
 await preparePartyMessages(db,"tenant","party");assert.ok(messages[0].presentation.html);assert.notEqual(messages[0].body,"Legacy draft");
 messages[0].presentation=null;messages[0].body="Attempted legacy message";messages[0].attemptedAt=new Date();
 await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].presentation,null);assert.equal(messages[0].body,"Attempted legacy message");
 tenant.operationalSettings.communications.enabled=true;messages[0].status="QUEUED";await deliverMessage(messages[0].id,"tenant");assert.ok(!("html" in sends[0].body));
});

test("a concurrent draft upgrade cannot change the payload between read and delivery claim",async()=>{tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");changeBeforeClaim=true;await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,0);assert.equal(messages[0].attemptedAt,null);});

test("new emails use the business wording and an already prepared message keeps its original copy",async()=>{tenant.operationalSettings.communications.enabled=true;tenant.operationalSettings.communications.templates={HOLD:{subject:"Custom booking hold",introduction:"Bring your celebration to our venue.",closing:"Thank you from our team."}};await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].subject,"Test Venue: Custom booking hold");assert.match(messages[0].body,/Thank you from our team/);assert.match(messages[0].presentation.html,/Bring your celebration to our venue/);const snapshot=structuredClone(messages[0]);tenant.operationalSettings.communications.templates.HOLD.introduction="Different wording";await preparePartyMessages(db,"tenant","party");assert.deepEqual(messages[0],snapshot);});
test("verified business replies and correlation tags stay frozen across an uncertain retry",async()=>{
 tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");transportError=true;await deliverMessage(messages[0].id,"tenant");assert.equal(sends[0].body.reply_to,"business@example.invalid");assert.deepEqual(sends[0].body.tags,[{name:"playflow_message",value:messages[0].id},{name:"playflow_tenant",value:"tenant"}]);
 inbox={replyTo:"changed@example.invalid",verifiedAt:new Date()};messages[0].retryAt=new Date(0);transportError=false;await deliverMessage(messages[0].id,"tenant");assert.deepEqual(sends[1],sends[0]);
});
test("new live attempts wait for a verified reply inbox while approved preview testing remains available",async()=>{
 tenant.operationalSettings.communications.enabled=true;inbox=null;await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].status,"DRAFT");messages[0].status="QUEUED";await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,0);assert.equal(messages[0].attemptedAt,null);
 process.env.VERCEL_ENV="preview";process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="parent@example.invalid";await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,1);assert.ok(!("reply_to" in sends[0].body));
});
test("legacy uncertain requests retain their original payload without new tags or a reply header",async()=>{
 tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");messages[0].attemptedAt=new Date();messages[0].transportVersion=0;messages[0].senderFrom=process.env.PLAYFLOW_EMAIL_FROM;messages[0].replyTo=null;
 await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,1);assert.ok(!("reply_to" in sends[0].body));assert.ok(!("tags" in sends[0].body));
});
test("bounced and complained recipients cannot be sent another queued booking email",async()=>{
 tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");suppression={reason:"BOUNCED"};await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"CANCELLED");assert.equal(messages[0].failureCode,"RECIPIENT_SUPPRESSED");assert.equal(sends.length,0);assert.equal(messages[0].attemptedAt,null);
 messages=[];await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].status,"DRAFT");
});
test("expired holds and changed start times cancel pending delivery without sending private links",async()=>{
 tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");party.confirmationExpiresAt=new Date(0);await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"CANCELLED");assert.equal(sends.length,0);
 messages=[];party.status="CONFIRMED";party.depositStatus="WAIVED";await preparePartyMessages(db,"tenant","party");party.startTime=new Date(party.startTime.getTime()+3600000);await deliverMessage(messages[0].id,"tenant");assert.equal(messages[0].status,"CANCELLED");assert.equal(sends.length,0);
});

test("saved parents queue and deliver automatically in database test mode without per-address approval",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";process.env.VERCEL_ENV="preview";savedContact=true;tenant.operationalSettings.communications.enabled=true;
 await preparePartyMessages(db,"tenant","party");assert.equal(messages[0].status,"QUEUED");await processMessages("tenant");assert.ok(lastSavedQueue);assert.equal(sends.length,1);assert.deepEqual(sends[0].body.to,["parent@example.invalid"]);
});
test("database eligibility is rechecked on delivery and never bypasses a bounce suppression",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";process.env.VERCEL_ENV="preview";savedContact=true;tenant.operationalSettings.communications.enabled=true;await preparePartyMessages(db,"tenant","party");
 savedContact=false;await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,0);assert.equal(messages[0].attemptedAt,null);
 savedContact=true;suppression={reason:"BOUNCED"};await deliverMessage(messages[0].id,"tenant");assert.equal(sends.length,0);assert.equal(messages[0].failureCode,"RECIPIENT_SUPPRESSED");
});
