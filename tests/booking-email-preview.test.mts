import assert from 'node:assert/strict';
import {beforeEach,mock,test} from 'node:test';
let lastLookup:any,exists=true;
mock.module('../src/lib/auth/staff.ts',{namedExports:{getStaffContext:()=>({tenantId:'tenant'}),withStaff:(permission:string,handler:any)=>{assert.equal(permission,'settings.write');return handler;}}});
mock.module('../src/lib/prisma.ts',{namedExports:{prisma:{tenant:{findUniqueOrThrow:async(q:any)=>{assert.equal(q.where.id,'tenant');return {name:'This Venue',timezone:'America/New_York'};}},bookingMessage:{findFirst:async(q:any)=>{lastLookup=q;return exists?{presentation:null,body:'<script>private legacy text</script>'}:null;}}}}});
const {GET}=await import('../src/app/api/communications/preview/route');
beforeEach(()=>{lastLookup=null;exists=true;});
test('sample design previews use tenant branding and sandboxed no-store HTML',async()=>{
 const r=await GET(new Request('https://app.example.invalid/api/communications/preview?kind=HOLD'));
 assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy')!,/sandbox/);assert.equal(r.headers.get('cache-control'),'private, no-store');const html=await r.text();assert.match(html,/This Venue/);assert.match(html,/SAMPLE/);assert.ok(!html.includes('/private-host-page'));
});
test('saved previews scope private links by business and escape legacy plain text',async()=>{
 const r=await GET(new Request('https://app.example.invalid/api/communications/preview?id=message'));assert.deepEqual(lastLookup.where,{id:'message',tenantId:'tenant'});assert.match(await r.text(),/&lt;script&gt;/);exists=false;assert.equal((await GET(new Request('https://app.example.invalid/api/communications/preview?id=other'))).status,404);
});
test('unknown sample kinds are rejected',async()=>{assert.equal((await GET(new Request('https://app.example.invalid/api/communications/preview?kind=anything'))).status,400);});
