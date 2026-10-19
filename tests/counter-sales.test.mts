import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { defaultCommerceSettings, normalizeCommerceSettings } from "../src/lib/commerce-settings";
import { quoteCounter } from "../src/lib/counter/quote";
import { receiptHTML } from "../src/lib/counter/receipt";
import { receiptSelect } from "../src/lib/counter/select";
let catalog:any[];
let sales: any[], payments: any[], visits: any[], members: any[], plans: any[], settings: any, user: any, employee: any, failActivation = false;
const staff = { tenantId: "tenant", employeeId: "staff", name: "Test Staff" };
const tenant = { id: "tenant", name: "Test Venue", slug: "palmetto-playhouse", timezone: "America/New_York", phone: null, email: null, address1: null, city: null, state: null, zip: null };
const match = (v: any, w: any) => Object.entries(w).every(([key, value]: any) => value && typeof value === "object" && !(value instanceof Date) ? value.in ? value.in.includes(v[key]) : value.not ? v[key] !== value.not : true : v[key] === value);
const db: any = {
    $queryRaw: async () => [], tenant: { findUniqueOrThrow: async () => tenant },
    employee: { findUnique: async () => employee, findMany: async () => [] },
    family: { findFirst: async ({ where }: any) => where.id === "family" && where.tenantId === "tenant" ? { id: "family", status: "ACTIVE" } : null },
    child: { findFirst: async ({ where }: any) => where.id === "child" && where.familyId === "family" && where.tenantId === "tenant" ? { id: "child", active: true } : null },
    commerceSettings: { findUnique: async () => settings },
    counterProduct:{findFirst:async({where}:any)=>catalog.find(p=>match(p,where))??null,findMany:async({where}:any)=>catalog.filter(p=>match(p,where)),create:async({data}:any)=>{const row={createdAt:new Date(),updatedAt:new Date(),...data};catalog.push(row);return row;},update:async({where,data}:any)=>{const row=catalog.find(p=>match(p,where));if(!row)throw new Error("not found");Object.assign(row,data,{updatedAt:new Date()});return row;}},
    membershipPlan: { findFirst: async ({ where }: any) => plans.find(p => match(p, where)) ?? null, findMany: async () => plans },
    counterSale: { findFirst: async ({ where, include }: any) => { const s = sales.find(s => match(s, where)); return s ? { ...s, ...(include ? { payments: payments.filter(p => p.saleId === s.id), membership: members.find(m => m.id === s.membershipId) ?? null } : {}) } : null; }, findMany: async ({where}:any={}) => sales.filter(s=>!where||match(s,where)).map(s => ({ ...s, payments: payments.filter(p => p.saleId === s.id) })), create: async ({ data }: any) => { const s = { id: `sale-${sales.length}`, createdAt: new Date(), ...data }; sales.push(s); return s; }, update: async ({ where, data }: any) => { const s = sales.find(s => match(s, where)); Object.assign(s, data); return s; } },
    counterPayment: { findMany:async({where}:any)=>payments.filter(p=>match(p,where)), findFirst: async ({ where }: any) => payments.find(p => match(p, where)) ?? null, create: async ({ data }: any) => { const p = { id: `pay-${payments.length}`, collectedAt: new Date(), ...data }; payments.push(p); return p; } },
    visit: { findMany: async ({ where }: any) => visits.filter(v => match(v, where)), count: async ({ where }: any) => visits.filter(v => v.membershipId === where.membershipId && v.status !== "CANCELLED").length, updateMany: async ({ where, data }: any) => { let count = 0; visits.filter(v => match(v, where)).forEach(v => { Object.assign(v, data); count++; }); return { count }; } },
    membership: { create: async ({ data }: any) => { const m = { id: `member-${members.length}`, ...data }; members.push(m); return m; }, update: async ({ where, data }: any) => { if (failActivation)
            throw new Error("simulated write failure"); const m = members.find(m => match(m, where)); if (!m)
            throw new Error("membership not found"); Object.assign(m, data); return m; } },
};
let queue = Promise.resolve();
db.$transaction = async (callback: any) => { const old = queue; let release!: () => void; queue = new Promise<void>(resolve => release = resolve); await old; const snapshot = structuredClone({ sales, payments, visits, members }); try {
    return await callback(db);
}
catch (e) {
    ({ sales, payments, visits, members } = snapshot);
    throw e;
}
finally {
    release();
} };
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: db } });
mock.module("../src/lib/auth/server.ts", { namedExports: { getAuth: () => ({ getSession: async () => ({ data: user ? { user } : null, error: null }) }) } });
const { createProductSale, recordCheckoutPayment, billAdmissions, membershipQuote, enrollMembership, recordCounterPayment, voidCounterSale, memberEnd } = await import("../src/lib/counter/service");
const {productCartQuote,saveCounterProduct}=await import("../src/lib/counter/products");
const {GET:catalogGET,POST:catalogPOST}=await import("../src/app/api/counter/catalog/route");
const { membershipUse } = await import("../src/lib/visits/service");
const { GET, POST } = await import("../src/app/api/counter/route");
const bill = (extra: any = {}) => ({ familyId: "family", visitIds: ["visit"], requestId: "bill-request-123456789", ...extra });
const payment = (extra: any = {}) => ({ saleId: "sale-0", amountCents: 2000, method: "cash", requestId: "payment-request-123456789", collectedAcknowledged: true, ...extra });
const enrollment = (extra: any = {}) => ({ familyId: "family", planId: "plan", childId: null, requestId: "enroll-request-123456789", ...extra });
async function enroll(extra: any = {}) { const prepared = await membershipQuote(db, staff, enrollment(extra)); return db.$transaction((tx: any) => enrollMembership(tx, staff, enrollment({ ...extra, quoteHash: prepared.quoteHash }))); }
const transaction = (f: (tx: any) => Promise<any>) => db.$transaction(f);
const request = (body?: any, query = "") => new Request(`http://localhost/api/counter${query}`, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => {
    catalog=[{id:"water",tenantId:"tenant",name:"Bottled Water",category:"SNACK",priceCents:200,active:true,updatedBy:"staff",updatedAt:new Date("2026-10-19T12:00:00Z")},{id:"socks",tenantId:"tenant",name:"Grip Socks",category:"RETAIL",priceCents:400,active:true,updatedBy:"staff",updatedAt:new Date("2026-10-19T12:00:00Z")}];
    sales = [];
    payments = [];
    members = [];
    settings = structuredClone(defaultCommerceSettings);
    failActivation = false;
    visits = [{ id: "visit", tenantId: "tenant", familyId: "family", childId: "child", counterSaleId: null, membershipId: null, status: "CHECKED_OUT", checkedInAt: new Date(), visitType: "Open play", admissionSnapshot: { mode: "ADMISSION", name: "Open play", listedPrice: 20, waiver: { documentId: "original-proof" } }, child: { firstName: "Test", lastName: "Child" } }];
    plans = [{ id: "plan", tenantId: "tenant", name: "Five visits", active: true, price: 20, durationDays: 30, visitLimit: 5, billingInterval: "NONE", updatedAt: new Date("2026-10-01T00:00:00Z") }];
    user = { id: "user", email: "staff@example.invalid", emailVerified: true };
    employee = { id: "staff", tenantId: "tenant", authUserId: "user", firstName: "Test", lastName: "Staff", status: "ACTIVE", accessRole: "FRONT_DESK", accessApproved: true, staffRole: null };
});
test("group quote applies one flat fee, percentage and profile tax in cents", () => {
    settings.taxRules.enabled = true;
    settings.taxRules.defaultRate = 5;
    settings.taxRules.profiles.find((p: any) => p.key === "admissions").taxable = true;
    settings.taxRules.profiles.find((p: any) => p.key === "admissions").rate = 10;
    settings.feeRules = { enabled: true, fees: [{ id: "flat", label: "Flat", type: "flat", amount: 2, taxable: true, visibleToCustomer: false, enabled: true }, { id: "percent", label: "Service", type: "percent", amount: 5, taxable: false, visibleToCustomer: true, enabled: true }] };
    const quote = quoteCounter([{ id: "a", label: "A", priceCents: 2000 }, { id: "b", label: "B", priceCents: 1000 }], "admissions", settings);
    assert.equal(quote.subtotalCents, 3000);
    assert.equal(quote.feeCents, 350);
    assert.equal(quote.taxCents, 310);
    assert.equal(quote.totalCents, 3660);
    assert.equal(quote.fees.length, 2);
});
test("inclusive tax is disclosed without adding it again, including fees", () => {
    settings.taxRules.enabled = true;
    settings.taxRules.pricesIncludeTax = true;
    settings.taxRules.defaultRate = 10;
    Object.assign(settings.taxRules.profiles.find((p: any) => p.key === "admissions"), { taxable: true, rate: 10 });
    settings.feeRules = { enabled: true, fees: [{ id: "x", label: "Fee", type: "flat", amount: 11, taxable: true, enabled: true }] };
    const q = quoteCounter([{ id: "a", label: "A", priceCents: 1100 }], "admissions", settings);
    assert.equal(q.totalCents, 2200);
    assert.equal(q.taxCents, 0);
    assert.equal(q.includedTaxCents, 200);
});
test("tax exemption and disabled fees respected; invalid rates and overflow rejected", () => {
    settings.taxRules.enabled = true;
    settings.taxRules.defaultRate = 8;
    assert.equal(quoteCounter([{ id: "a", label: "A", priceCents: 100 }], "admissions", settings).taxCents, 0);
    Object.assign(settings.taxRules.profiles.find((p: any) => p.key === "admissions"), { taxable: true, rate: 101 });
    assert.throws(() => quoteCounter([{ id: "a", label: "A", priceCents: 100 }], "admissions", settings));
    assert.throws(() => quoteCounter([{ id: "a", label: "A", priceCents: 100000001 }], "admissions", settings));
});
test("bill links saved visit price, preserves waiver snapshot, and replays safely", async () => {
    const original = structuredClone(visits[0].admissionSnapshot);
    const a = await transaction(tx => billAdmissions(tx, staff, bill()));
    assert.equal(a.saleId, "sale-0");
    assert.equal(sales[0].totalCents, 2000);
    assert.equal(visits[0].counterSaleId, "sale-0");
    assert.deepEqual(visits[0].admissionSnapshot, original);
    assert.equal((await transaction(tx => billAdmissions(tx, staff, bill()))).replayed, true);
    assert.equal(sales.length, 1);
    await assert.rejects(transaction(tx => billAdmissions(tx, staff, bill({ visitIds: ["other"] }))), /different/);
    await assert.rejects(transaction(tx => billAdmissions(tx, staff, bill({ requestId: "new-bill-request-123456" }))), /already billed/);
});
test("tenant/family isolation and unsupported legacy prices cannot create bills", async () => {
    await assert.rejects(transaction(tx => billAdmissions(tx, { ...staff, tenantId: "foreign" }, bill())), /not found/);
    await assert.rejects(transaction(tx => billAdmissions(tx, staff, bill({ familyId: "foreign-family" }))), /not found/);
    visits[0].admissionSnapshot = null;
    await assert.rejects(transaction(tx => billAdmissions(tx, staff, bill())), /no supported/);
    assert.equal(sales.length, 0);
});
test("concurrent bills for same visit create only one charge", async () => {
    const result = await Promise.allSettled([transaction(tx => billAdmissions(tx, staff, bill())), transaction(tx => billAdmissions(tx, staff, bill({ requestId: "other-bill-request-123456" })))]);
    assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(sales.length, 1);
});
test("payment supports partials and exactly-once replay; changed retry rejected", async () => {
    await transaction(tx => billAdmissions(tx, staff, bill()));
    await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 500 })));
    assert.equal(sales[0].status, "OPEN");
    assert.equal((await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 500 })))).replayed, true);
    assert.equal(payments.length, 1);
    await assert.rejects(transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 600 }))), /different/);
    await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 1500, requestId: "second-payment-request-123456" })));
    assert.equal(sales[0].status, "PAID");
});
test("overpayments, disabled methods, note requirements and false collection rejected", async () => {
    await transaction(tx => billAdmissions(tx, staff, bill()));
    for (const [extra, pattern] of [[{ amountCents: 2001 }, /exceeds/], [{ collectedAcknowledged: false }, /already been collected/], [{ method: "other" }, /require a note/], [{ method: "square" }, /supported/], [{ amountCents: 1.5 }, /valid payment/]])
        await assert.rejects(transaction(tx => recordCounterPayment(tx, staff, payment(extra))), pattern as RegExp);
    settings.paymentMethods[0].enabled = false;
    await assert.rejects(transaction(tx => recordCounterPayment(tx, staff, payment())), /not enabled/);
    assert.equal(payments.length, 0);
});
test("partial and split settings enforced; concurrent full payments cannot overcollect", async () => {
    await transaction(tx => billAdmissions(tx, staff, bill()));
    settings.checkoutRules.allowPartialPayments = false;
    await assert.rejects(transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 100 }))), /Partial/);
    settings.checkoutRules.allowPartialPayments = true;
    await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 500 })));
    settings.checkoutRules.allowSplitPayments = false;
    await assert.rejects(transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 1500, method: "card", requestId: "second-payment-request-123456" }))), /split/);
    settings.checkoutRules.allowSplitPayments = true;
    const results = await Promise.allSettled([transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 1500, requestId: "parallel-payment-request-1" }))), transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 1500, requestId: "parallel-payment-request-2" })))]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(payments.reduce((s, p) => s + p.amountCents, 0), 2000);
});
test("unpaid bill void retains audit and releases visit; paid bill cannot be voided", async () => {
    await transaction(tx => billAdmissions(tx, staff, bill()));
    await transaction(tx => voidCounterSale(tx, staff, { saleId: "sale-0", reason: "Wrong grouping" }));
    assert.equal(sales[0].status, "VOID");
    assert.equal(visits[0].counterSaleId, null);
    assert.equal(sales[0].voidedBy, "Test Staff");
    await transaction(tx => billAdmissions(tx, staff, bill({ requestId: "replacement-request-123456" })));
    await transaction(tx => recordCounterPayment(tx, staff, payment({ saleId: "sale-1" })));
    await assert.rejects(transaction(tx => voidCounterSale(tx, staff, { saleId: "sale-1", reason: "No" })), /Only unpaid/);
});
test("membership quote stale price or ownership cannot enroll", async () => {
    const q = await membershipQuote(db, staff, enrollment());
    plans[0].price = 30;
    await assert.rejects(transaction(tx => enrollMembership(tx, staff, enrollment({ quoteHash: q.quoteHash }))), /changed/);
    await assert.rejects(enroll({ childId: "foreign-child" }), /active child/);
    assert.equal(members.length, 0);
});
test("membership pending until paid; activation uses saved dates and limits", async () => {
    await enroll();
    assert.equal(members[0].status, "PENDING");
    assert.equal(members[0].autoRenew, false);
    assert.equal(members[0].endsAt, null);
    await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 1000 })));
    assert.equal(members[0].status, "PENDING");
    plans[0].visitLimit = 999;
    plans[0].durationDays = 999;
    await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 1000, requestId: "member-second-payment-123456" })));
    assert.equal(members[0].status, "ACTIVE");
    assert.equal(members[0].termsSnapshot.visitLimit, 5);
    assert.equal(members[0].endsAt.getTime() - members[0].startsAt.getTime() >= 29 * 86400000, true);
    const use = await membershipUse(db, { ...members[0], membershipPlan: null }, "tenant", "family", "child");
    assert.equal(use.eligible, true);
    assert.equal(use.remaining, 5);
});
test("failed membership activation rolls payment and paid status back", async () => {
    await enroll();
    failActivation = true;
    await assert.rejects(transaction(tx => recordCounterPayment(tx, staff, payment())), /simulated/);
    assert.equal(payments.length, 0);
    assert.equal(sales[0].status, "OPEN");
    assert.equal(members[0].status, "PENDING");
});
test("zero-cost plan activates immediately; pending cancellation retains bill", async () => {
    plans[0].price = 0;
    await enroll();
    assert.equal(sales[0].status, "PAID");
    assert.equal(members[0].status, "ACTIVE");
    assert.equal(payments.length, 0);
    plans[0].price = 20;
    await enroll({ requestId: "second-enroll-request-123456" });
    await transaction(tx => voidCounterSale(tx, staff, { saleId: "sale-1", reason: "Parent changed mind" }));
    assert.equal(members[1].status, "CANCELLED");
});
test("calendar term handles DST and month end without guessed fixed months", () => {
    const terms: any = { version: 1, visitLimit: 5, durationDays: null, billingInterval: "MONTHLY", timezone: "America/New_York" };
    assert.equal(memberEnd(terms, new Date("2026-01-31T17:00:00Z"))?.toISOString(), "2026-02-28T17:00:00.000Z");
    assert.equal(memberEnd({ ...terms, durationDays: 1 }, new Date("2026-03-07T17:00:00Z"))?.toISOString(), "2026-03-08T16:00:00.000Z");
    assert.equal(memberEnd({ ...terms, billingInterval: "NONE" }, new Date()), null);
});
test("receipts escape all stored text, accurately show partial balance, omit secret metadata", async () => {
    await transaction(tx => billAdmissions(tx, staff, bill()));
    await transaction(tx => recordCounterPayment(tx, staff, payment({ amountCents: 500 })));
    const sale = { ...sales[0], payments };
    sale.businessSnapshot.name = '<script>alert("x")</script>';
    const html = receiptHTML(sale);
    assert(!html.includes('<script>'));
    assert(html.includes('&lt;script&gt;'));
    assert(html.includes('$15.00'));
    assert(html.includes('Bill / payment record'));
    const selection = JSON.stringify(receiptSelect);
    assert(!selection.includes('requestHash'));
    assert(!selection.includes('staffId'));
    assert(!selection.includes('notes'));
});
test("counter endpoints require approved payment staff, reject parent and party host", async () => {
    user = null;
    assert.equal((await GET(request(undefined, "?familyId=family"))).status, 401);
    user = { id: "user", email: "parent@example.invalid", emailVerified: true };
    employee = null;
    assert.equal((await POST(request({ action: "bill-admissions" }))).status, 403);
    employee = { id: "staff", tenantId: "tenant", authUserId: "user", firstName: "Test", lastName: "Staff", status: "ACTIVE", accessRole: "PARTY_HOST", accessApproved: true };
    assert.equal((await GET(request(undefined, "?familyId=family"))).status, 403);
    assert.equal(sales.length, 0);
});
test("staff API rejects cross-site posts and foreign family access", async () => {
    const cross = new Request("http://localhost/api/counter", { method: "POST", headers: { origin: "https://evil.invalid", "Content-Type": "application/json" }, body: JSON.stringify({ action: "bill-admissions", ...bill() }) });
    assert.equal((await POST(cross)).status, 403);
    assert.equal((await GET(request(undefined, "?familyId=foreign-family"))).status, 404);
    const result = await POST(request({ action: "bill-admissions", ...bill() }));
    assert.equal(result.status, 200);
    assert.equal(sales.length, 1);
});


async function twoBills(){
  await transaction(tx=>billAdmissions(tx,staff,bill()));
  visits.push({...structuredClone(visits[0]),id:"second-visit",childId:"second-child",counterSaleId:null,child:{firstName:"Second",lastName:"Child"}});
  await transaction(tx=>billAdmissions(tx,staff,bill({visitIds:["second-visit"],requestId:"second-bill-request-123456"})));
}
const checkout=(extra:any={})=>({familyId:"family",bills:[{id:"sale-0",dueCents:2000},{id:"sale-1",dueCents:2000}],amountCents:4000,method:"cash",notes:null,collectedAcknowledged:true,requestId:"checkout-request-123456",...extra});
test("one checkout pays both siblings, retains bill links and replays exactly once",async()=>{
  await twoBills();const result=await transaction(tx=>recordCheckoutPayment(tx,staff,checkout()));assert.equal(result.paymentIds.length,2);assert(sales.every(s=>s.status==="PAID"));assert.equal(payments.reduce((sum,p)=>sum+p.amountCents,0),4000);assert.deepEqual(payments.map(p=>p.saleId),["sale-0","sale-1"]);
  const replay=await transaction(tx=>recordCheckoutPayment(tx,staff,checkout()));assert.equal(replay.replayed,true);assert.equal(payments.length,2);
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout({amountCents:3000}))),/different details/);
});
test("checkout rejects stale balances and foreign families without collecting anything",async()=>{
  await twoBills();await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout({bills:[{id:"sale-0",dueCents:1000},{id:"sale-1",dueCents:2000}],amountCents:3000}))),/balance changed/);
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout({familyId:"foreign"}))),/not found/);
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,{...staff,tenantId:"other"},checkout())),/not found/);assert.equal(payments.length,0);
});
test("partial family checkout allocates once and keeps the remaining sibling balance",async()=>{
  await twoBills();await transaction(tx=>recordCheckoutPayment(tx,staff,checkout({amountCents:2500})));assert.equal(sales[0].status,"PAID");assert.equal(sales[1].status,"OPEN");assert.deepEqual(payments.map(p=>p.amountCents),[2000,500]);
  assert.equal((await transaction(tx=>recordCheckoutPayment(tx,staff,checkout({amountCents:2500})))).replayed,true);assert.equal(payments.length,2);
});
test("failure on second membership rolls back first sibling's payment too",async()=>{
  await transaction(tx=>billAdmissions(tx,staff,bill()));await enroll();failActivation=true;
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout())),/simulated write failure/);assert.equal(payments.length,0);assert(sales.every(s=>s.status==="OPEN"));assert.equal(members[0].status,"PENDING");
});
test("family checkout honors full-payment and required-note rules",async()=>{
  await twoBills();settings.checkoutRules.allowPartialPayments=false;
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout({amountCents:2500}))),/Partial payments/);
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout({method:"other"}))),/require a note/);assert.equal(payments.length,0);
  await transaction(tx=>recordCheckoutPayment(tx,staff,checkout()));assert(sales.every(s=>s.status==="PAID"));
});
test("concurrent multi-child payment attempts cannot overcollect",async()=>{
  await twoBills();const results=await Promise.allSettled([transaction(tx=>recordCheckoutPayment(tx,staff,checkout())),transaction(tx=>recordCheckoutPayment(tx,staff,checkout({requestId:"other-checkout-request-123456"})))]);assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(payments.reduce((sum,p)=>sum+p.amountCents,0),4000);
});
test("checkout API returns all sibling receipts and rejects duplicate bill selections",async()=>{
  await twoBills();const response=await POST(request({action:"checkout-payment",...checkout()}));assert.equal(response.status,200);const result=await response.json();assert.equal(result.receipts.length,2);assert(result.receipts.every((s:any)=>s.status==="PAID"));
  await assert.rejects(transaction(tx=>recordCheckoutPayment(tx,staff,checkout({bills:[{id:"sale-0",dueCents:2000},{id:"sale-0",dueCents:2000}]}))),/each bill only once/);
});


const productCart=(extra:any={})=>({products:[{productId:"water",quantity:2}],custom:[],...extra});
async function saveCart(extra:any={}){const input=productCart(extra),prepared=await productCartQuote(db,staff,input);return transaction(tx=>createProductSale(tx,staff,{...input,familyId:"family",requestId:"retail-cart-request-123456",quoteHash:prepared.quoteHash}));}
test("snack quantities use server prices and save one replay-safe retail bill",async()=>{
 const input=productCart({products:[{productId:"water",quantity:2,priceCents:1}]});const prepared=await productCartQuote(db,staff,input);assert.equal(prepared.quote.totalCents,400);
 const body={...input,familyId:"family",requestId:"retail-cart-request-123456",quoteHash:prepared.quoteHash};await transaction(tx=>createProductSale(tx,staff,body));assert.equal(sales[0].kind,"RETAIL");assert.equal(sales[0].totalCents,400);assert.equal(sales[0].quoteSnapshot.lines[0].label,"2 × Bottled Water");assert.equal((await transaction(tx=>createProductSale(tx,staff,body))).replayed,true);assert.equal(sales.length,1);
});
test("custom charges and retail use their configured tax categories with fees once",async()=>{
 settings.taxRules.enabled=true;settings.taxRules.defaultRate=5;Object.assign(settings.taxRules.profiles.find((p:any)=>p.key==="retail"),{taxable:true,rate:5});Object.assign(settings.taxRules.profiles.find((p:any)=>p.key==="admissions"),{taxable:true,rate:10});settings.feeRules={enabled:true,fees:[{id:"fee",label:"Fee",type:"flat",amount:2,taxable:true,enabled:true}]};
 const prepared=await productCartQuote(db,staff,productCart({products:[{productId:"water",quantity:2},{productId:"socks",quantity:1}],custom:[{id:"custom-a",name:"Service",amountCents:1000,quantity:1,profile:"services"},{id:"custom-b",name:"Admission",amountCents:1200,quantity:1,profile:"admissions"}]}));assert.equal(prepared.quote.subtotalCents,3000);assert.equal(prepared.quote.feeCents,200);assert.equal(prepared.quote.taxCents,170);assert.equal(prepared.quote.totalCents,3370);
});
test("stale prices, inactive/foreign products and invalid custom charges cannot save sales",async()=>{
 const prepared=await productCartQuote(db,staff,productCart());catalog[0].priceCents=250;await assert.rejects(transaction(tx=>createProductSale(tx,staff,{...productCart(),familyId:"family",requestId:"retail-cart-request-123456",quoteHash:prepared.quoteHash})),/changed/);
 catalog[0].active=false;await assert.rejects(productCartQuote(db,staff,productCart()),/unavailable/);catalog[0].active=true;
 await assert.rejects(productCartQuote(db,{...staff,tenantId:"foreign"},productCart()),/unavailable/);
 for(const extra of [{products:[{productId:"water",quantity:0}]},{products:[{productId:"water",quantity:100}]},{products:[],custom:[{id:"x",name:"Bad",quantity:1,amountCents:-100,profile:"retail"}]},{products:[],custom:[{id:"x",name:"Bad",quantity:1,amountCents:100,profile:"anything"}]}])await assert.rejects(productCartQuote(db,staff,productCart(extra)));
 assert.equal(sales.length,0);
});
test("retail and sibling admission bills can be paid together without altering visit evidence",async()=>{
 await twoBills();await saveCart();const response=await POST(request({action:"checkout-payment",...checkout({bills:[{id:"sale-0",dueCents:2000},{id:"sale-1",dueCents:2000},{id:"sale-2",dueCents:400}],amountCents:4400})}));assert.equal(response.status,200);assert(sales.every(s=>s.status==="PAID"));assert.equal(payments.reduce((s,p)=>s+p.amountCents,0),4400);assert.equal(visits[0].admissionSnapshot.waiver.documentId,"original-proof");
});
test("custom-only and zero-total product sales create correct bill kinds without fictitious payments",async()=>{
 await saveCart({products:[],custom:[{id:"custom-1",name:"Custom service",amountCents:500,quantity:1,profile:"services"}]});assert.equal(sales[0].kind,"CUSTOM");
 catalog[0].priceCents=0;const prepared=await productCartQuote(db,staff,productCart());await transaction(tx=>createProductSale(tx,staff,{...productCart(),familyId:"family",requestId:"zero-price-cart-request-123456",quoteHash:prepared.quoteHash}));assert.equal(sales[1].status,"PAID");assert.equal(payments.length,0);
});
test("catalog writes require a manager and retain products through disabling",async()=>{
 assert.equal((await catalogPOST(request({name:"New",priceCents:100,category:"SNACK",active:true,requestId:"new-product-request-123456"}))).status,403);
 employee.accessRole="OWNER";const response=await catalogPOST(request({name:"New",priceCents:100,category:"SNACK",active:true,requestId:"new-product-request-123456"}));assert.equal(response.status,200);assert.equal(catalog.length,3);
 const product=catalog[0];await transaction(tx=>saveCounterProduct(tx,staff,{id:product.id,updatedAt:product.updatedAt.toISOString(),name:product.name,priceCents:200,category:"SNACK",active:false}));assert.equal(catalog.length,3);assert.equal(catalog[0].active,false);
 const view=await catalogGET();assert.equal(view.status,200);assert.equal((await view.json()).canManage,true);
 await assert.rejects(transaction(tx=>saveCounterProduct(tx,staff,{id:product.id,updatedAt:"stale",name:product.name,priceCents:300,category:"SNACK",active:true})),/changed/);
});
