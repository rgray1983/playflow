import assert from "node:assert/strict";
import {mock,test} from "node:test";
import {workspaceFields,suggestedSlug,businessProfileFields} from "../src/lib/workspaces/rules";
import {workspaceSetup} from "../src/lib/workspaces/status";
type User={id:string;email:string;name:string;emailVerified:boolean};
type Tenant={id:string;name:string;slug:string;timezone:string;ownerAuthUserId:string;email:string};
type Employee={id:string;tenantId:string;authUserId:string|null;email:string;accessRole:string;accessApproved:boolean;status:string};
let user:User|null=null,tenants:Tenant[]=[],employees:Employee[]=[],commerce:Record<string,any>[]=[],reads=0,failEmployee=false;
const unique=()=>Object.assign(new Error("unique"),{code:"P2002"});
const tx={
 $queryRaw:async()=>[],
 tenant:{findUnique:async({where}:any)=>{reads++;return tenants.find(t=>where.slug?t.slug===where.slug:t.id===where.id)??null;},create:async({data}:any)=>{if(tenants.some(t=>t.slug===data.slug||t.ownerAuthUserId===data.ownerAuthUserId))throw unique();const t={id:`business-${tenants.length+1}`,...data};tenants.push(t);return{id:t.id,name:t.name,slug:t.slug};}},
 employee:{findUnique:async({where}:any)=>{reads++;const e=employees.find(e=>e.authUserId===where.authUserId);return e?{...e,tenant:tenants.find(t=>t.id===e.tenantId)}:null;},findFirst:async({where}:any)=>{reads++;return employees.find(e=>e.email.toLowerCase()===where.email.equals.toLowerCase()&&e.authUserId===null&&e.accessApproved&&e.status==="ACTIVE")??null;},create:async({data}:any)=>{if(failEmployee)throw new Error("Employee save failed");if(employees.some(e=>e.authUserId===data.authUserId))throw unique();const e={id:`employee-${employees.length+1}`,...data};employees.push(e);return e;}},
 commerceSettings:{create:async({data}:any)=>{commerce.push(data);return data;}},
};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:{...tx,$transaction:async(callback:any)=>{const snapshot=structuredClone({tenants,employees,commerce});try{return await callback(tx);}catch(e){({tenants,employees,commerce}=snapshot);throw e;}}}}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:user?{user}:null,error:null})})}});
const {GET,POST}=await import("../src/app/api/onboarding/route");
const {provisionWorkspace}=await import("../src/lib/workspaces/provision");
const owner=(id:string):User=>({id,email:`${id}@example.invalid`,name:`Owner ${id}`,emailVerified:true});
const fields=(slug="play-center-one")=>({name:"A Play Center",slug,timezone:"America/New_York"});
const request=(body:unknown,origin?:string)=>new Request("https://playflow.example/api/onboarding",{method:"POST",headers:{"Content-Type":"application/json",...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});
function reset(){user=null;tenants=[];employees=[];commerce=[];reads=0;failEmployee=false;}
test("new workspace requests require a verified login and reject cross-origin mutations before data access",async()=>{
 reset();assert.equal((await POST(request(fields()))).status,401);assert.equal(reads,0);
 user={...owner("a"),emailVerified:false};assert.equal((await POST(request(fields()))).status,403);assert.equal(reads,0);
 user=owner("a");assert.equal((await POST(request(fields(),"https://foreign.example"))).status,403);assert.equal(reads,0);
 assert.equal((await GET()).headers.get("cache-control"),"private, no-store");
});
test("workspace input rejects reserved addresses, unsupported timezones and malformed payloads",()=>{
 for(const changes of [{slug:"admin"},{slug:"ab"},{slug:"play--center"},{slug:"a/b"},{timezone:"Not/AZone"},{name:"x".repeat(121)}])assert.throws(()=>workspaceFields({...fields(),...changes}));
 assert.throws(()=>workspaceFields(null));assert.throws(()=>workspaceFields([]));
 assert.equal(suggestedSlug("  Café & Play!  "),"cafe-play");
});
test("two verified owners receive separate empty workspaces and cannot inject another owner or tenant ID",async()=>{
 reset();user=owner("a");const a=await POST(request({...fields(),tenantId:"foreign",ownerAuthUserId:"attacker",accessRole:"MANAGER"}));assert.equal(a.status,201);
 user=owner("b");const b=await POST(request(fields("play-center-two")));assert.equal(b.status,201);
 assert.equal(tenants.length,2);assert.equal(employees.length,2);assert.equal(commerce.length,2);
 assert.equal(tenants[0].ownerAuthUserId,"a");assert.equal(tenants[1].ownerAuthUserId,"b");assert.notEqual(employees[0].tenantId,employees[1].tenantId);assert.equal(employees[0].accessRole,"OWNER");
 assert.equal(commerce[0].tenantId,tenants[0].id);assert.equal(commerce[1].tenantId,tenants[1].id);assert.equal(commerce[0].depositRules.enabled,false);assert.equal(commerce[0].receiptRules.emailReceiptEnabled,false);assert.equal(commerce[0].refundRules.enabled,false);assert.equal(commerce[0].processorRules.connected,false);
 const me=await(await GET()).json();assert.equal(me.workspace.slug,"play-center-two");assert.ok(!JSON.stringify(me).includes("play-center-one"));assert.equal(me.billing.status,"NOT_AVAILABLE");
});
test("retrying a workspace submission returns the same owner business rather than creating a duplicate",async()=>{
 reset();user=owner("a");await POST(request(fields()));const retry=await POST(request(fields("another-slug")));assert.equal(retry.status,200);assert.equal((await retry.json()).created,false);assert.equal(tenants.length,1);assert.equal(commerce.length,1);
});
test("claiming another owner's address cannot change their workspace",async()=>{
 reset();user=owner("a");await POST(request(fields()));const saved=structuredClone(tenants);
 user=owner("b");const collision=await POST(request(fields()));assert.equal(collision.status,409);assert.equal((await collision.json()).code,"SLUG_UNAVAILABLE");assert.deepEqual(tenants,saved);assert.equal(employees.length,1);
});
test("existing staff and pending invitations do not become new business owners",async()=>{
 reset();user=owner("a");await POST(request(fields()));employees[0].accessRole="FRONT_DESK";assert.equal((await POST(request(fields("new-center")))).status,409);assert.equal(tenants.length,1);
 reset();user=owner("invited");employees.push({id:"invite",tenantId:"existing",authUserId:null,email:user.email,accessRole:"FRONT_DESK",accessApproved:true,status:"ACTIVE"});assert.equal((await POST(request(fields()))).status,409);assert.equal(tenants.length,0);assert.equal((await(await GET()).json()).invitation,true);
});
test("workspace creation is atomic if owner creation fails",async()=>{
 reset();user=owner("a");failEmployee=true;const response=await POST(request(fields()));assert.equal(response.status,500);assert.equal(tenants.length,0);assert.equal(employees.length,0);assert.equal(commerce.length,0);
});
test("live environment provisioning selects Live without reusing another business authorization",async()=>{
 reset();const result=await provisionWorkspace(tx as any,owner("live"),fields(),"live");assert.equal(result.created,true);assert.deepEqual(commerce[0].processorRules,{provider:"square",mode:"live",connected:false,accountLabel:""});
});
test("setup checklist never treats Sandbox or unavailable subscription billing as live-ready",()=>{
 const steps=workspaceSetup({profile:true,admissions:1,eventTypes:1,packages:1,staff:2,forms:false,payment:{configured:true,connected:true,ready:true,mode:"sandbox"}});
 assert.equal(steps.find(s=>s.key==="payments")?.state,"testing");assert.equal(steps.find(s=>s.key==="forms")?.state,"needed");assert.equal(steps.find(s=>s.key==="subscription")?.state,"planned");
});

test("business profile updates validate timezones and ignore protected owner fields",()=>{
 assert.throws(()=>businessProfileFields({name:"Center",timezone:"Not/AZone"}));
 assert.throws(()=>businessProfileFields({name:"Center",email:"invalid"}));
 assert.throws(()=>businessProfileFields({name:"Center",website:"javascript:alert(1)"}));
 const profile=businessProfileFields({name:" Center ",timezone:"America/Chicago",ownerAuthUserId:"foreign",slug:"stolen",email:"contact@example.invalid"});
 assert.equal(profile.name,"Center");assert.equal(profile.timezone,"America/Chicago");assert.ok(!("ownerAuthUserId" in profile));assert.ok(!("slug" in profile));
});
