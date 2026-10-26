import assert from 'node:assert/strict';
import {beforeEach,mock,test} from 'node:test';
let ready=false,runs=0;
mock.module('../src/lib/communications/service.ts',{namedExports:{senderReady:()=>ready,processMessages:async()=>{runs++;return 3;}}});
const {GET}=await import('../src/app/api/jobs/communications/route');
beforeEach(()=>{ready=false;runs=0;process.env.CRON_SECRET='test-only-queue-secret-not-real';});
const request=(token?:string)=>new Request('https://example.invalid/api/jobs/communications',{headers:token?{authorization:token}:{}});
test('scheduled message processor refuses missing and mismatched authorization before processing',async()=>{for(const token of [undefined,'Bearer wrong','not-a-bearer'])assert.equal((await GET(request(token))).status,401);assert.equal(runs,0);delete process.env.CRON_SECRET;assert.equal((await GET(request('Bearer '))).status,401);});
test('authorized processor remains idle before email setup and processes only when configured',async()=>{const token='Bearer test-only-queue-secret-not-real';let response=await GET(request(token));assert.equal(response.status,200);assert.deepEqual(await response.json(),{processed:0,configured:false});assert.equal(runs,0);ready=true;response=await GET(request(token));assert.deepEqual(await response.json(),{processed:3});assert.equal(runs,1);});
