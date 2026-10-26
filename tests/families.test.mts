import assert from 'node:assert/strict';
import {beforeEach,test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {editStaffFamily} from '../src/lib/families/changes';
import {familyDirectoryQuery,listFamilies,readFamily} from '../src/lib/families/queries';
import {hasPermission} from '../src/lib/auth/permissions';
let family:any,parent:any,child:any,changes:any[],coverage:string,guest:string,failAudit:boolean;
const stamp=new Date('2026-01-01');
const staff={tenantId:'tenant',employeeId:'employee',name:'Staff',accessRole:'FRONT_DESK'};
const matches=(row:any,where:any)=>Object.entries(where).every(([k,v])=>row[k]===v);
const tx:any={
 $queryRaw:async()=>[],
 family:{findFirst:async({where}:any)=>matches(family,where)?{...family}:null,update:async({data}:any)=>Object.assign(family,data)},
 parent:{findFirst:async({where}:any)=>matches(parent,where)?{...parent}:null,update:async({data}:any)=>Object.assign(parent,data,{updatedAt:new Date(stamp.getTime()+1000)})},
 child:{findFirst:async({where}:any)=>matches(child,where)?{...child}:null,update:async({data}:any)=>Object.assign(child,data,{updatedAt:new Date(stamp.getTime()+1000)})},
 familyChange:{findUnique:async({where}:any)=>changes.find(c=>matches(c,where.tenantId_requestId)),create:async({data}:any)=>{if(failAudit)throw Error('audit unavailable');changes.push(data);return data;}},
 waiverChild:{updateMany:async({where,data}:any)=>{assert.equal(where.waiver.tenantId,'tenant');assert.equal(where.waiver.familyId,'family');coverage=data.status;}},
 partyGuest:{updateMany:async({where,data}:any)=>{assert.equal(where.tenantId,'tenant');assert.equal(where.childId,'child');assert.equal(where.status,'EXPECTED');guest=data.waiverStatus;}}
};
const parentBody=(extra:any={})=>({action:'parent-update',requestId:randomUUID(),parentId:'parent',updatedAt:parent.updatedAt.toISOString(),firstName:'Corrected',lastName:'Parent',phone:'8035550100',...extra});
const childBody=(extra:any={})=>({action:'child-update',requestId:randomUUID(),childId:'child',updatedAt:child.updatedAt.toISOString(),firstName:'First',lastName:'Child',dateOfBirth:'2020-01-01',allergies:null,medicalNotes:null,...extra});
const save=(body:any,actor=staff,id='family')=>editStaffFamily(tx,actor,id,body);
const rejected=(promise:Promise<unknown>,status:number)=>assert.rejects(promise,(e:any)=>e.status===status);
beforeEach(()=>{family={id:'family',tenantId:'tenant',name:'Family',status:'ACTIVE',updatedAt:stamp,notes:'Private'};parent={id:'parent',tenantId:'tenant',familyId:'family',firstName:'Original',lastName:'Parent',phone:'8035550100',email:'original@example.invalid',authUserId:'auth-original',familyClaimHash:'claim',familyClaimExpiresAt:stamp,updatedAt:stamp};child={id:'child',tenantId:'tenant',familyId:'family',firstName:'First',lastName:'Child',dateOfBirth:new Date('2020-01-01'),active:true,allergies:null,medicalNotes:null,updatedAt:stamp};changes=[];coverage='VALID';guest='SIGNED';failAudit=false;});
test('family role permissions allow desk corrections and reserve internal notes for managers',async()=>{
 for(const role of ['OWNER','MANAGER','FRONT_DESK'])assert.equal(hasPermission(role,'families.write'),true);
 assert.equal(hasPermission('FRONT_DESK','families.manage'),false);assert.equal(hasPermission('PARTY_HOST','families.read'),false);
 await rejected(save(parentBody(),{...staff,accessRole:'PARTY_HOST'}),403);
 const body={action:'family-update',requestId:randomUUID(),updatedAt:stamp.toISOString(),name:'Family',notes:'Changed'};
 await rejected(save(body),403);assert.equal(changes.length,0);assert.equal(family.notes,'Private');
 await save(body,{...staff,accessRole:'MANAGER'});assert.equal(family.notes,'Changed');
});
test('contact email corrections preserve authentication and cancel unused family claims',async()=>{
 await save(parentBody({email:' NEW@example.invalid '}));assert.equal(parent.email,'new@example.invalid');assert.equal(parent.authUserId,'auth-original');assert.equal(parent.familyClaimHash,null);assert.equal(parent.familyClaimExpiresAt,null);
 assert.equal(changes[0].actorId,'employee');assert.ok(changes[0].changedFields.includes('email'));assert.equal(changes[0].email,undefined);assert.equal(changes[0].phone,undefined);
 await rejected(save(parentBody({email:'invalid'})),400);await save(parentBody({email:''}));assert.equal(parent.email,null);
});
test('family edits reject cross-business, cross-family and protected ownership fields',async()=>{
 await rejected(save(parentBody(),{...staff,tenantId:'other'}),404);
 await rejected(save(parentBody({parentId:'foreign'})),404);
 await rejected(save(childBody({childId:'foreign'})),404);
 for(const field of ['authUserId','familyId','status','accessRole'])await rejected(save(parentBody({[field]:'other'})),400);
 family.status='ARCHIVED';await rejected(save(parentBody()),409);assert.equal(changes.length,0);assert.equal(parent.firstName,'Original');
});
test('stale edits fail while identical request replays do not duplicate writes or audit entries',async()=>{
 const body=parentBody();await save(body);assert.equal(changes.length,1);assert.equal((await save(body)).replayed,true);assert.equal(changes.length,1);
 await rejected(save({...body,firstName:'Different'}),409);
 await rejected(save({...body,requestId:randomUUID()}),409);assert.equal(parent.firstName,'Corrected');
});
test('child notes preserve coverage; identity corrections revoke coverage and flag upcoming guests',async()=>{
 await save(childBody({medicalNotes:'Quiet breaks'}));assert.equal(coverage,'VALID');assert.equal(guest,'SIGNED');
 const result=await save(childBody({firstName:'Corrected',medicalNotes:'Quiet breaks'}));assert.equal(result.needsNewWaiver,true);assert.equal(coverage,'REVOKED');assert.equal(guest,'NEEDED');assert.equal(changes[1].needsNewWaiver,true);assert.equal(changes[1].medicalNotes,undefined);
});
test('audit failures propagate so the calling transaction rolls back the profile and waiver changes',async()=>{
 const snapshot=structuredClone({family,parent,child,changes,coverage,guest});failAudit=true;
 // Model the same callback transaction boundary used by the route.
 await assert.rejects((async()=>{try{await save(childBody({firstName:'Correction'}));}catch(e){({family,parent,child,changes,coverage,guest}=snapshot);throw e;}})(),/audit unavailable/);
 assert.equal(child.firstName,'First');assert.equal(coverage,'VALID');assert.equal(guest,'SIGNED');assert.equal(changes.length,0);
});
test('directory search validates paging and binds escaped names and normalized phones as SQL parameters',async()=>{
 for(const query of ['page=0','page=1.5','status=BAD','q='+ 'a'.repeat(255)])assert.throws(()=>familyDirectoryQuery(new URLSearchParams(query)));
 const statements:any[]=[];const result=await listFamilies({$queryRaw:async(sql:any)=>{statements.push(sql);return sql.text.includes('COUNT')?[{total:0}]:[];}} as any,'tenant',new URLSearchParams({q:'%_ 803-555-0100',page:'2'}));
 assert.equal(result.pageSize,25);assert.equal(result.total,0);assert.ok(statements[0].values.includes('%\\%\\_%'));assert.ok(statements[0].values.includes('%8035550100%'));assert.ok(statements[0].values.includes('tenant'));assert.ok(!statements[0].text.includes('8035550100'));assert.match(statements[0].text,/OFFSET/);
});
test('family read excludes manager notes and authentication IDs while exposing linked-account status',async()=>{
 let query:any;const db:any={family:{findFirst:async(q:any)=>{query=q;return{id:'family',parents:[{id:'parent',authUserId:'secret'}],children:[],_count:{parents:1,children:0}};}}};
 const result=await readFamily(db,'tenant','family',false);assert.equal(query.where.tenantId,'tenant');assert.equal(query.select.notes,undefined);assert.equal(query.select.parents.take,50);assert.equal(query.select.children.take,100);assert.equal('authUserId' in result.parents[0],false);assert.equal(result.parents[0].linked,true);
 await readFamily(db,'tenant','family',true);assert.equal(query.select.notes,true);
 db.family.findFirst=async()=>null;await rejected(readFamily(db,'tenant','foreign',false),404);
});
