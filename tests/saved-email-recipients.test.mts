import assert from "node:assert/strict";
import {beforeEach,test} from "node:test";
import {deliveryPolicy} from "../src/lib/communications/delivery-policy";
import {allowedBusinessRecipients,businessRecipientAllowed,savedRecipientQueueQuery} from "../src/lib/communications/recipients";
let lookups=0;
const contacts=new Map<string,Set<string>>();
const db:any={$queryRaw:async(query:any)=>{
  lookups++;
  const tenant=query.values.at(-1),emails=query.values.slice(0,-3);
  assert.deepEqual(query.values.slice(-3),[tenant,tenant,tenant]);
  return emails.filter((email:string)=>contacts.get(tenant)?.has(email)).map((email:string)=>({email}));
}};
beforeEach(()=>{lookups=0;contacts.clear();process.env.VERCEL_ENV="preview";delete process.env.PLAYFLOW_EMAIL_DELIVERY_MODE;delete process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS;delete process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE;});
test("saved-contact mode is explicit, stays in preview test mode and needs no address-by-address environment edits",async()=>{
 contacts.set("venue-a",new Set(["parent@example.invalid"]));assert.equal(await businessRecipientAllowed(db,"venue-a","parent@example.invalid"),false);assert.equal(lookups,0);
 for(const value of ["DATABASE","typo",""]){process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE=value;assert.equal(deliveryPolicy().savedRecipientsEnabled,false);}
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";process.env.PLAYFLOW_EMAIL_DELIVERY_MODE="live";assert.equal(deliveryPolicy().testMode,true);assert.equal(await businessRecipientAllowed(db,"venue-a"," PARENT@EXAMPLE.INVALID "),true);
});
test("an address in a different business never grants eligibility in the requesting business",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";contacts.set("venue-a",new Set(["parent-a@example.invalid"]));contacts.set("venue-b",new Set(["parent-b@example.invalid"]));
 assert.equal(await businessRecipientAllowed(db,"venue-a","parent-b@example.invalid"),false);assert.equal(await businessRecipientAllowed(db,"venue-b","parent-b@example.invalid"),true);assert.equal(await businessRecipientAllowed(db,"","parent-b@example.invalid"),false);
});
test("contact additions and removals take effect without a deployment or a persistent approval cache",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";contacts.set("venue-a",new Set());assert.equal(await businessRecipientAllowed(db,"venue-a","new@example.invalid"),false);
 contacts.get("venue-a")!.add("new@example.invalid");assert.equal(await businessRecipientAllowed(db,"venue-a","new@example.invalid"),true);contacts.get("venue-a")!.delete("new@example.invalid");assert.equal(await businessRecipientAllowed(db,"venue-a","new@example.invalid"),false);
});
test("a hundred parents are checked in one bounded lookup and duplicate/invalid input is excluded",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";const emails=Array.from({length:100},(_,i)=>`parent-${i}@example.invalid`);contacts.set("venue-a",new Set(emails));
 const allowed=await allowedBusinessRecipients(db,"venue-a",[...emails,...emails.map(x=>x.toUpperCase()),"broken","Name <person@example.invalid>"]);assert.equal(allowed.size,100);assert.equal(lookups,1);
});
test("explicit test inboxes still work and live mode does not require per-parent approval",async()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="owner@example.invalid";assert.equal(await businessRecipientAllowed(db,"venue-a","owner@example.invalid"),true);assert.equal(lookups,0);
 process.env.VERCEL_ENV="production";process.env.PLAYFLOW_EMAIL_DELIVERY_MODE="live";assert.equal(await businessRecipientAllowed(db,"venue-a","parent@example.invalid"),true);assert.equal(lookups,0);
});
test("saved-contact filters parameterize addresses and tenant scope before the queue batch limit",()=>{
 process.env.PLAYFLOW_EMAIL_TEST_RECIPIENT_MODE="database";process.env.PLAYFLOW_EMAIL_TEST_RECIPIENTS="owner@example.invalid";
 const q=savedRecipientQueueQuery("venue-a",new Date("2026-11-01T12:00:00Z"));assert.ok(q.values.includes("venue-a"));assert.ok(q.values.includes("owner@example.invalid"));assert.ok(!q.text.includes("owner@example.invalid"));assert.ok(!q.text.includes("venue-a"));assert.ok(q.text.indexOf("EXISTS")<q.text.indexOf("LIMIT 3"));
});
