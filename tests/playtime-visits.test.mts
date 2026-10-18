import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
import {FORM_VERSION,legalForm} from "../src/lib/waivers/forms";
import {hasPermission} from "../src/lib/auth/permissions";
let user:any,employee:any,families:any[],parents:any[],children:any[],visits:any[],waivers:any[],coverage:any[],memberships:any[],admissions:any[];
let failChild="",locks=0,writes=0,familyReads=0,lastWhere:any;
const tenant={id:"tenant",slug:"palmetto-playhouse",name:"Palmetto",timezone:"America/New_York",waiverValidityDays:null};
const matchingFamily=(where:any)=>families.find(f=>f.tenantId===where.tenantId&&(!where.id||f.id===where.id)&&(!where.status||f.status===where.status)&&(!where.intakeRequestId||f.intakeRequestId===where.intakeRequestId));
function validProof(where:any){return coverage.filter(c=>c.childId===where.childId&&c.status==="VALID"&&c.signedAt&&c.waiver.tenantId===where.waiver.tenantId&&c.waiver.familyId===where.waiver.familyId&&c.waiver.kind==="LIABILITY"&&c.waiver.status==="VALID"&&c.waiver.signedAt&&c.waiver.version&&(!c.waiver.expiresAt||c.waiver.expiresAt>new Date()));}
function visitRows(where:any){return visits.filter(v=>v.tenantId===where.tenantId&&(!where.familyId||v.familyId===where.familyId)&&(!where.childId||v.childId===where.childId)&&(!where.id?.in||where.id.in.includes(v.id))&&(!where.requestId||v.requestId===where.requestId)&&(!where.membershipId||v.membershipId===where.membershipId)&&(!where.checkedInAt?.gte||v.checkedInAt>=where.checkedInAt.gte)&&(!where.status||(typeof where.status==="string"?v.status===where.status:v.status!==where.status.not))&&(where.checkedOutAt!==null||v.checkedOutAt===null));}
const db:any={
 employee:{findUnique:async()=>employee,findMany:async()=>[]},
 tenant:{findUnique:async()=>tenant,findUniqueOrThrow:async()=>tenant},
 family:{
  findFirst:async(query:any)=>{familyReads++;lastWhere=query.where;const f=matchingFamily(query.where);if(!f)return null;if(!query.select)return f;return{...f,parents:parents.filter(p=>p.familyId===f.id&&p.tenantId===f.tenantId),children:children.filter(c=>c.familyId===f.id&&c.tenantId===f.tenantId&&c.active).map(c=>({...c,waivers:validProof({childId:c.id,waiver:{tenantId:f.tenantId,familyId:f.id}}).slice(0,1),visits:visitRows({tenantId:f.tenantId,childId:c.id,status:"CHECKED_IN",checkedOutAt:null})}))};},
  findMany:async(query:any)=>{lastWhere=query.where;return families.filter(f=>f.tenantId===query.where.tenantId&&f.status==="ACTIVE").map(f=>({...f,parents:parents.filter(p=>p.familyId===f.id),_count:{children:children.filter(c=>c.familyId===f.id&&c.active).length}}));},
  create:async({data}:any)=>{writes++;const family={id:`family-${families.length}`,status:"ACTIVE",...data};families.push(family);parents.push({id:`parent-${parents.length}`,familyId:family.id,...data.parents.create});for(const c of data.children.create)children.push({id:`child-${children.length}`,familyId:family.id,active:true,...c});return family;},
 },
 parent:{findFirst:async({where}:any)=>parents.find(p=>p.tenantId===where.tenantId&&(!where.id||p.id===where.id)&&(!where.familyId||p.familyId===where.familyId)&&(!where.authUserId||p.authUserId===where.authUserId)&&(!where.family||matchingFamily({tenantId:p.tenantId,id:p.familyId,status:where.family.status})))??null,findMany:async({where}:any)=>parents.filter(p=>p.tenantId===where.tenantId&&(p.email?.toLowerCase()===where.OR[0].email.equals||p.firstName.toLowerCase()===where.OR[1].firstName.equals.toLowerCase()&&p.lastName.toLowerCase()===where.OR[1].lastName.equals.toLowerCase())),update:async({where,data}:any)=>{const parent=parents.find(p=>p.id===where.id&&p.tenantId===where.tenantId);Object.assign(parent,data);return parent;}},
 child:{findFirst:async({where}:any)=>children.find(c=>c.tenantId===where.tenantId&&(!where.id||c.id===where.id)&&(!where.familyId||c.familyId===where.familyId)&&(where.active===undefined||c.active===where.active)&&(!where.intakeRequestId||c.intakeRequestId===where.intakeRequestId)&&(!where.firstName||c.firstName.toLowerCase()===where.firstName.equals.toLowerCase())&&(!where.lastName||c.lastName.toLowerCase()===where.lastName.equals.toLowerCase())&&(where.dateOfBirth===undefined||c.dateOfBirth?.getTime()===where.dateOfBirth?.getTime()))??null,findMany:async({where}:any)=>children.filter(c=>c.tenantId===where.tenantId&&c.familyId===where.familyId&&c.active&&(!where.id?.in||where.id.in.includes(c.id))),create:async({data}:any)=>{writes++;const child={id:`child-${children.length}`,active:true,...data};children.push(child);return child;}},
 visit:{findFirst:async({where}:any)=>visitRows(where)[0]??null,findMany:async(query:any)=>{lastWhere=query.where;return visitRows(query.where).slice(query.skip??0,(query.skip??0)+(query.take??1000)).map(v=>({...v,child:children.find(c=>c.id===v.childId),family:families.find(f=>f.id===v.familyId),guardianParent:parents.find(p=>p.id===v.guardianParentId)??null}));},count:async({where}:any)=>visitRows(where).length,create:async({data}:any)=>{if(data.childId===failChild)throw new Error("simulated visit persistence failure");writes++;const visit={id:`visit-${visits.length}`,checkedOutAt:null,...data};visits.push(visit);return visit;},update:async({where,data}:any)=>{assert.equal(where.tenantId,"tenant");writes++;const visit=visits.find(v=>v.id===where.id&&v.tenantId===where.tenantId);Object.assign(visit,data);return visit;}},
 waiverChild:{findFirst:async({where}:any)=>validProof(where)[0]??null},
 waiver:{findFirst:async({where}:any)=>waivers.find(w=>w.tenantId===where.tenantId&&w.requestId===where.requestId)??null,create:async({data}:any)=>{writes++;const doc={id:`waiver-${waivers.length}`,...data};const kids=data.children.create.map((c:any,index:number)=>({id:`coverage-${coverage.length+index}`,waiver:doc,...c}));coverage.push(...kids);waivers.push(doc);return{...doc,children:kids};}},
 membership:{findFirst:async({where}:any)=>memberships.find(m=>m.id===where.id&&m.tenantId===where.tenantId&&m.familyId===where.familyId)??null,findMany:async({where}:any)=>memberships.filter(m=>m.tenantId===where.tenantId&&m.familyId===where.familyId)},
 admissionType:{findFirst:async({where}:any)=>admissions.find(a=>a.id===where.id&&a.tenantId===where.tenantId&&a.active)??null,findMany:async({where}:any)=>admissions.filter(a=>a.tenantId===where.tenantId&&a.active)},
 partyGuest:{updateMany:async({where}:any)=>{assert.equal(where.tenantId,"tenant");return{count:0};}},
 $queryRaw:async()=>{locks++;return[];},
};
let queue=Promise.resolve();
db.$transaction=async(callback:any)=>{const previous=queue;let release!:()=>void;queue=new Promise<void>(resolve=>release=resolve);await previous;const original=structuredClone({families,parents,children,visits,waivers,coverage,memberships});try{return await callback(db);}catch(error){({families,parents,children,visits,waivers,coverage,memberships}=original);throw error;}finally{release();}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:user?{user}:null,error:null})})}});
const {GET,POST}=await import("../src/app/api/check-in/route");
const {POST:signAtDesk}=await import("../src/app/api/check-in/waiver/route");
const {GET:parentHistory}=await import("../src/app/api/parent/[slug]/history/route");
const request=(body?:any,query="")=>new Request(`http://localhost/api/check-in${query}`,{method:body?"POST":"GET",headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
const entry=(childId="child-a")=>({childId,mode:"ADMISSION",admissionTypeId:"admission",listedPrice:20});
const checkIn=(extra:any={})=>({action:"check-in",requestId:"check-in-request-123456",familyId:"family",guardianParentId:"parent",entries:[entry()],admissionAcknowledged:true,...extra});
const member=(extra:any={})=>({id:"member",tenantId:"tenant",familyId:"family",childId:null,name:"Visit pack",status:"ACTIVE",startsAt:new Date(Date.now()-86400000),endsAt:new Date(Date.now()+86400000),membershipPlan:{id:"plan",tenantId:"tenant",name:"Visit pack",visitLimit:2},...extra});
const signature=(extra:any={})=>({version:FORM_VERSION,signerName:"Test Parent",signerEmail:"parent@example.invalid",signature:"Test Parent",signatureConsent:true,requestId:"desk-signature-request-123456",acknowledgments:legalForm("LIABILITY").clauses.map(c=>c[0]),photoConsent:false,...extra});
beforeEach(()=>{
 user={id:"user",email:"parent@example.invalid",emailVerified:true};employee={id:"front-desk",tenantId:"tenant",authUserId:"user",firstName:"Test",lastName:"Staff",status:"ACTIVE",accessRole:"FRONT_DESK",accessApproved:true,staffRole:null};
 families=[{id:"family",tenantId:"tenant",name:"Test Family",status:"ACTIVE"},{id:"foreign-family",tenantId:"other",name:"Private Family",status:"ACTIVE"}];parents=[{id:"parent",tenantId:"tenant",familyId:"family",authUserId:"user",firstName:"Test",lastName:"Parent",email:"parent@example.invalid",phone:"8035550100",family:{status:"ACTIVE"}}];
 children=["a","b"].map(letter=>({id:`child-${letter}`,tenantId:"tenant",familyId:"family",firstName:`Child ${letter}`,lastName:"Test",dateOfBirth:new Date("2020-01-01"),allergies:null,medicalNotes:null,active:true}));
 waivers=[{id:"original",tenantId:"tenant",familyId:"family",kind:"LIABILITY",status:"VALID",signedAt:new Date(),version:"original-v1",expiresAt:null}];coverage=children.map(c=>({id:`coverage-${c.id}`,childId:c.id,status:"VALID",signedAt:new Date(),waiver:waivers[0]}));
 visits=[];memberships=[];admissions=[{id:"admission",tenantId:"tenant",name:"Open Play",price:20,active:true}];failChild="";locks=0;writes=0;familyReads=0;lastWhere=null;
});
test("check-in is limited to verified front desk/management, never parent-only or party-host access",async()=>{
 user=null;assert.equal((await GET(request())).status,401);assert.equal(familyReads,0);
 user={id:"user",email:"parent@example.invalid",emailVerified:false};assert.equal((await POST(request(checkIn()))).status,403);
 user.emailVerified=true;employee=null;assert.equal((await GET(request())).status,403);assert.equal(familyReads,0);
 employee={id:"staff",tenantId:"tenant",authUserId:"user",firstName:"Party",lastName:"Host",status:"ACTIVE",accessRole:"PARTY_HOST",accessApproved:true,staffRole:null};assert.equal((await POST(request(checkIn()))).status,403);
 assert.equal(hasPermission("PARTY_HOST","visits.write"),false);assert.equal(hasPermission("FRONT_DESK","visits.write"),true);assert.equal(writes,0);
});
test("admission check-in saves real evidence, listed price and staff, without manufacturing payment",async()=>{
 const response=await POST(request(checkIn({paymentStatus:"PAID",waiverAccepted:true,fakePrice:1})));assert.equal(response.status,200);assert.equal(visits.length,1);
 const v=visits[0];assert.equal(v.familyId,"family");assert.equal(v.guardianParentId,"parent");assert.equal(v.childId,"child-a");assert.equal(v.waiverChildId,"coverage-child-a");assert.equal(v.checkInStaffId,"front-desk");assert.equal(v.admissionSnapshot.listedPrice,20);assert.equal(v.admissionSnapshot.paymentStatus,"NOT_RECORDED");assert.equal(v.admissionSnapshot.pricing,"LIST_PRICE_ONLY");assert.equal(v.status,"CHECKED_IN");assert.ok(v.checkedInAt instanceof Date);assert.equal(locks,1);
});
test("same check-in retry saves once; changed retries and concurrent separate requests cannot duplicate entry",async()=>{
 const body=checkIn();const responses=await Promise.all([POST(request(body)),POST(request(body))]);assert.ok(responses.every(r=>r.status===200));assert.equal(visits.length,1);
 assert.equal((await POST(request({...body,entries:[entry("child-b")]}))).status,409);
 assert.equal((await POST(request(checkIn({requestId:"another-check-in-request"})))).status,409);assert.equal(visits.length,1);
});
test("different concurrent requests for one child leave one active visit",async()=>{
 const responses=await Promise.all([POST(request(checkIn())),POST(request(checkIn({requestId:"different-check-in-request"})))]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(visits.length,1);
});
test("checkbox flags, revoked/expired/unsigned evidence cannot bypass waiver requirements",async()=>{
 for(const change of [{status:"REVOKED"},{waiver:{...waivers[0],expiresAt:new Date("2020-01-01")}},{waiver:{...waivers[0],version:null}},{waiver:{...waivers[0],signedAt:null}}]){const original=coverage[0];coverage[0]={...original,...change};assert.equal((await POST(request(checkIn({waiverAccepted:true})))).status,409);coverage[0]=original;}
 coverage=[];assert.equal((await POST(request(checkIn({waiverAccepted:true})))).status,409);assert.equal(visits.length,0);
});
test("foreign children, guardians, families, inactive products and stale prices are rejected",async()=>{
 assert.equal((await POST(request(checkIn({entries:[entry("foreign-child")]})))).status,404);
 assert.equal((await POST(request(checkIn({guardianParentId:"foreign-parent"})))).status,404);
 assert.equal((await POST(request(checkIn({familyId:"foreign-family"})))).status,404);
 assert.equal((await POST(request(checkIn({entries:[{...entry(),listedPrice:1}]})))).status,409);
 admissions[0].active=false;assert.equal((await POST(request(checkIn()))).status,400);assert.equal(visits.length,0);
});
test("group admission requires acknowledgment and persists all children or none",async()=>{
 assert.equal((await POST(request(checkIn({admissionAcknowledged:false})))).status,400);
 failChild="child-b";assert.equal((await POST(request(checkIn({entries:[entry(),entry("child-b")]})))).status,500);assert.equal(visits.length,0);
 failChild="";coverage=coverage.filter(c=>c.childId!=="child-b");assert.equal((await POST(request(checkIn({entries:[entry(),entry("child-b")]})))).status,409);assert.equal(visits.length,0);
});
test("membership entry consumes a recorded visit without collecting money; checkout does not refund usage",async()=>{
 memberships=[member()];const body=checkIn({entries:[{childId:"child-a",mode:"MEMBERSHIP",membershipId:"member"}],admissionAcknowledged:false});assert.equal((await POST(request(body))).status,200);assert.equal(visits[0].membershipId,"member");assert.equal(visits[0].admissionTypeId,null);assert.equal(visits[0].admissionSnapshot.usedAfterEntry,1);
 await POST(request({action:"check-out",visitIds:[visits[0].id]}));assert.equal((await POST(request({...body,requestId:"second-member-visit-123"}))).status,200);assert.equal(visits[1].admissionSnapshot.usedAfterEntry,2);
 await POST(request({action:"check-out",visitIds:[visits[1].id]}));assert.equal((await POST(request({...body,requestId:"third-member-visit-123"}))).status,409);assert.equal(visits.length,2);
});
test("shared membership credits are checked across the whole group under the reservation lock",async()=>{
 memberships=[member({membershipPlan:{id:"plan",tenantId:"tenant",name:"One visit",visitLimit:1}})];const entries=["child-a","child-b"].map(childId=>({childId,mode:"MEMBERSHIP",membershipId:"member"}));assert.equal((await POST(request(checkIn({entries})))).status,409);assert.equal(visits.length,0);
});
test("membership expiry, pause, future start, wrong child, wrong tenant and missing plan do not grant entry",async()=>{
 const body=checkIn({entries:[{childId:"child-a",mode:"MEMBERSHIP",membershipId:"member"}]});
 for(const change of [{endsAt:new Date("2020-01-01")},{status:"PAUSED"},{startsAt:new Date("2099-01-01")},{childId:"child-b"},{membershipPlan:null},{tenantId:"other"}]){memberships=[member(change)];assert.ok([404,409].includes((await POST(request(body))).status));}
 assert.equal(visits.length,0);
});
test("checkout is scoped, preserves its original timestamp on retry, and never blocks exit on expired waiver",async()=>{
 await POST(request(checkIn()));const id=visits[0].id;
 assert.equal((await POST(request({action:"check-out",visitIds:[id,"foreign-visit"]}))).status,404);assert.equal(visits[0].status,"CHECKED_IN");
 waivers[0].expiresAt=new Date("2020-01-01");assert.equal((await POST(request({action:"check-out",visitIds:[id]}))).status,200);const timestamp=visits[0].checkedOutAt.toISOString();
 const again=await POST(request({action:"check-out",visitIds:[id]}));assert.equal((await again.json()).checkedOut,0);assert.equal(visits[0].checkedOutAt.toISOString(),timestamp);assert.equal(visits[0].checkOutStaffId,"front-desk");
});
test("walk-in intake retries do not duplicate family or grant login, and existing contacts require review",async()=>{
 const body={action:"intake",requestId:"new-family-request-123",guardian:{firstName:"New",lastName:"Family",email:"new@example.invalid",phone:"8035550199",authUserId:"attacker"},children:[{firstName:"New",lastName:"Child",dateOfBirth:"2020-01-01"}]};
 const one=await POST(request(body));assert.equal(one.status,200);const result=await one.json();assert.equal((await POST(request(body))).status,200);assert.equal(families.length,3);assert.equal(parents.at(-1).authUserId,undefined);assert.equal(parents.at(-1).familyId,result.familyId);
 assert.equal((await POST(request({...body,guardian:{...body.guardian,phone:"8035550188"}}))).status,409);
 assert.equal((await POST(request({...body,requestId:"duplicate-contact-123",guardian:{...body.guardian,email:"parent@example.invalid"}}))).status,409);
});
test("adding a child to an existing family uses durable retry protection and rejects foreign families",async()=>{
 const body={action:"add-child",requestId:"add-child-request-123",familyId:"family",firstName:"New",lastName:"Child",dateOfBirth:"2021-01-01"};assert.equal((await POST(request(body))).status,200);assert.equal((await POST(request(body))).status,200);assert.equal(children.length,3);
 assert.equal((await POST(request({...body,firstName:"Changed"}))).status,409);assert.equal((await POST(request({...body,requestId:"foreign-child-request-123",familyId:"foreign-family"}))).status,404);
});
test("desk waiver requires the actual guardian signature and stores witness identity without claiming verified-parent login",async()=>{
 const body={familyId:"family",guardianParentId:"parent",childIds:["child-a","child-b"],signing:signature(),witness:{staffId:"forged"}};
 assert.equal((await signAtDesk(request({...body,signing:signature({acknowledgments:[]})}))).status,400);
 assert.equal((await signAtDesk(request({...body,childIds:["foreign-child"]}))).status,404);
 assert.equal((await signAtDesk(request(body))).status,200);const saved=waivers.at(-1);assert.equal(saved.acknowledgments.identityMethod,"IN_PERSON_GUARDIAN");assert.equal(saved.acknowledgments.witness.staffId,"front-desk");assert.equal(saved.acknowledgments.witness.name,"Test Staff");assert.equal(coverage.filter(c=>c.waiver.id===saved.id).length,2);assert.equal(saved.photoConsent,false);
 assert.equal((await signAtDesk(request(body))).status,200);assert.equal(waivers.length,2);
});
test("live family search/details and occupancy use saved tenant records, and visits appear in the linked parent history",async()=>{
 assert.equal((await GET(request(undefined,"?familyId=foreign-family"))).status,404);
 const search=await GET(request(undefined,"?q=Test"));assert.equal(search.status,200);assert.ok((await search.json()).families.every((f:any)=>f.tenantId==="tenant"));assert.equal(lastWhere.tenantId,"tenant");
 await POST(request(checkIn()));const inside=await (await GET(request())).json();assert.equal(inside.insideCount,1);assert.equal(inside.visits[0].child.firstName,"Child a");
 const detail=await (await GET(request(undefined,"?familyId=family"))).json();assert.equal(detail.family.children[0].activeVisit.id,visits[0].id);
 const history=await parentHistory(request(undefined,"?section=visits"),{params:Promise.resolve({slug:"palmetto-playhouse"})});assert.equal(history.status,200);assert.equal((await history.json()).records.length,1);
});
test("cross-site desk mutations fail before any visit or family writes",async()=>{
 const cross=new Request("http://localhost/api/check-in",{method:"POST",headers:{Origin:"https://other.invalid","Content-Type":"application/json"},body:JSON.stringify(checkIn())});assert.equal((await POST(cross)).status,403);assert.equal(writes,0);
});
