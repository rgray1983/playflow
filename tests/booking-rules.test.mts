import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingTime, quoteBooking, normalizePhone, BookingError } from "../src/lib/booking/rules";
import { bookingOptions, saveCustomer } from "../src/lib/booking/service";
import { defaultCommerceSettings } from "../src/lib/commerce-settings";
import type { Prisma } from "../src/generated/prisma/client";

test("booking times use venue timezone across winter and summer", () => {
  assert.equal(bookingTime("2027-01-10", "12:00", "America/New_York", 90).startTime.toISOString(), "2027-01-10T17:00:00.000Z");
  assert.equal(bookingTime("2027-07-10", "12:00", "America/New_York", 90).endTime.toISOString(), "2027-07-10T17:30:00.000Z");
});
test("invalid dates and DST gaps and ambiguities are rejected", () => {
  for (const [day, time] of [["2027-02-30", "12:00"], ["2027-03-14", "02:30"], ["2027-11-07", "01:30"], ["yesterday", "12:00"], ["2027-01-10", "25:00"]]) assert.throws(() => bookingTime(day, time, "America/New_York", 120), BookingError);
});
test("quote uses stored amounts, keeps unpaid balance intact, caps deposit", () => {
  const quote = quoteBooking({ name: "Party", price: "300.10", depositAmount: "500" }, [{id:"a", name:"Pizza", price:"25.20"}], null);
  assert.equal(quote.total, 325.30); assert.equal(quote.balanceDue,325.30); assert.equal(quote.depositDue,325.30);
  assert.equal(quoteBooking({name:"Party",price:300,depositAmount:100},[],null,true).depositDue,0);
});
test("quote includes configured taxes, fees and default percentage deposit", () => {
  const rules = structuredClone(defaultCommerceSettings);
  rules.taxRules.enabled=true; rules.taxRules.profiles=[{key:"party_packages",label:"Packages",taxable:true,rate:10}];
  rules.feeRules.enabled=true; rules.feeRules.fees=[{id:"f",label:"Cleaning",type:"flat",amount:20,taxable:false,enabled:true,visibleToCustomer:true}];
  rules.depositRules.defaultType="percent"; rules.depositRules.percentAmount=50;
  const quote=quoteBooking({name:"Party",price:100,depositAmount:null},[],rules);
  assert.equal(quote.total,130); assert.equal(quote.tax,10); assert.equal(quote.depositDue,65);
  rules.taxRules.pricesIncludeTax=true;
  assert.equal(quoteBooking({name:"Party",price:110,depositAmount:0},[],rules).total,130);
});
test("phone matching tolerates common US formatting", () => { assert.equal(normalizePhone("+1 (803) 555-0100"),"8035550100"); });

function database(parties: object[] = [], parents: object[] = [], missingPackage = false) {
  return {
    eventType:{findFirst:async()=>({id:"type"})},
    package:{findFirst:async()=>missingPackage ? null : ({id:"pkg",eventTypeId:"type",name:"Party",price:300,depositAmount:100,durationMinutes:120})},
    partyAddOn:{findMany:async()=>[]}, commerceSettings:{findUnique:async()=>null},
    party:{findMany:async()=>parties}, parent:{findMany:async()=>parents,create:async({data}:{data:object})=>({id:"new-parent",...data})}, family:{create:async()=>({id:"new-family"})},
  } as unknown as Prisma.TransactionClient;
}
const tenant={id:"tenant",timezone:"America/New_York",bookingSettings:{startTimes:["09:00","12:00"],bufferMinutes:30,daysOfWeek:[1,2,3,4,5,6,7]}};
const input={eventTypeId:"type",packageId:"pkg",addOnIds:[],eventDate:"2027-01-10"};
test("availability blocks overlap and turnaround, releases expired holds",async()=>{
  const reservation={startTime:new Date("2027-01-10T16:15:00Z"),endTime:new Date("2027-01-10T18:45:00Z"),status:"CONFIRMED",confirmationExpiresAt:null};
  assert.deepEqual((await bookingOptions(database([reservation]),tenant,input)).slots.map(s=>s.available),[false,false]);
  assert.deepEqual((await bookingOptions(database([{...reservation,status:"PENDING",confirmationExpiresAt:new Date("2020-01-01")}]),tenant,input)).slots.map(s=>s.available),[true,true]);
});
test("booking refuses inactive or foreign package combinations and duplicate add-ons",async()=>{
  const db=database([], [], true);
  await assert.rejects(bookingOptions(db,tenant,input),BookingError);
  await assert.rejects(bookingOptions(database(),tenant,{...input,addOnIds:["a","a"]}),BookingError);
});
test("customer records are linked, reused only for matching contact and name, and ambiguity is rejected",async()=>{
 const customer={firstName:"Test",lastName:"Parent",email:"test@example.invalid",phone:"8035550100"};
 const existing={id:"parent",familyId:"family",email:customer.email,phone:null};
 assert.equal((await saveCustomer(database([], [existing]),tenant.id,customer)).id,"parent");
 assert.equal((await saveCustomer(database(),tenant.id,customer)).familyId,"new-family");
 await assert.rejects(saveCustomer(database([], [existing,{...existing,id:"second"}]),tenant.id,customer),BookingError);
});

test("confirmation and restore reject expired holds and live conflicts", async () => {
  const { assertReservation } = await import("../src/lib/booking/service");
  const party = { id:"p",tenantId:"tenant",startTime:new Date("2027-01-10T17:00Z"),endTime:new Date("2027-01-10T19:00Z"),confirmationExpiresAt:new Date("2020-01-01"),confirmedAt:null };
  const db = { tenant:{findUniqueOrThrow:async()=>tenant},party:{findFirst:async()=>({id:"conflict"})} } as unknown as Prisma.TransactionClient;
  await assert.rejects(assertReservation(db,party), (error: unknown) => error instanceof BookingError && error.status === 410);
  await assert.rejects(assertReservation(db,{...party,confirmationExpiresAt:null}), (error: unknown) => error instanceof BookingError && error.status === 409);
});
test("extra-time add-ons extend actual reserved time", async () => {
  const db = database();
  Object.assign(db.partyAddOn, { findMany: async () => [{id:"extra",name:"Extra time",price:50,durationMinutes:30}] });
  const result = await bookingOptions(db,tenant,{...input,addOnIds:["extra"]});
  assert.equal(result.slots[0].endTime.getTime() - result.slots[0].startTime.getTime(),150 * 60000);
  assert.equal(result.quote.total,350);
});
