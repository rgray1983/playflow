import assert from "node:assert/strict";
import {beforeEach,mock,test} from "node:test";
import {createHmac} from "node:crypto";
import {PaymentError} from "../src/lib/payments/rules";
import {encrypt,decrypt,validSignature} from "../src/lib/payments/square/crypto";
process.env.PAYMENT_TOKEN_ENCRYPTION_KEY="12".repeat(32);
let intents:any[],writes:number,validations:number,ledgerFailure:boolean,networkFailure:boolean,decline:boolean,ready:boolean,paymentStatus:string,queued=Promise.resolve();
const connection={id:"connection-1",tenantId:"tenant-1",mode:"sandbox",locationId:"location-1",merchantId:"merchant-1"};
const actor={tenantId:"tenant-1",employeeId:"employee-1",name:"Test Cashier"};
const matches=(i:any,w:any)=>!w||Object.entries(w).every(([k,v]:any)=>k==="tenantId_requestId"?i.tenantId===v.tenantId&&i.requestId===v.requestId:k==="status"&&typeof v==="object"?i.status!==v.not:i[k]===v);
const tx:any={
 $queryRaw:async(query:any)=>query.strings.join("").includes('"ProviderCheckout"')?intents.filter(i=>i.status==="PENDING"||i.status==="REVIEW").filter(i=>!query.values.includes(i.id)).map(i=>({id:i.id})):[],
 providerCheckout:{findUnique:async({where}:any)=>intents.find(i=>matches(i,where))??null,findUniqueOrThrow:async({where}:any)=>{const found=intents.find(i=>matches(i,where));if(!found)throw new Error("Missing");return {...found};},create:async({data}:any)=>{const intent={id:`intent-${intents.length+1}`,status:"PENDING",providerPaymentId:null,receiptUrl:null,...data};intents.push(intent);return {...intent};},update:async({where,data}:any)=>{const i=intents.find(i=>matches(i,where));Object.assign(i,data);return {...i};},updateMany:async({where,data}:any)=>{const found=intents.filter(i=>matches(i,where));found.forEach(i=>Object.assign(i,data));return{count:found.length};}},
 paymentConnection:{findUniqueOrThrow:async()=>connection},
};
const prisma={...tx,$transaction:async(callback:any)=>{const before=queued;let release!:()=>void;queued=new Promise<void>(r=>release=r);await before;try{return await callback(tx);}finally{release();}}};
class FakeSquareError extends PaymentError{constructor(public code:string){super(code);}}
let charged=new Map<string,any>();
mock.module("../src/lib/prisma.ts",{namedExports:{prisma}});
const apply=async(_tx:any,_actor:any,_input:any,execution:any)=>{if(execution?.validateOnly){validations++;return{};}if(ledgerFailure)throw new PaymentError("Hold expired",409);writes++;return{paymentId:"ledger-1"};};
mock.module("../src/lib/counter/service.ts",{namedExports:{recordCheckoutPayment:apply}});
mock.module("../src/lib/payments/party.ts",{namedExports:{recordPartyPayment:async(tx:any,actor:any,_id:any,input:any,execution:any)=>apply(tx,actor,input,execution)}});
mock.module("../src/lib/payments/square/client.ts",{namedExports:{SquareError:FakeSquareError,squareMode:(mode:string)=>mode,accessToken:async()=>"test-token",publicConnection:async()=>({ready,mode:"sandbox",locationId:"location-1"}),squareRequest:async(_mode:any,path:string,_token:any,body:any)=>{
 if(decline)throw new FakeSquareError("CARD_DECLINED");
 if(!body)return{payment:charged.get(path.split("/").at(-1)!)};
 let p=charged.get(body.idempotency_key);if(!p){p={id:"square-1",status:paymentStatus,reference_id:body.reference_id,location_id:body.location_id,amount_money:body.amount_money,receipt_url:"https://squareup.com/receipt/example"};charged.set(body.idempotency_key,p);charged.set(p.id,p);}
 if(networkFailure)throw new Error("Timed out after Square received request");return{payment:p};
}}});
const {parsePayload,prepareCheckout,processCheckout,settleCheckout,verifyPayment,publicCheckout}=await import("../src/lib/payments/square/checkout");
const body=(extra:any={})=>({mode:"sandbox",locationId:"location-1",kind:"counter",familyId:"family-1",bills:[{id:"bill-1",dueCents:1000}],amountCents:1000,requestId:"request-00000000001",sourceToken:"cnon:test-secure-token",...extra});
beforeEach(()=>{intents=[];writes=0;validations=0;ledgerFailure=false;networkFailure=false;decline=false;ready=true;paymentStatus="COMPLETED";charged=new Map();});
test("payment token encryption is randomized, reversible and tamper evident",()=>{const a=encrypt("secret-token"),b=encrypt("secret-token");assert.notEqual(a,b);assert.equal(decrypt(a),"secret-token");assert.ok(!a.includes("secret-token"));const parts=a.split(".");parts[2]=Buffer.from("tampered").toString("base64url");assert.throws(()=>decrypt(parts.join(".")));});
test("Square webhook signatures cover the exact public notification URL and raw body",()=>{const key="key",url="https://example.invalid/api/payments/square/webhook?mode=sandbox",body='{"ok":true}',sig=createHmac("sha256",key).update(url+body).digest("base64");assert.equal(validSignature(key,url,body,sig),true);assert.equal(validSignature(key,url,body+" ",sig),false);assert.equal(validSignature(key,url.replace("sandbox","live"),body,sig),false);assert.equal(validSignature(key,url,body,"bad"),false);});
test("checkout validates integer cents, duplicate bills and allowed contexts",()=>{for(const extra of [{amountCents:1.1},{amountCents:0},{amountCents:Infinity},{amountCents:100000001},{bills:[{id:"bill-1",dueCents:1},{id:"bill-1",dueCents:1}]},{kind:"invented"},{bills:[]}])assert.throws(()=>parsePayload(body(extra)));assert.deepEqual(parsePayload(body({kind:"party",partyId:"party-1",purpose:"DEPOSIT"})),{kind:"party",partyId:"party-1",purpose:"DEPOSIT",amountCents:1000});});
test("prepare validates domain rules before persisting an encrypted payment attempt",async()=>{const i=await prepareCheckout(actor,body());assert.equal(validations,1);assert.equal(writes,0);assert.equal(i.status,"PENDING");assert.equal(decrypt(i.sourceToken!),"cnon:test-secure-token");assert.deepEqual(i.targetKeys,["sale:bill-1"]);assert.ok(!JSON.stringify(publicCheckout(i)).includes("cnon"));});
test("unconfigured Square never creates an attempt or ledger entry",async()=>{ready=false;await assert.rejects(prepareCheckout(actor,body()));assert.equal(intents.length,0);assert.equal(writes,0);});
test("retrying a checkout reuses its original attempt and rejects changed amounts",async()=>{const first=await prepareCheckout(actor,body());const retry=await prepareCheckout(actor,body({sourceToken:"different-secure-token"}));assert.equal(first.id,retry.id);assert.equal(intents.length,1);await assert.rejects(prepareCheckout(actor,body({amountCents:900})));});
test("completed Square payment posts the ledger once and clears stored token",async()=>{const i=await prepareCheckout(actor,body());const paid=await processCheckout(i.id);assert.equal(paid.status,"PAID");assert.equal(writes,1);assert.equal(paid.providerPaymentId,"square-1");assert.equal(paid.sourceToken,null);await processCheckout(i.id);assert.equal(writes,1);});
test("timeout after charging keeps the same attempt and safely recovers without another charge",async()=>{const i=await prepareCheckout(actor,body());networkFailure=true;await assert.rejects(processCheckout(i.id));assert.equal(intents[0].status,"PENDING");assert.equal(writes,0);networkFailure=false;assert.equal((await processCheckout(i.id)).status,"PAID");assert.equal(new Set([...charged.values()].map(p=>p.id)).size,1);assert.equal(writes,1);});
test("concurrent retry and webhook settlement cannot post duplicate ledger payments",async()=>{const i=await prepareCheckout(actor,body());await Promise.all([processCheckout(i.id),processCheckout(i.id)]);assert.equal(writes,1);assert.equal(intents[0].status,"PAID");});
test("approved but incomplete payment does not post any ledger entry",async()=>{paymentStatus="APPROVED";const i=await prepareCheckout(actor,body());assert.equal((await processCheckout(i.id)).status,"PENDING");assert.equal(writes,0);});
test("definitive decline clears token and releases the attempt without recording money",async()=>{decline=true;const i=await prepareCheckout(actor,body());const result=await processCheckout(i.id);assert.equal(result.status,"FAILED");assert.equal(result.sourceToken,null);assert.equal(writes,0);});
test("funds received after business rules change are retained for review, never charged again",async()=>{const i=await prepareCheckout(actor,body());ledgerFailure=true;const review=await processCheckout(i.id);assert.equal(review.status,"REVIEW");assert.equal(review.providerPaymentId,"square-1");assert.equal(review.sourceToken,null);assert.equal(writes,0);await processCheckout(i.id);assert.equal(writes,0);});
test("wrong currency, amount, location, reference and refunded funds cannot settle a bill",()=>{const i={id:"intent-1",amountCents:1000},payment={id:"p",status:"COMPLETED",reference_id:i.id,location_id:"l",amount_money:{amount:1000,currency:"USD"}};assert.equal(verifyPayment(payment,i,"l"),true);for(const patch of [{reference_id:"other"},{location_id:"other"},{amount_money:{amount:999,currency:"USD"}},{amount_money:{amount:1000,currency:"CAD"}},{refunded_money:{amount:1}}])assert.throws(()=>verifyPayment({...payment,...patch},i,"l"));});
test("a second attempt cannot reserve an already pending target",async()=>{await prepareCheckout(actor,body());await assert.rejects(prepareCheckout(actor,body({requestId:"request-second-0000001"})));assert.equal(intents.length,1);});

test("a stale Square environment or location is rejected before reserving or charging",async()=>{
 await assert.rejects(prepareCheckout(actor,body({mode:"live"})));await assert.rejects(prepareCheckout(actor,body({locationId:"other-location"})));assert.equal(intents.length,0);assert.equal(writes,0);
});
