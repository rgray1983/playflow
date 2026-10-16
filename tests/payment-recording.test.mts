import assert from "node:assert/strict";
import { mock, test, beforeEach } from "node:test";
import { defaultCommerceSettings } from "../src/lib/commerce-settings";
import { paymentCents } from "../src/lib/payments/rules";
let party: Record<string, unknown>;
let payments: Record<string, unknown>[];
let timeline: Record<string, unknown>[];
let settings = structuredClone(defaultCommerceSettings);
let queue = Promise.resolve();
const tx = {
  $queryRaw: async () => [],
  party: {
    findMany: async () => party.status === "PENDING" && party.confirmationExpiresAt instanceof Date && party.confirmationExpiresAt.getTime() <= Date.now() ? [{id: "party"}] : [],
    findUnique: async ({where}: {where: {id: string; tenantId: string}}) => where.tenantId === "tenant" && where.id === "party" ? {...party} : null,
    update: async ({data}: {data: Record<string,unknown>}) => { Object.assign(party,data); return party; },
  },
  commerceSettings: {findUnique:async()=>settings},
  eventPayment: {
    findFirst:async({where}:{where:Record<string,unknown>})=>payments.find(p=>p.requestId===where.requestId),
    aggregate:async()=>({_sum:{amount:payments.filter(p=>p.purpose==="DEPOSIT").reduce((sum,p)=>sum+Number(p.amount),0)}}),
    create:async({data}:{data:Record<string,unknown>})=>{const payment={id:`payment-${payments.length+1}`,...data};payments.push(payment);return payment;},
  },
  eventTimelineItem:{create:async({data}:{data:Record<string,unknown>})=>{timeline.push(data);return data;}},
};
mock.module("../src/lib/prisma.ts",{namedExports:{prisma:{$transaction:async(callback:(tx:object)=>Promise<unknown>)=>{const previous=queue;let release!:()=>void;queue=new Promise<void>(resolve=>{release=resolve;});await previous;try{return await callback(tx);}finally{release();}}}}});
mock.module("../src/lib/auth/staff.ts",{namedExports:{withStaff:(_permission:string,handler:unknown)=>handler,getStaffContext:()=>({tenantId:"tenant",employeeId:"staff",name:"Test Cashier"})}});
const { POST } = await import("../src/app/api/events/[eventId]/payments/route");
beforeEach(()=>{party={id:"party",tenantId:"tenant",balanceDue:300,depositAmount:100,depositStatus:"PENDING",status:"CONFIRMED",confirmationExpiresAt:null};payments=[];timeline=[];settings=structuredClone(defaultCommerceSettings);});
const payload=(extra:object={})=>({requestId:"request-1234567890",amount:"100.00",method:"cash",purpose:"DEPOSIT",...extra});
const submit=(body:object,eventId="party")=>POST(new Request("http://localhost/api/events/party/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),{params:Promise.resolve({eventId})});
test("money accepts exact cents and rejects excessive precision, coercion and non-finite amounts",()=>{assert.equal(paymentCents("100.01"),10001);for(const value of [0,-1,"1.001","1e2",true,null,"NaN",Infinity])assert.throws(()=>paymentCents(value));});
test("deposit reduces balance, marks collected, and records cashier and payment type",async()=>{assert.equal((await submit(payload())).status,200);assert.equal(Number(party.balanceDue),200);assert.equal(party.depositStatus,"CASH_COLLECTED");assert.equal(payments[0].staffName,"Test Cashier");assert.equal(payments[0].purpose,"DEPOSIT");assert.equal(timeline.length,1);});
test("retry returns the same payment without changing balance or history",async()=>{const body=payload();const first=await(await submit(body)).json();const second=await(await submit(body)).json();assert.equal(first.paymentId,second.paymentId);assert.equal(second.replayed,true);assert.equal(payments.length,1);assert.equal(timeline.length,1);assert.equal(Number(party.balanceDue),200);assert.equal((await submit({...body,amount:"90"})).status,409);});
test("concurrent balance payments see updated balance and reject overpayment",async()=>{const responses=await Promise.all([submit(payload({amount:"200",purpose:"BALANCE",requestId:"concurrent-one-12345"})),submit(payload({amount:"200",purpose:"BALANCE",requestId:"concurrent-two-12345"}))]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(payments.length,1);assert.equal(Number(party.balanceDue),100);});
test("deposit and balance can be paid separately without subtracting the deposit twice",async()=>{await submit(payload());assert.equal((await submit(payload({amount:"200",purpose:"BALANCE",requestId:"balance-final-12345"}))).status,200);assert.equal(Number(party.balanceDue),0);assert.equal(payments.length,2);});
test("partial deposit remains pending until fully paid",async()=>{await submit(payload({amount:"40"}));assert.equal(party.depositStatus,"PENDING");await submit(payload({amount:"60",requestId:"remaining-deposit-123"}));assert.equal(party.depositStatus,"CASH_COLLECTED");assert.equal(Number(party.balanceDue),200);});
test("disabled methods, required notes, waived deposits, and partial-payment rules are enforced",async()=>{settings.paymentMethods[0].allowDeposits=false;assert.equal((await submit(payload())).status,400);settings.paymentMethods[0].allowDeposits=true;settings.paymentMethods[0].requiresNote=true;assert.equal((await submit(payload())).status,400);settings.paymentMethods[0].requiresNote=false;party.depositStatus="WAIVED";assert.equal((await submit(payload())).status,400);party.depositStatus="PENDING";settings.checkoutRules.allowPartialPayments=false;assert.equal((await submit(payload({amount:"50"}))).status,400);assert.equal(payments.length,0);});
test("deposit setting can keep deposit separate from the booking balance",async()=>{settings.depositRules.applyDepositToBalance=false;await submit(payload());assert.equal(Number(party.balanceDue),300);assert.equal(party.depositStatus,"CASH_COLLECTED");});
test("cancelled, expired and foreign bookings cannot receive payments",async()=>{party.status="CANCELLED";assert.equal((await submit(payload())).status,400);party.status="PENDING";party.confirmationExpiresAt=new Date("2020-01-01");assert.equal((await submit(payload())).status,409);assert.equal((await submit(payload(),"foreign")).status,404);assert.equal(payments.length,0);});

test("expiring a hold cancels it once and preserves its payment history",async()=>{
  await submit(payload());
  party.status="PENDING";party.confirmationExpiresAt=new Date("2020-01-01");
  const {POST:expire}=await import("../src/app/api/events/expire-pending-holds/route");
  assert.equal((await(await expire()).json()).expiredCount,1);
  assert.equal(party.status,"CANCELLED");assert.equal(payments.length,1);
  assert.equal((await(await expire()).json()).expiredCount,0);
  assert.equal(timeline.filter(t=>t.title==="Pending Hold Expired").length,1);
});
