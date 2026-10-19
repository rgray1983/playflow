import assert from "node:assert/strict";
import {test} from "node:test";
import {addCheckoutSale,checkoutSummary} from "../src/lib/counter/basket";
import {paidCents,receiptHTML,type CounterReceipt} from "../src/lib/counter/receipt";
function child(id:string,name:string,price:number):CounterReceipt{return{id,kind:"ADMISSION",status:"OPEN",totalCents:price,createdAt:"2026-10-19T12:00:00Z",businessSnapshot:{name:"Venue",timezone:"America/New_York"},payments:[],quoteSnapshot:{currency:"USD",lines:[{id:"same-line-id",label:name,priceCents:price}],subtotalCents:price,taxCents:0,feeCents:0,totalCents:price,includedTaxCents:0,fees:[],profile:"admissions",taxRate:0,pricesIncludeTax:false}};}
test("selecting a second sibling adds rather than replaces the first, with no duplicate additions",()=>{
 const first=child("a","First Child",1200),second=child("b","Second Child",1000);
 let cart=addCheckoutSale([],first);cart=addCheckoutSale(cart,second);cart=addCheckoutSale(cart,first);
 assert.equal(cart.length,2);const summary=checkoutSummary(cart)!;assert.deepEqual(summary.quoteSnapshot.lines.map(l=>l.label),["First Child","Second Child"]);assert.equal(summary.totalCents,2200);assert.equal(new Set(summary.quoteSnapshot.lines.map(l=>l.id)).size,2);
 const removed=cart.filter(s=>s.id!==first.id);assert.equal(checkoutSummary(removed)!.totalCents,1000);assert.equal(checkoutSummary([]),null);
});
test("checkout totals preserve existing taxes, fees and partial payments without charging new fees",()=>{
 const first=child("a","First Child",1400),second=child("b","Second Child",1200);
 Object.assign(first.quoteSnapshot,{subtotalCents:1200,taxCents:100,feeCents:100});Object.assign(second.quoteSnapshot,{subtotalCents:1000,taxCents:100,feeCents:100});
 first.payments=[{id:"payment-1",amountCents:500,methodLabel:"Cash",collectedAt:first.createdAt,staffName:"Staff"}];
 const summary=checkoutSummary([first,second],"checkout-reference")!;assert.equal(summary.quoteSnapshot.subtotalCents,2200);assert.equal(summary.quoteSnapshot.taxCents,200);assert.equal(summary.quoteSnapshot.feeCents,200);assert.equal(summary.totalCents-paidCents(summary),2100);
 const html=receiptHTML(summary);assert(html.includes("First Child"));assert(html.includes("Second Child"));assert(html.includes("Bills: a, b"));assert(html.includes("$21.00"));
 assert.equal(addCheckoutSale([],{...first,status:"PAID"}).length,0);
});
