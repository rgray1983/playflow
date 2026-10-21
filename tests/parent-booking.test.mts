import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
import {FORM_VERSION,legalForm} from "../src/lib/waivers/forms";

let identity:any, parent:any, coverage:any, parties:any[], documents:any[], guests:any[], addOnItems:any[], timelines:any[];
let lockCalls=0, failTimeline=false;
const tenant={id:"tenant",slug:"palmetto-playhouse",name:"Palmetto",timezone:"America/New_York",bookingSettings:{startTimes:["12:00"],daysOfWeek:[1,2,3,4,5,6,7],setupMinutes:30,bufferMinutes:0},waiverValidityDays:null};
const pkg={id:"package",tenantId:"tenant",eventTypeId:"type",name:"Party",price:300,depositAmount:100,durationMinutes:120,active:true};
const child={id:"child",tenantId:"tenant",familyId:"family",firstName:"Test",lastName:"Child",dateOfBirth:null,active:true};
const db:any={
 tenant:{findUnique:async()=>tenant,findUniqueOrThrow:async()=>tenant},
 parent:{findFirst:async({where}:any)=>where.authUserId==="user"&&where.tenantId==="tenant"?parent:null},
 child:{findFirst:async({where}:any)=>where.id==="child"&&where.familyId==="family"&&where.tenantId==="tenant"?child:null},
 waiverChild:{findFirst:async({where}:any)=>{assert.equal(where.waiver.tenantId,"tenant");assert.equal(where.waiver.familyId,"family");assert.equal(where.waiver.kind,"LIABILITY");return coverage;}},
 eventType:{findFirst:async({where}:any)=>where.id==="type"&&where.tenantId==="tenant"?{id:"type"}:null,findMany:async()=>[{id:"type",name:"Party"}]},
 package:{findFirst:async({where}:any)=>where.id==="package"&&where.tenantId==="tenant"?pkg:null,findMany:async()=>[pkg]},
 partyAddOn:{findMany:async({where}:any)=>where.id?.in?.includes("addon")?[{id:"addon",name:"Extra",price:25,durationMinutes:0}]:[]},
 commerceSettings:{findUnique:async()=>({depositRules:{enabled:true,requiredByDefault:true}})},
 party:{
  findUniqueOrThrow:async({where}:any)=>parties.find(p=>p.id===where.id&&p.tenantId===where.tenantId),
  findFirst:async({where}:any)=>where.bookingRequestId?parties.find(p=>p.bookingRequestId===where.bookingRequestId):parties.find(p=>p.id===where.id&&p.tenantId===where.tenantId&&p.primaryParentId===where.primaryParentId&&p.familyId===where.familyId),
  findMany:async()=>parties,
  count:async()=>parties.filter(p=>p.status==="PENDING"&&p.primaryParentId==="parent"&&p.confirmationExpiresAt>new Date()).length,
  create:async({data}:any)=>{const row={id:`party-${parties.length}`,payments:[],...data};parties.push(row);return row;},
  update:async({where,data}:any)=>{const p=parties.find(p=>p.id===where.id);Object.assign(p,data);return p;},
 },
 waiver:{findFirst:async({where}:any)=>documents.find(d=>d.requestId===where.requestId),create:async({data}:any)=>{const row={id:`waiver-${documents.length}`,...data};documents.push(row);return row;}},
 partyGuest:{create:async({data}:any)=>{guests.push(data);return data;}},
 partyAddOnItem:{create:async({data}:any)=>{addOnItems.push(data);return data;}},
 eventTimelineItem:{create:async({data}:any)=>{if(failTimeline)throw new Error("simulated persistence failure");timelines.push(data);return data;}},
 $queryRaw:async()=>{lockCalls++;return[];},
};
let queue=Promise.resolve();
db.$transaction=async(callback:any)=>{const previous=queue;let release!:()=>void;queue=new Promise<void>(r=>release=r);await previous;const snapshot=[parties,documents,guests,addOnItems,timelines].map(rows=>rows.slice());try{return await callback(db);}catch(error){[parties,documents,guests,addOnItems,timelines]=snapshot;throw error;}finally{release();}};
mock.module("../src/lib/communications/service.ts",{namedExports:{preparePartyMessages:async()=>{}}});
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:identity?{user:identity}:null,error:null})})}});
const {GET,POST}=await import("../src/app/api/parent/[slug]/bookings/route");
const ctx={params:Promise.resolve({slug:"palmetto-playhouse"})};
const request=(body?:any,query="")=>new Request(`http://localhost/api/parent/palmetto-playhouse/bookings${query}`,{method:body?"POST":"GET",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
const signature=(extra:any={})=>({version:FORM_VERSION,signerName:"Test Parent",signerEmail:"test@example.invalid",signature:"Test Parent",signatureConsent:true,requestId:"signature-request-123456",acknowledgments:legalForm("RENTAL").clauses.map(c=>c[0]),photoConsent:false,...extra});
async function body(extra:any={}){const response=await GET(request(undefined,"?eventTypeId=type&packageId=package&date=2030-01-12&addOnId=addon"),ctx);assert.equal(response.status,200);const available=await response.json();return {requestId:"booking-request-123456",childId:"child",eventTypeId:"type",packageId:"package",eventDate:"2030-01-12",startTime:"12:00",addOnIds:["addon"],quoteToken:available.quoteToken,signing:signature(),...extra};}
beforeEach(()=>{identity={id:"user",email:"test@example.invalid",emailVerified:true};parent={id:"parent",tenantId:"tenant",authUserId:"user",familyId:"family",firstName:"Test",lastName:"Parent",phone:"8035550100",family:{status:"ACTIVE"}};coverage={id:"coverage",signedAt:new Date()};parties=[];documents=[];guests=[];addOnItems=[];timelines=[];lockCalls=0;failTimeline=false;});
test("parent booking APIs require a verified, linked family and reject cross-site writes",async()=>{
 identity=null;assert.equal((await GET(request(),ctx)).status,401);
 identity={id:"user",email:"test@example.invalid",emailVerified:false};assert.equal((await GET(request(),ctx)).status,403);
 identity.emailVerified=true;parent=null;assert.equal((await GET(request(),ctx)).status,403);
 const cross=new Request("http://localhost/api/parent/palmetto-playhouse/bookings",{method:"POST",headers:{Origin:"https://other.invalid","Content-Type":"application/json"},body:"{}"});assert.equal((await POST(cross,ctx)).status,403);assert.equal(parties.length,0);
});
test("booking uses saved family and server quote, attaches rental and child coverage, and stays unpaid",async()=>{
 const input=await body({familyId:"foreign-family",parentId:"foreign-parent",depositStatus:"PAID",total:1});
 const response=await POST(request(input),ctx);assert.equal(response.status,200);const result=(await response.json()).booking;
 assert.equal(result.status,"PENDING");assert.equal(result.checkoutAvailable,undefined);assert.equal(result.balanceDue,325);
 const p=parties[0];assert.equal(p.familyId,"family");assert.equal(p.primaryParentId,"parent");assert.equal(p.workflowStep,"AWAITING_DEPOSIT");assert.equal(p.depositStatus,"PENDING");assert.equal(Number(p.depositAmount),100);assert.equal(p.confirmedAt,undefined);assert.equal(p.inviteToken,undefined);assert.equal(p.confirmationToken,undefined);
 assert.equal(p.setupStartsAt.toISOString(),"2030-01-12T16:30:00.000Z");assert.ok(p.confirmationExpiresAt>Date.now());
 assert.equal(documents.length,1);assert.equal(documents[0].partyId,p.id);assert.equal(documents[0].kind,"RENTAL");const snapshot=JSON.parse(documents[0].waiverText).event;assert.equal(snapshot.total,325);assert.equal(snapshot.childId,"child");
 assert.equal(guests[0].waiverChildId,"coverage");assert.equal(guests[0].childId,"child");assert.equal(addOnItems.length,1);assert.equal(lockCalls,1);
});
test("same booking retry saves once, changed request fails, and concurrent attempts cannot double-book",async()=>{
 const input=await body();const [a,b]=await Promise.all([POST(request(input),ctx),POST(request(input),ctx)]);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(parties.length,1);assert.equal(documents.length,1);
 assert.equal((await POST(request({...input,notes:"changed"}),ctx)).status,409);
 assert.equal((await POST(request({...input,requestId:"other-booking-request-123",signing:signature({requestId:"other-signature-request-123"})}),ctx)).status,409);assert.equal(parties.length,1);
});
test("foreign child, missing liability coverage, wrong signer, stale quote, and inactive catalog cannot reserve",async()=>{
 const input=await body();assert.equal((await POST(request({...input,childId:"foreign-child"}),ctx)).status,403);
 coverage=null;assert.equal((await POST(request(input),ctx)).status,409);coverage={id:"coverage",signedAt:new Date()};
 assert.equal((await POST(request({...input,signing:signature({signerName:"Another Parent",signature:"Another Parent"})}),ctx)).status,403);
 assert.equal((await POST(request({...input,quoteToken:"stale"}),ctx)).status,409);
 assert.equal((await POST(request({...input,packageId:"foreign-package"}),ctx)).status,400);assert.equal(parties.length,0);assert.equal(documents.length,0);
});
test("failed persistence rolls back reservation, agreement, guest and add-ons together",async()=>{
 const input=await body();failTimeline=true;assert.equal((await POST(request(input),ctx)).status,500);assert.equal(parties.length,0);assert.equal(documents.length,0);assert.equal(guests.length,0);assert.equal(addOnItems.length,0);
});
test("parents can release their own unpaid hold but cannot cancel another family or paid reservation",async()=>{
 const input=await body();await POST(request(input),ctx);const p=parties[0];
 assert.equal((await POST(request({action:"cancel",partyId:"foreign-party"}),ctx)).status,404);
 p.payments=[{id:"payment"}];assert.equal((await POST(request({action:"cancel",partyId:p.id}),ctx)).status,409);p.payments=[];
 assert.equal((await POST(request({action:"cancel",partyId:p.id}),ctx)).status,200);assert.equal(p.status,"CANCELLED");
});
test("two active holds limit reservations, while expired holds do not reserve a time",async()=>{
 const input=await body();
 parties=[0,1].map(i=>({id:`old-${i}`,tenantId:"tenant",primaryParentId:"parent",familyId:"family",bookingRequestId:`old-request-${i}`,status:"PENDING",confirmationExpiresAt:new Date(Date.now()+60000)}));
 assert.equal((await POST(request(input),ctx)).status,409);
 parties.forEach(p=>p.confirmationExpiresAt=new Date("2020-01-01"));
 assert.equal((await POST(request(input),ctx)).status,200);assert.equal(parties.length,3);
});
test("agreement acknowledgments and unique add-ons are mandatory before any reservation",async()=>{
 const input=await body();
 assert.equal((await POST(request({...input,signing:signature({acknowledgments:[]})}),ctx)).status,400);
 assert.equal((await POST(request({...input,addOnIds:["addon","addon"]}),ctx)).status,400);
 assert.equal(parties.length,0);assert.equal(documents.length,0);
});
