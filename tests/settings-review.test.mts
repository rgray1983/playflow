import assert from "node:assert/strict";
import {test,mock} from "node:test";
import {membershipPlanFields} from "../src/lib/settings/membership-plan";
import {moduleCatalog} from "../src/lib/modules/catalog";
let role="OWNER",updates:any[]=[],creates:any[]=[];
const db:any={employee:{findUnique:async()=>({id:"staff",tenantId:"tenant",authUserId:"user",firstName:"Test",lastName:"Staff",status:"ACTIVE",accessRole:role,accessApproved:true,staffRole:null})},membershipPlan:{update:async({where,data}:any)=>{updates.push({where,data});return{id:where.id,tenantId:"tenant",name:"Existing",price:20,description:null,billingInterval:"NONE",durationDays:null,visitLimit:5,autoRenewDefault:false,active:false,createdAt:new Date(),updatedAt:new Date(),...data};},create:async({data}:any)=>{creates.push(data);return{id:"new",createdAt:new Date(),updatedAt:new Date(),...data};}}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:db}});
mock.module("../src/lib/auth/server.ts",{namedExports:{getAuth:()=>({getSession:async()=>({data:{user:{id:"user",email:"staff@example.invalid",emailVerified:true}},error:null})})}});
const {POST,DELETE}=await import("../src/app/api/memberships/route");
test("membership plans reject invalid money, fractions and zero or negative limits before saving",async()=>{
 for(const change of [{price:-1},{price:"1.234"},{durationDays:2.5},{visitLimit:0},{visitLimit:-1},{billingInterval:"WEEKLY"},{active:"false"},{name:" "}]){
 assert.throws(()=>membershipPlanFields({name:"Plan",price:20,...change}));
 const response=await POST(new Request("http://localhost/api/memberships",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Plan",price:20,...change})}));assert.equal(response.status,400);
 }assert.equal(creates.length,0);
});
test("blank membership duration/limit means no expiry/unlimited, and prices retain cents",()=>{
 const result=membershipPlanFields({name:" Valid Plan ",price:"12.50",durationDays:"",visitLimit:null});assert.equal(result.name,"Valid Plan");assert.equal(result.price,"12.50");assert.equal(result.durationDays,null);assert.equal(result.visitLimit,null);
});
test("disabling a plan preserves the row and its membership links and is tenant scoped",async()=>{
 const response=await DELETE(new Request("http://localhost/api/memberships?id=plan",{method:"DELETE"}));assert.equal(response.status,200);assert.deepEqual(updates.at(-1),{where:{id:"plan",tenantId:"tenant"},data:{active:false}});assert.equal((await response.json()).disabled,true);
});
test("front desk cannot change membership catalog settings",async()=>{
 role="FRONT_DESK";const before=updates.length;const response=await DELETE(new Request("http://localhost/api/memberships?id=plan",{method:"DELETE"}));assert.equal(response.status,403);assert.equal(updates.length,before);role="OWNER";
});
test("module readiness reflects working memberships/retail and keeps unbuilt modules planned",()=>{
 assert.equal(moduleCatalog.length,13);assert.equal(new Set(moduleCatalog.map(m=>m.key)).size,13);for(const key of ["families","pos","admissions","memberships","retail"])assert.equal(moduleCatalog.find(m=>m.key===key)?.readiness,"available");for(const key of ["camps","classes","field_trips","rentals"])assert.equal(moduleCatalog.find(m=>m.key===key)?.readiness,"planned");assert.equal(moduleCatalog.find(m=>m.key==="reports")?.readiness,"partial");assert(!moduleCatalog.some(m=>m.key==="gift_cards"));
});
