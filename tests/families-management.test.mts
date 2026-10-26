import assert from 'node:assert/strict';
import {beforeEach,mock,test} from 'node:test';
import {randomUUID,createHash} from 'node:crypto';
import {manageFamily} from '../src/lib/families/management';
import {archiveBlockers,blockerDefinitions} from '../src/lib/families/lifecycle';
import {staffFamilyHistory} from '../src/lib/families/history';
let family:any,parents:any[],changes:any[],counts:Record<string,number>,failAudit:boolean,actor:any,lastQuery:any;
const stamp=new Date('2026-01-01');
const owner={tenantId:'tenant',employeeId:'owner',name:'Manager',accessRole:'MANAGER'};
const matches=(row:any,where:any)=>Object.entries(where).every(([k,v])=>row[k]===v);
const db:any={
 $queryRaw:async(sql:any)=>sql.text.includes('AS visits')?[counts]:[],
 family:{findFirst:async(q:any)=>{lastQuery=q;return matches(family,q.where)?{...family}:null;},update:async({data}:any)=>Object.assign(family,data,{updatedAt:new Date(family.updatedAt.getTime()+1000)})},
 parent:{findFirst:async({where}:any)=>parents.find(p=>Object.entries(where).every(([k,v]:any)=>k==='email'&&typeof v==='object'?p.email?.toLowerCase()===v.equals.toLowerCase():p[k]===v))??null,create:async({data}:any)=>{const p={id:'new-parent',updatedAt:stamp,authUserId:null,...data};parents.push(p);return p;},update:async({where,data}:any)=>{const p=parents.find(p=>matches(p,where));Object.assign(p,data,{updatedAt:new Date(p.updatedAt.getTime()+1000)});return p;},updateMany:async({where,data}:any)=>{parents.filter(p=>matches(p,where)).forEach(p=>Object.assign(p,data));return{count:parents.length};}},
 tenant:{findUniqueOrThrow:async()=>({slug:'playhouse'})},
 familyChange:{findUnique:async({where}:any)=>changes.find(c=>matches(c,where.tenantId_requestId)),create:async({data}:any)=>{if(failAudit)throw Error('audit failure');changes.push(data);return data;}},
};
let queue=Promise.resolve();db.$transaction=async(callback:any)=>{let release!:()=>void;const previous=queue;queue=new Promise<void>(r=>{release=r;});await previous;const snapshot=structuredClone({family,parents,changes});try{return await callback(db);}catch(e){({family,parents,changes}=snapshot);throw e;}finally{release();}};
mock.module('../src/lib/prisma.ts',{namedExports:{prisma:db}});
mock.module('../src/lib/auth/staff.ts',{namedExports:{withStaff:(_permission:string,handler:unknown)=>handler,getStaffContext:()=>actor}});
const {POST}=await import('../src/app/api/families/[familyId]/manage/route');
const body=(action='archive',extra:any={})=>({action,requestId:randomUUID(),updatedAt:family.updatedAt.toISOString(),reason:'Test cleanup',confirmFamilyName:'Family',...extra});
const save=(b:any)=>db.$transaction((tx:any)=>manageFamily(tx,actor,'family',b));
const rejected=(p:Promise<unknown>,status:number)=>assert.rejects(p,(e:any)=>e.status===status);
const portal=(extra:any={})=>({action:'portal-link',requestId:randomUUID(),updatedAt:parents[0].updatedAt.toISOString(),parentId:'parent',confirmEmail:'parent@example.invalid',confirmAccess:true,...extra});
beforeEach(()=>{actor={...owner};family={id:'family',tenantId:'tenant',status:'ACTIVE',name:'Family',updatedAt:stamp};parents=[{id:'parent',tenantId:'tenant',familyId:'family',authUserId:null,email:'parent@example.invalid',firstName:'Parent',lastName:'One',updatedAt:stamp,familyClaimHash:'old-link',familyClaimExpiresAt:stamp},{id:'linked',tenantId:'tenant',familyId:'family',authUserId:'auth-original',email:'linked@example.invalid',updatedAt:stamp}];changes=[];counts={};failAudit=false;lastQuery=null;queue=Promise.resolve();});
test('only managers manage lifecycle, guardians or portal access, with explicit confirmation and scoped records',async()=>{
 actor={...owner,accessRole:'FRONT_DESK'};await rejected(save(body()),403);actor={...owner,tenantId:'foreign'};await rejected(save(body()),404);actor=owner;
 await rejected(save(body('archive',{confirmFamilyName:'Wrong'})),400);await rejected(save(body('archive',{reason:''})),400);await rejected(save(body('archive',{authUserId:'intruder'})),400);assert.equal(family.status,'ACTIVE');assert.equal(changes.length,0);
});
test('each archive blocker refuses the status change; the final write rechecks the latest activity',async()=>{
 for(const [key] of blockerDefinitions){counts={[key]:1};const preview=await archiveBlockers(db,'tenant','family');assert.equal(preview[0].key,key);await rejected(save(body()),409);assert.equal(family.status,'ACTIVE');assert.equal(changes.length,0);}
 counts={};assert.deepEqual(await archiveBlockers(db,'tenant','family'),[]);counts={checkouts:1};await rejected(save(body()),409);
});
test('archive/restore preserves family, child and linked auth identities; old claims stay invalid',async()=>{
 const original=body();await save(original);assert.equal(family.status,'ARCHIVED');assert.equal(parents[0].familyClaimHash,null);assert.equal(parents[1].authUserId,'auth-original');assert.equal(changes[0].reason,'Test cleanup');assert.equal(changes[0].actorId,'owner');assert.equal((await save(original)).replayed,true);assert.equal(changes.length,1);
 await save(body('restore'));assert.equal(family.id,'family');assert.equal(family.status,'ACTIVE');assert.equal(parents[1].authUserId,'auth-original');assert.equal(parents[0].familyClaimHash,null);assert.deepEqual(changes.map(c=>c.action),['archive','restore']);
});
test('concurrent requests serialize: retries replay once and stale status changes cannot undo a newer decision',async()=>{
 const b=body();const results=await Promise.all([save(b),save(b)]);assert.equal(changes.length,1);assert.equal(results.filter((r:any)=>r.replayed).length,1);
 const restore=body('restore');await save(restore);await rejected(save({...b,requestId:randomUUID()}),409);await rejected(save({...restore,reason:'changed'}),409);assert.equal(family.status,'ACTIVE');
});
test('audit failure rolls the real management route transaction back, including claim invalidation',async()=>{
 failAudit=true;const req=new Request('http://localhost/api/families/family/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body())});
 await assert.rejects(POST(req,{params:Promise.resolve({familyId:'family'})}),/audit failure/);assert.equal(family.status,'ACTIVE');assert.equal(parents[0].familyClaimHash,'old-link');assert.equal(changes.length,0);
});
test('guardian addition validates adult authority, avoids duplicate emails and never binds an auth identity',async()=>{
 const add={action:'add-guardian',requestId:randomUUID(),updatedAt:family.updatedAt.toISOString(),firstName:'Other',lastName:'Adult',email:'other@example.invalid',phone:'8035550100',confirmAccess:true};
 await rejected(save({...add,confirmAccess:false}),400);await rejected(save({...add,email:'parent@example.invalid'}),409);await rejected(save({...add,authUserId:'steal'}),400);
 await save(add);assert.equal(parents[2].authUserId,null);assert.equal(parents[2].familyId,'family');assert.equal((await save(add)).replayed,true);assert.equal(parents.length,3);assert.equal(changes[0].action,'add-guardian');
});
test('portal links are single-use hashed capabilities for an explicit adult and never reassign a connected account',async()=>{
 await rejected(save(portal({confirmAccess:false})),400);await rejected(save(portal({confirmEmail:'different@example.invalid'})),400);await rejected(save(portal({parentId:'foreign'})),404);await rejected(save(portal({parentId:'linked'})),409);
 const b=portal(),result=await save(b);const token=new URL(result.url,'https://example.invalid').searchParams.get('claim')!;
 assert.equal(token.length,43);assert.equal(parents[0].familyClaimHash,createHash('sha256').update(token).digest('hex'));assert.ok(result.expiresAt.getTime()>Date.now()+29*60000);assert.equal(JSON.stringify(changes).includes(token),false);assert.equal(parents[0].authUserId,null);assert.equal((await save(b)).url,null);assert.equal(changes.length,1);
 const replacement=await save(portal());assert.notEqual(replacement.url,result.url);family.status='ARCHIVED';await rejected(save(portal()),409);
});
test('history remains readable for archived families, binds documents and finances to the business and family, and excludes private credentials',async()=>{
 family.status='ARCHIVED';db.waiver={findFirst:async(q:any)=>{lastQuery=q;return q.where.id==='own-doc'?{id:'own-doc',signature:'Original',waiverText:'Original wording'}:null;},findMany:async(q:any)=>{lastQuery=q;return Array.from({length:21},(_,i)=>({id:String(i)}));}};
 const read=(query:string)=>staffFamilyHistory(db,owner,'family',new URLSearchParams(query));
 assert.equal((await read('document=own-doc')).document?.waiverText,'Original wording');assert.equal(lastQuery.where.tenantId,'tenant');assert.equal(lastQuery.where.familyId,'family');assert.equal(lastQuery.select.requestHash,undefined);await rejected(read('document=foreign-doc'),404);
 const forms=await read('section=forms&page=2');assert.equal(forms.records?.length,20);assert.equal(forms.hasMore,true);assert.equal(lastQuery.skip,20);assert.equal(lastQuery.take,21);
 await rejected(read('page=0'),400);await rejected(read('section=bad'),400);await rejected(staffFamilyHistory(db,{...owner,accessRole:'PARTY_HOST'},'family',new URLSearchParams()),403);
 // A future role with family-only access must not inherit payment history privileges.
 const partyScope:any={family:{findFirst:async()=>null}};await rejected(staffFamilyHistory(partyScope,owner,'foreign',new URLSearchParams('document=own-doc')),404);
 db.eventPayment={findMany:async(q:any)=>{lastQuery=q;return[];}};await read('section=payments');assert.equal(lastQuery.where.party.tenantId,'tenant');assert.equal(lastQuery.where.party.OR[0].familyId,'family');assert.equal(lastQuery.select.processorPaymentId,undefined);
});
