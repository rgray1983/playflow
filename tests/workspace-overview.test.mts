import assert from "node:assert/strict";
import {mock,test} from "node:test";
let current="business-a";
const calls:{model:string;query:any}[]=[];
const count=(model:string)=>async(query:any)=>{calls.push({model,query});assert.equal(query.where.tenantId,current);return current==="business-a"?1:2;};
const findMany=(model:string)=>async(query:any)=>{calls.push({model,query});assert.equal(query.where.tenantId,current);assert.equal(query.take,5);return [];};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:{family:{count:count("family")},child:{count:count("child")},visit:{count:count("visit"),findMany:findMany("visit")},party:{count:count("party"),findMany:findMany("party")},admissionType:{count:count("admission")},eventType:{count:count("eventType")},package:{count:count("package")},employee:{count:count("employee")}}}});
mock.module("../src/lib/auth/staff.ts",{namedExports:{getStaffContext:()=>({tenantId:current,accessRole:"OWNER"}),getStaffTenant:async()=>({id:current,name:current,slug:current,timezone:"America/New_York",phone:null,email:null,address1:null,city:null}),withStaff:(_permission:string,handler:any)=>handler}});
mock.module("../src/lib/payments/square/client.ts",{namedExports:{publicConnection:async(tenantId:string)=>{assert.equal(tenantId,current);return {configured:true,ready:true,connected:true,mode:"sandbox",applicationId:"app-identifier-not-for-overview",merchantId:"merchant-private"};}}});
const {GET}=await import("../src/app/api/workspace/route");
test("workspace overview scopes every query to the current business and exposes no other business identity or payment credentials",async()=>{
 for(current of ["business-a","business-b"]){calls.length=0;const response=await GET();assert.equal(response.status,200);const data=await response.json();assert.equal(data.business.name,current);assert.equal(data.metrics.families,current==="business-a"?1:2);assert.ok(calls.length>=10);const serialized=JSON.stringify(data);assert.ok(!serialized.includes(current==="business-a"?"business-b":"business-a"));assert.ok(!serialized.includes("merchant-private"));assert.ok(!serialized.includes("app-identifier-not-for-overview"));assert.equal(data.payment.mode,"sandbox");assert.equal(data.billing.status,"NOT_AVAILABLE");}
});
test("dashboard party counts use a bounded business-local day and omit cancelled or expired pending holds",async()=>{
 current="business-a";calls.length=0;await GET();const query=calls.find(c=>c.model==="party"&&c.query.where.startTime)?.query;assert.ok(query);assert.equal(query.where.status.not,"CANCELLED");assert.ok(query.where.startTime.gte instanceof Date);assert.ok(query.where.startTime.lt>query.where.startTime.gte);assert.ok(query.where.OR.some((clause:any)=>clause.confirmationExpiresAt?.gt instanceof Date));
});
