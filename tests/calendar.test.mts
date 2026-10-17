import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { addDays, weekDays, localDay, clockMinutes, segmentsForWeek, layoutSegments, visibleBooking, parseDay, type CalendarBooking } from "../src/lib/calendar/dates";
const timezone = "America/New_York";
const event: CalendarBooking = {id:"party",startTime:"2027-01-10T17:15:00Z",endTime:"2027-01-10T19:45:00Z",title:"Birthday",eventTypeName:"Birthday Party",color:"#FFB768",eventNumber:"EVT-1",status:"CONFIRMED",packageName:"Package",depositStatus:"PENDING",balanceDue:300};
test("week navigation crosses month, year and leap-day boundaries",()=>{
 assert.equal(weekDays("2027-01-01")[0].key,"2026-12-27");
 assert.equal(weekDays("2027-01-01")[6].key,"2027-01-02");
 assert.equal(addDays("2028-02-28",1),"2028-02-29");
 assert.equal(addDays("2026-12-27",7),"2027-01-03");
 for(const day of ["2027-02-29","2027-13-01","today",""])assert.throws(()=>parseDay(day));
});
test("venue-local today and clock do not depend on the viewing device timezone",()=>{
 assert.equal(localDay("2026-10-17T02:00Z",timezone),"2026-10-16");
 assert.equal(clockMinutes("2027-01-10T17:15Z",timezone),735);
 assert.equal(clockMinutes("2027-07-10T16:15Z",timezone),735);
 assert.equal(clockMinutes("2027-01-10T05:00Z",timezone),0);
});
test("bookings appear in their actual week and preserve fractional-hour placement",()=>{
 const visible=segmentsForWeek([event],"2027-01-10",timezone);
 assert.equal(visible.length,1);assert.equal(visible[0].day,"2027-01-10");
 assert.equal(visible[0].startMinute,735);assert.equal(visible[0].endMinute,885);
 assert.equal(segmentsForWeek([event],"2027-01-17",timezone).length,0);
});
test("overnight bookings are split across days and midnight ends do not add a phantom day",()=>{
 const overnight={...event,startTime:"2027-01-11T04:30Z",endTime:"2027-01-11T06:30Z"};
 const visible=segmentsForWeek([overnight],"2027-01-10",timezone);
 assert.deepEqual(visible.map(s=>[s.day,s.startMinute,s.endMinute]),[["2027-01-10",1410,1440],["2027-01-11",0,90]]);
 const midnight={...overnight,endTime:"2027-01-11T05:00Z"};
 assert.equal(segmentsForWeek([midnight],"2027-01-10",timezone).length,1);
});
test("overlapping bookings use separate lanes and adjacent bookings share full width",()=>{
 const layout=layoutSegments([{day:"2027-01-10",startMinute:600,endMinute:720},{day:"2027-01-10",startMinute:660,endMinute:780},{day:"2027-01-10",startMinute:780,endMinute:840}]);
 assert.deepEqual(layout.map(s=>[s.lane,s.laneCount]),[[0,2],[1,2],[0,1]]);
});
test("cancelled and expired holds are hidden while confirmed and unexpired holds remain",()=>{
 const now=new Date("2027-01-01");
 assert.equal(visibleBooking({status:"CANCELLED"},now),false);
 assert.equal(visibleBooking({status:"PENDING",confirmationExpiresAt:"2026-12-31"},now),false);
 assert.equal(visibleBooking({status:"PENDING",confirmationExpiresAt:"2027-01-02"},now),true);
 assert.equal(visibleBooking({status:"CONFIRMED",confirmationExpiresAt:"2026-12-31"},now),true);
});
let queries: Record<string,unknown>[]=[];
mock.module("../src/lib/auth/staff.ts",{namedExports:{withStaff:(_permission:string,handler:unknown)=>handler,getStaffTenant:async()=>({id:"business-a",timezone})}});
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:{party:{findMany:async(query:Record<string,unknown>)=>{queries.push(query);return [{...event,eventType:{name:"Birthday Party",color:event.color}}];}},eventType:{findMany:async()=>[]}}}});
const {GET}=await import("../src/app/api/calendar/route");
test("calendar API uses business-scoped overlap windows and a minimal event response",async()=>{
 queries=[];
 const response=await GET(new Request("http://localhost/api/calendar?date=2027-03-14"));
 assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.timezone,timezone);assert.equal(body.weekStart,"2027-03-14");
 const where=queries[0].where as {tenantId:string;AND:{OR:{setupStartsAt?:{lt:Date};startTime?:{lt:Date}}[]}[];endTime:{gt:Date};status:{not:string};OR:unknown[]};
 assert.equal(where.tenantId,"business-a");assert.equal(where.status.not,"CANCELLED");
 assert.equal(where.endTime.gt.toISOString(),"2027-03-14T05:00:00.000Z");
 assert.equal(where.AND[0].OR[0].setupStartsAt!.lt.toISOString(),"2027-03-21T04:00:00.000Z");
 assert.equal((where.AND[0].OR[0].setupStartsAt!.lt.getTime()-where.endTime.gt.getTime())/3600000,167);
 assert.equal(queries[1].take,5);assert.equal((queries[1].where as {tenantId:string}).tenantId,"business-a");
 assert.equal(body.events[0].inviteToken,undefined);assert.equal(body.events[0].hostToken,undefined);assert.equal(body.events[0].payments,undefined);
});
test("calendar week across fall DST change spans 169 actual hours",async()=>{
 queries=[];await GET(new Request("http://localhost/api/calendar?date=2027-11-07"));
 const where=queries[0].where as {AND:{OR:{setupStartsAt:{lt:Date}}[]}[];endTime:{gt:Date}};
 assert.equal((where.AND[0].OR[0].setupStartsAt!.lt.getTime()-where.endTime.gt.getTime())/3600000,169);
});
test("invalid calendar date is rejected before querying bookings",async()=>{
 queries=[];assert.equal((await GET(new Request("http://localhost/api/calendar?date=2027-02-30"))).status,400);assert.equal(queries.length,0);
});

test("calendar shows setup separately and includes setup crossing a week boundary",()=>{
 const booking={...event,startTime:"2027-01-17T05:15Z",endTime:"2027-01-17T07:15Z",setupStartsAt:"2027-01-17T04:45Z"};
 const prior=segmentsForWeek([booking],"2027-01-10",timezone);assert.equal(prior.length,1);assert.equal(prior[0].phase,"SETUP");assert.equal(prior[0].day,"2027-01-16");
 const next=segmentsForWeek([booking],"2027-01-17",timezone);assert.equal(next.length,2);assert.notEqual(next[0].segmentId,next[1].segmentId);
});
