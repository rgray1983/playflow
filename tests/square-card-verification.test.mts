import assert from "node:assert/strict";
import {test} from "node:test";
import {cardVerificationDetails,cardTokenError} from "../src/lib/payments/square/card-verification";
test("Square card verification includes the required billing contact object without invented buyer data",()=>{
 const details=cardVerificationDetails(1500,false);
 assert.deepEqual(details,{amount:"15.00",currencyCode:"USD",intent:"CHARGE",billingContact:{},customerInitiated:true,sellerKeyedIn:false});
});
test("staff-keyed and parent-entered cards have consistent initiator flags",()=>{
 assert.equal(cardVerificationDetails(1500,true).customerInitiated,false);
 assert.equal(cardVerificationDetails(1500,true).sellerKeyedIn,true);
 assert.equal(cardVerificationDetails(1500,false).customerInitiated,true);
});
test("failed tokenization reports safe SDK identifiers without exposing card values or tokens",()=>{
 assert.match(cardTokenError({status:"Invalid",errors:[{type:"INVALID_INPUT",field:"verificationDetails.billingContact"}]}),/INVALID_INPUT · verificationDetails.billingContact/);
 const error=cardTokenError({status:"Invalid",token:"source-token",errors:[{type:"4111111111111111",field:"111"}]});
 assert.ok(!error.includes("4111111111111111"));assert.ok(!error.includes("source-token"));assert.ok(!error.includes("111"));
 assert.match(error,/No payment was submitted/);
 assert.match(cardTokenError({status:"Cancel"}),/cancelled/);
});
