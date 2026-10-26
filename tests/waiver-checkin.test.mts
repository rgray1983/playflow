import assert from "node:assert/strict";
import {test,mock,beforeEach} from "node:test";
let guest:Record<string,unknown>|null,updates=0;let familyActive=true;
const db={$queryRaw:async()=>[],family:{findFirst:async()=>familyActive?{id:"family"}:null},child:{findFirst:async()=>familyActive?{id:"child"}:null},partyGuest:{findFirst:async()=>guest,update:async()=>{updates++;return{...guest,status:"CHECKED_IN"};}},eventTimelineItem:{create:async()=>({})}};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:{...db,$transaction:async(callback:(tx:object)=>Promise<unknown>)=>callback(db)}}});
mock.module("../src/lib/auth/staff.ts",{namedExports:{withStaff:(_permission:string,handler:unknown)=>handler,getStaffContext:()=>({tenantId:"tenant"})}});
const {POST}=await import("../src/app/api/events/[eventId]/guests/[guestId]/check-in/route");
const check=()=>POST(new Request("http://localhost/api/events/party/guests/guest/check-in",{method:"POST"}),{params:Promise.resolve({eventId:"party",guestId:"guest"})});
beforeEach(()=>{updates=0;familyActive=true;guest={id:"guest",tenantId:"tenant",partyId:"party",childId:"child",rsvpStatus:"ATTENDING",status:"EXPECTED",party:{status:"CONFIRMED"},waiverChild:{childId:"child",status:"VALID",signedAt:new Date(),waiver:{tenantId:"tenant",kind:"LIABILITY",status:"VALID",signedAt:new Date(),version:"v1",expiresAt:null}}};});
test("check-in requires actual child-specific signed coverage rather than a checkbox flag",async()=>{guest!.waiverChild=null;guest!.waiverStatus="SIGNED";assert.equal((await check()).status,400);assert.equal(updates,0);});
test("valid child coverage permits check-in and expired coverage does not",async()=>{assert.equal((await check()).status,200);assert.equal(updates,1);const coverage=guest!.waiverChild as {waiver:{expiresAt:Date|null}};coverage.waiver.expiresAt=new Date("2020-01-01");assert.equal((await check()).status,400);assert.equal(updates,1);});

test("archived guest families cannot enter through an existing party invite record",async()=>{familyActive=false;assert.equal((await check()).status,409);assert.equal(updates,0);});
