import assert from "node:assert/strict";
import {test,mock,beforeEach} from "node:test";
import {legalForm,FORM_VERSION} from "../src/lib/waivers/forms";
import {validateSigning,saveSignedForm,FormError} from "../src/lib/waivers/signing";
import type {Prisma} from "../src/generated/prisma/client";
const signing=(extra:object={})=>({version:FORM_VERSION,signerName:"Test Parent",signerEmail:"test@example.invalid",signature:"Test Parent",signatureConsent:true,requestId:"request-test-123456789",acknowledgments:legalForm("LIABILITY").clauses.map(c=>c[0]),photoConsent:false,...extra});
test("signatures require current wording, every acknowledgment and an explicit electronic signature",()=>{
 assert.equal(validateSigning(signing(),"LIABILITY").photoConsent,false);
 for(const change of [{version:"old"},{acknowledgments:[]},{signature:"Someone Else"},{signatureConsent:false},{signerEmail:"not-email"}])assert.throws(()=>validateSigning(signing(change),"LIABILITY"),FormError);
 assert.equal(validateSigning(signing({photoConsent:true}),"LIABILITY").photoConsent,true);
});
test("each covered child gets a separate signed snapshot linked to the same signed document",async()=>{
 let captured:Record<string,unknown>={};
 const db={waiver:{create:async({data}:{data:Record<string,unknown>})=>{captured=data;return{id:"waiver",...data,children:[]};}}} as unknown as Prisma.TransactionClient;
 const children=[{id:"child-a",firstName:"First",lastName:"Child",dateOfBirth:new Date("2020-01-01")},{id:"child-b",firstName:"Second",lastName:"Child",dateOfBirth:null}];
 await saveSignedForm(db,{tenantId:"tenant",familyId:"family",parentId:"parent",kind:"LIABILITY",signing:validateSigning(signing(),"LIABILITY"),validityDays:null,children});
 const coverage=(captured.children as {create:{childId:string;signedAt:Date;childNameSnapshot:string}[]}).create;
 assert.equal(coverage.length,2);assert.deepEqual(coverage.map(c=>c.childId),["child-a","child-b"]);assert.ok(coverage.every(c=>c.signedAt instanceof Date));
 assert.equal(captured.expiresAt,null);assert.equal(captured.version,FORM_VERSION);assert.equal(captured.photoConsent,false);
 const snapshot=JSON.parse(captured.waiverText as string);assert.ok(snapshot.clauses[0][2].includes("gross negligence or willful misconduct"));assert.equal(snapshot.children[1].name,"Second Child");assert.ok((captured.acknowledgments as {identityMethod:string}).identityMethod==="VERIFIED_ACCOUNT");
});
let identity:{id:string;email:string;emailVerified:boolean}|null;
let ownParent:Record<string,unknown>|null;
let ownBooking:Record<string,any>|null=null;
let linkWrites=0;
let relinkedGuest:Record<string,any>|null=null;
let claimTarget:Record<string,unknown>|null=null;
let emailCollision=false,created=0,queryCount=0;
let lastChildWhere:Record<string,unknown>={};
const tenant={id:"tenant",slug:"palmetto-playhouse",name:"Palmetto",timezone:"America/New_York",waiverValidityDays:null};
const child={id:"child",tenantId:"tenant",familyId:"family",firstName:"Test",lastName:"Child",dateOfBirth:null,active:true};
const db={
 tenant:{findUnique:async({where}:{where:{slug:string}})=>{queryCount++;return where.slug===tenant.slug?tenant:null;}},
 parent:{update:async({data}:{data:Record<string,unknown>})=>{ownParent={...claimTarget,...data};return ownParent;},findFirst:async({where}:{where:Record<string,unknown>})=>{queryCount++;if(where.familyClaimHash)return claimTarget;if(where.email)return emailCollision?{id:"unclaimed"}:null;return where.authUserId==="user"&&where.tenantId==="tenant"?ownParent:null;}},
 child:{findMany:async({where}:{where:Record<string,unknown>})=>{lastChildWhere=where;const ids=(where.id as {in?:string[]}|undefined)?.in;return where.tenantId==="tenant"&&where.familyId==="family"&&(!ids||ids.includes("child"))?[child]:[];},create:async({data}:{data:Record<string,unknown>})=>{created++;return{id:"new-child",...data};}},
 party:{findMany:async()=>ownBooking?[ownBooking]:[],findFirst:async({where}:{where:Record<string,unknown>})=>ownBooking&&where.id===ownBooking.id&&where.tenantId===ownBooking.tenantId&&where.familyId===ownBooking.familyId&&where.primaryParentId===ownBooking.primaryParentId?ownBooking:null,update:async({data}:{data:Record<string,unknown>})=>{linkWrites++;Object.assign(ownBooking!,data);return ownBooking;}},
 partyGuest:{updateMany:async(query:Record<string,any>)=>{relinkedGuest=query;return{count:1};}},
 eventTimelineItem:{create:async()=>({})},
 waiver:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>{created++;return{id:"waiver",...data,children:((data.children as {create:{childId:string;signedAt:Date}[]}).create).map((coverage,index)=>({id:`coverage-${index}`,...coverage}))};}},
 family:{create:async()=>{created++;return{id:"new-family"};}},
 employee:{findUnique:async()=>null,findMany:async()=>[]},
 $queryRaw:async()=>[],
 $transaction:async(callback:(tx:unknown)=>Promise<unknown>)=>callback(db),
};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:identity?{user:identity}:null,error:null})})}});
const {GET,POST}=await import("../src/app/api/parent/[slug]/route");
const {requireStaff}=await import("../src/lib/auth/staff");
const context={params:Promise.resolve({slug:tenant.slug})};
const request=(body?:object)=>new Request("http://localhost/api/parent/palmetto-playhouse",{method:body?"POST":"GET",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{identity={id:"user",email:"test@example.invalid",emailVerified:true};ownParent={id:"parent",tenantId:"tenant",familyId:"family",firstName:"Test",lastName:"Parent",email:identity.email,family:{status:"ACTIVE"}};claimTarget=null;ownBooking=null;linkWrites=0;relinkedGuest=null;emailCollision=false;created=0;queryCount=0;lastChildWhere={};});
test("parent API denies signed-out and unverified identities before database access",async()=>{
 identity=null;assert.equal((await GET(request(),context)).status,401);assert.equal(queryCount,0);
 identity={id:"user",email:"test@example.invalid",emailVerified:false};assert.equal((await GET(request(),context)).status,403);assert.equal(queryCount,0);
});
test("verified parents see only the family linked to their account and never receive staff access",async()=>{
 assert.equal((await GET(request(),context)).status,200);assert.equal(lastChildWhere.tenantId,"tenant");assert.equal(lastChildWhere.familyId,"family");
 await assert.rejects(requireStaff(),{code:"STAFF_ACCESS_REQUIRED"});
});
test("email alone cannot claim an existing family during onboarding",async()=>{
 ownParent=null;emailCollision=true;
 const response=await POST(request({action:"setup",firstName:"Test",lastName:"Parent",phone:"8035550100"}),context);
 assert.equal(response.status,409);assert.equal(created,0);
});
test("a parent cannot sign for a child in another family",async()=>{
 const response=await POST(request({action:"waiver",childIds:["foreign-child"],signing:signing()}),context);
 assert.equal(response.status,403);assert.equal(created,0);
});
test("waiver submission uses verified account identity and explicit own-child IDs",async()=>{
 const response=await POST(request({action:"waiver",familyId:"foreign-family",childIds:["child"],signing:signing()}),context);
 assert.equal(response.status,200);assert.equal(lastChildWhere.familyId,"family");assert.equal(created,1);
});
test("rental agreements cannot be attached to another parent's booking",async()=>{
 const response=await POST(request({action:"agreement",partyId:"foreign-party",signing:signing({acknowledgments:legalForm("RENTAL").clauses.map(c=>c[0])})}),context);
 assert.equal(response.status,404);assert.equal(created,0);
});
test("cross-site parent mutations are rejected",async()=>{
 const response=await POST(new Request("http://localhost/api/parent/palmetto-playhouse",{method:"POST",headers:{Origin:"https://other.invalid","Content-Type":"application/json"},body:JSON.stringify({action:"setup"})}),context);assert.equal(response.status,403);assert.equal(queryCount,0);
});

test("family links require the target verified email, expire, and cannot be used twice",async()=>{
 ownParent=null;
 claimTarget={id:"existing-parent",email:"other@example.invalid",authUserId:null,familyId:"family",family:{status:"ACTIVE"},familyClaimExpiresAt:new Date(Date.now()+60000)};
 const body={action:"claim",token:"a".repeat(43)};
 assert.equal((await POST(request(body),context)).status,403);
 claimTarget.email="test@example.invalid";claimTarget.familyClaimExpiresAt=new Date("2020-01-01");
 assert.equal((await POST(request(body),context)).status,410);
 claimTarget.familyClaimExpiresAt=new Date(Date.now()+60000);
 assert.equal((await POST(request(body),context)).status,200);
 assert.equal((ownParent as Record<string,unknown>|null)?.authUserId,"user");assert.equal((ownParent as Record<string,unknown>|null)?.familyClaimHash,null);
 assert.equal((await POST(request(body),context)).status,409);
});

test("parent portal repairs only its own confirmed booking links and does not expose links while pending",async()=>{
 ownBooking={id:"own-party",tenantId:"tenant",familyId:"family",primaryParentId:"parent",status:"PENDING",hostToken:null,inviteToken:null,inviteUrl:null};
 const requestBody={action:"party-links",partyId:"own-party"};
 assert.equal((await POST(request(requestBody),context)).status,409);assert.equal(linkWrites,0);
 assert.equal((await POST(request({...requestBody,partyId:"foreign-party"}),context)).status,404);
 ownBooking.status="CONFIRMED";
 const response=await POST(request(requestBody),context);assert.equal(response.status,200);const result=await response.json();assert.ok(result.links.hostUrl.endsWith("/host"));assert.notEqual(result.links.hostUrl,result.links.guestUrl);assert.equal(linkWrites,1);
 const portal=await (await GET(request(),context)).json();assert.ok(portal.bookings[0].links.hostUrl);assert.equal(portal.bookings[0].hostToken,undefined);assert.equal(portal.bookings[0].inviteToken,undefined);
 ownBooking.status="PENDING";const pending=await (await GET(request(),context)).json();assert.equal(pending.bookings[0].links,null);
 ownBooking.status="CANCELLED";assert.equal((await POST(request(requestBody),context)).status,409);
});

test("replacement parent signatures attach new child coverage only to upcoming expected attendance",async()=>{
 const response=await POST(request({action:"waiver",childIds:["child"],signing:signing()}),context);assert.equal(response.status,200);
 const link=relinkedGuest as Record<string,any>|null;assert.ok(link);assert.equal(link.where.tenantId,"tenant");assert.equal(link.where.childId,"child");assert.equal(link.where.status,"EXPECTED");assert.equal(link.where.rsvpStatus.not,"DECLINED");assert.ok(link.where.party.endTime.gt instanceof Date);assert.equal(link.data.waiverChildId,"coverage-0");assert.equal(link.data.waiverStatus,"SIGNED");
});
