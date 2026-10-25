import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
import {childFields,profileFields} from "../src/lib/parent/profile";
import {printableDocument,type SavedDocument} from "../src/lib/parent/documents";

let user:any,parent:any,child:any,coverage:any,documents:any[],visit:any,membership:any,partyGuest:any;
let writes=0,reads=0,coverageUpdates=0,failCoverage=false,lastQuery:any;
const tenant={id:"tenant",slug:"palmetto-playhouse",name:"Palmetto",timezone:"America/New_York",waiverValidityDays:null};
const documentAllowed=(row:any,where:any)=>row.tenantId===where.tenantId&&row.familyId===where.familyId&&row.signedAt&&(row.kind==="LIABILITY"||(row.kind==="RENTAL"&&row.party?.primaryParentId===parent?.id));
const db:any={
 familyChange:{create:async({data}:any)=>({id:"parent-change",...data})},
 tenant:{findUnique:async()=>{reads++;return tenant;}},
 parent:{findFirst:async({where}:any)=>{reads++;return where.tenantId==="tenant"&&where.authUserId==="user"?parent:null;},update:async({where,data}:any)=>{assert.equal(where.id,parent.id);assert.equal(where.tenantId,"tenant");assert.equal(where.familyId,"family");writes++;Object.assign(parent,data,{updatedAt:new Date(parent.updatedAt.getTime()+1)});return parent;}},
 child:{findFirst:async({where}:any)=>where.id===child.id&&where.tenantId==="tenant"&&where.familyId==="family"?child:null,findMany:async(query:any)=>{lastQuery=query;return query.where.tenantId==="tenant"&&query.where.familyId==="family"&&query.where.active===child.active?[{...child,waivers:coverage.status==="VALID"?[{id:"coverage",signedAt:new Date(),waiver:{id:"doc",expiresAt:null,version:"original",photoConsent:false}}]:[]}]:[];},update:async({where,data}:any)=>{assert.equal(where.id,"child");assert.equal(where.tenantId,"tenant");assert.equal(where.familyId,"family");writes++;Object.assign(child,data,{updatedAt:new Date(child.updatedAt.getTime()+1)});return child;},create:async()=>{writes++;return{id:"created"};}},
 waiverChild:{updateMany:async({where,data}:any)=>{assert.equal(where.childId,"child");assert.equal(where.waiver.tenantId,"tenant");assert.equal(where.waiver.familyId,"family");assert.equal(where.waiver.kind,"LIABILITY");if(failCoverage)throw new Error("simulated coverage update failure");coverageUpdates++;Object.assign(coverage,data);return{count:1};}},
 waiver:{findMany:async(query:any)=>{lastQuery=query;return documents.filter(row=>documentAllowed(row,query.where));},findFirst:async(query:any)=>{lastQuery=query;return documents.find(row=>row.id===query.where.id&&documentAllowed(row,query.where))??null;}},
 visit:{findFirst:async(query:any)=>{lastQuery=query;return visit;},findMany:async(query:any)=>{lastQuery=query;return[];}},
 membership:{findFirst:async(query:any)=>{lastQuery=query;return membership;},findMany:async(query:any)=>{lastQuery=query;return[];}},
 partyGuest:{findFirst:async(query:any)=>{lastQuery=query;return partyGuest;},updateMany:async({where,data}:any)=>{assert.equal(where.tenantId,"tenant");assert.equal(where.childId,"child");assert.equal(where.status,"EXPECTED");if(partyGuest)Object.assign(partyGuest,data);return{count:partyGuest?1:0};}},
 counterSale:{findMany:async(query:any)=>{lastQuery=query;return[];},findFirst:async(query:any)=>{lastQuery=query;return query.where.id==="own-receipt"&&query.where.tenantId==="tenant"&&query.where.familyId==="family"?{id:"own-receipt",status:"PAID",payments:[]}:null;}},
 eventPayment:{findMany:async(query:any)=>{lastQuery=query;return[];}},
 party:{findMany:async()=>[]},
 $queryRaw:async()=>[],
 $transaction:async(callback:any)=>{const saved=structuredClone({parent,child,coverage,documents});try{return await callback(db);}catch(error){({parent,child,coverage,documents}=saved);throw error;}},
};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:user?{user}:null,error:null})})}});
const {POST,GET}=await import("../src/app/api/parent/[slug]/route");
const {GET:history}=await import("../src/app/api/parent/[slug]/history/route");
const context={params:Promise.resolve({slug:"palmetto-playhouse"})};
const request=(body?:any,query="")=>new Request(`http://localhost/api/parent/palmetto-playhouse/history${query}`,{method:body?"POST":"GET",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
const childUpdate=(extra:any={})=>({action:"child-update",childId:child.id,updatedAt:child.updatedAt.toISOString(),firstName:child.firstName,lastName:child.lastName,dateOfBirth:"2020-01-01",allergies:child.allergies,medicalNotes:child.medicalNotes,...extra});
beforeEach(()=>{
 user={id:"user",email:"parent@example.invalid",emailVerified:true};parent={id:"parent",tenantId:"tenant",authUserId:"user",familyId:"family",firstName:"Test",lastName:"Parent",phone:"8035550100",email:user.email,notes:"staff-only",updatedAt:new Date("2026-01-01"),family:{status:"ACTIVE"}};
 child={id:"child",tenantId:"tenant",familyId:"family",firstName:"First",lastName:"Child",active:true,dateOfBirth:new Date("2020-01-01"),allergies:null,medicalNotes:null,updatedAt:new Date("2026-01-01")};coverage={status:"VALID"};
 documents=[{id:"doc",tenantId:"tenant",familyId:"family",kind:"LIABILITY",signedAt:new Date("2026-01-01"),waiverText:'{"clauses":[["one","Original","Historic wording"]]}',signature:"Original Parent",children:[]},{id:"foreign",tenantId:"other-tenant",familyId:"other-family",kind:"LIABILITY",signedAt:new Date(),waiverText:"private"},{id:"other-parent-rental",tenantId:"tenant",familyId:"family",kind:"RENTAL",signedAt:new Date(),party:{primaryParentId:"another-parent"}}];
 visit=null;membership=null;partyGuest=null;writes=0;reads=0;coverageUpdates=0;failCoverage=false;lastQuery=null;
});
test("profile edits update only the linked parent and preserve authentication, staff notes and signed records",async()=>{
 const original=documents[0].waiverText;
 const body={action:"profile",updatedAt:parent.updatedAt.toISOString(),firstName:"Updated",lastName:"Parent",phone:"(803) 555-0101",emergencyContact:"Emergency Person",emergencyPhone:"8035550102",authUserId:"attacker",familyId:"another-family",email:"other@example.invalid",notes:"overwrite",accessRole:"OWNER"};
 assert.equal((await POST(request(body),context)).status,200);assert.equal(parent.firstName,"Updated");assert.equal(parent.authUserId,"user");assert.equal(parent.familyId,"family");assert.equal(parent.email,user.email);assert.equal(parent.notes,"staff-only");assert.equal(parent.emergencyPhone,"8035550102");assert.equal(documents[0].waiverText,original);
 assert.equal((await POST(request({...body,firstName:"Stale"}),context)).status,409);assert.equal(parent.firstName,"Updated");assert.equal(writes,1);
});
test("contact and child validation reject invalid phones, false dates and non-text notes",()=>{
 for(const phone of ["123","abc8035550100","!!!!!!!!"]){assert.throws(()=>profileFields({firstName:"A",lastName:"B",phone}));}
 for(const change of [{dateOfBirth:"2025-02-30"},{dateOfBirth:"2099-01-01"},{allergies:42},{medicalNotes:{bad:true}}])assert.throws(()=>childFields({firstName:"A",lastName:"B",...change}));
 assert.equal(childFields({firstName:"A",lastName:"B",dateOfBirth:"2024-02-29"}).dateOfBirth?.toISOString(),"2024-02-29T00:00:00.000Z");
});
test("child edits enforce ownership; notes preserve coverage, identity changes require a new waiver",async()=>{
 assert.equal((await POST(request(childUpdate({childId:"foreign-child"})),context)).status,404);assert.equal(writes,0);
 assert.equal((await POST(request(childUpdate({allergies:"Peanuts",medicalNotes:"Needs quiet breaks"})),context)).status,200);assert.equal(coverageUpdates,0);assert.equal(coverage.status,"VALID");
 partyGuest={waiverStatus:"SIGNED"};const original=documents[0].waiverText;const response=await POST(request(childUpdate({firstName:"Corrected",familyId:"foreign-family"})),context);assert.equal(response.status,200);assert.equal((await response.json()).needsNewWaiver,true);assert.equal(coverage.status,"REVOKED");assert.equal(coverageUpdates,1);assert.equal(partyGuest.waiverStatus,"NEEDED");assert.equal(documents[0].waiverText,original);assert.equal(documents[0].signature,"Original Parent");
});
test("child update and waiver coverage invalidation roll back together",async()=>{
 failCoverage=true;assert.equal((await POST(request(childUpdate({firstName:"Different"})),context)).status,500);assert.equal(child.firstName,"First");assert.equal(coverage.status,"VALID");
});
test("archive refuses active visits, memberships and upcoming parties; restore keeps the same child and evidence",async()=>{
 const archive=()=>({action:"child-archive",childId:"child",updatedAt:child.updatedAt.toISOString()});
 for(const blocker of ["visit","membership","party"]){visit=blocker==="visit"?{id:"v"}:null;membership=blocker==="membership"?{id:"m"}:null;partyGuest=blocker==="party"?{id:"g"}:null;assert.equal((await POST(request(archive()),context)).status,409);assert.equal(child.active,true);}
 visit=null;membership=null;partyGuest=null;assert.equal((await POST(request(archive()),context)).status,200);assert.equal(child.active,false);assert.equal(child.id,"child");assert.equal(documents.length,3);assert.equal(coverage.status,"VALID");
 assert.equal((await POST(request({action:"child-restore",childId:"foreign-child",updatedAt:child.updatedAt.toISOString()}),context)).status,404);
 assert.equal((await POST(request({action:"child-restore",childId:"child",updatedAt:child.updatedAt.toISOString()}),context)).status,200);assert.equal(child.active,true);assert.equal(child.id,"child");
});
test("history denies signed-out, unverified and unlinked accounts before exposing records",async()=>{
 user=null;assert.equal((await history(request(),context)).status,401);assert.equal(reads,0);
 user={id:"user",email:"parent@example.invalid",emailVerified:false};assert.equal((await history(request(),context)).status,403);assert.equal(reads,0);
 user.emailVerified=true;parent=null;assert.equal((await history(request(),context)).status,403);
});
test("saved forms and originals are family scoped, and rental records require the hosting parent",async()=>{
 const response=await history(request(undefined,"?section=forms"),context);assert.equal(response.status,200);assert.deepEqual((await response.json()).records.map((r:any)=>r.id),["doc"]);
 assert.equal((await history(request(undefined,"?document=foreign"),context)).status,404);assert.equal((await history(request(undefined,"?document=other-parent-rental"),context)).status,404);
 assert.equal((await history(request(undefined,"?document=doc"),context)).status,200);assert.equal(lastQuery.where.familyId,"family");assert.equal(lastQuery.where.tenantId,"tenant");assert.equal(lastQuery.select.requestHash,undefined);assert.equal(lastQuery.select.pdfUrl,undefined);
});
test("visits, memberships, payments and archived children use scoped, bounded history queries",async()=>{
 for(const section of ["visits","memberships","payments","archived","counter"]){assert.equal((await history(request(undefined,`?section=${section}&page=2`),context)).status,200);assert.equal(lastQuery.where.tenantId,"tenant");assert.equal(lastQuery.skip,20);assert.equal(lastQuery.take,21);assert.equal(lastQuery.select.notes,undefined);if(section==="payments"){assert.equal(lastQuery.where.party.familyId,"family");assert.equal(lastQuery.where.party.primaryParentId,"parent");assert.equal(lastQuery.select.processorPaymentId,undefined);}else assert.equal(lastQuery.where.familyId,"family");}
 for(const query of ["?section=bad","?page=-1","?page=1.5"]){assert.equal((await history(request(undefined,query),context)).status,400);}
});
test("family response includes editable fields and exact waiver-document reference without internal notes",async()=>{
 const response=await GET(request(),context);assert.equal(response.status,200);const family=await response.json();assert.equal(family.parent.updatedAt,parent.updatedAt.toISOString());assert.equal(family.parent.notes,undefined);assert.equal(family.children[0].waivers[0].waiver.id,"doc");
});
test("printable copies preserve stored wording and escape untrusted signature and clause text",()=>{
 const doc:SavedDocument={id:"doc",kind:"LIABILITY",status:"VALID",version:"original-v1",signedAt:"2026-01-01T12:00:00Z",expiresAt:null,signerName:'</p><script>alert(1)</script>',signerEmail:"parent@example.invalid",signature:"Original Signature",photoConsent:false,children:[{childId:"child",childNameSnapshot:"Original Child",dateOfBirthSnapshot:"2020-01-01T00:00Z",status:"REVOKED"}],party:null,waiverText:JSON.stringify({title:"Original waiver",clauses:[["one","Historic title","Unique historic wording <img onerror='bad'>"]],photoConsentText:"Optional historic photo text",signatureConsentText:"Original electronic consent"})};
 const html=printableDocument(doc,"America/New_York");assert.ok(html.includes("Unique historic wording &lt;img"));assert.ok(html.includes("Original electronic consent"));assert.ok(html.includes("Original Child"));assert.ok(html.includes("Original Signature"));assert.ok(!html.includes("<script>"));assert.ok(!html.includes("<img"));assert.ok(html.includes("original-v1"));
});

test("parent receipt lookup requires the linked family and excludes cashier/internal metadata",async()=>{
 const own=await history(request(undefined,"?receipt=own-receipt"),context);assert.equal(own.status,200);assert.equal(lastQuery.where.familyId,"family");assert.equal(lastQuery.where.tenantId,"tenant");assert.equal(lastQuery.select.requestHash,undefined);assert.equal(lastQuery.select.staffId,undefined);assert.equal(lastQuery.select.payments.select.notes,undefined);assert.equal(lastQuery.select.payments.select.staffId,undefined);
 assert.equal((await history(request(undefined,"?receipt=foreign-receipt"),context)).status,404);
});
