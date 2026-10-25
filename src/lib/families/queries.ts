import {Prisma} from "@/generated/prisma/client";
import {FormError} from "@/lib/waivers/signing";
import {validCoverageWhere} from "@/lib/visits/service";
const like=(s:string)=>`%${s.replace(/[\\%_]/g,c=>`\\${c}`)}%`;
export function familyDirectoryQuery(q:URLSearchParams){
 const search=(q.get("q")??"").trim(),status=q.get("status")??"ACTIVE",page=Number(q.get("page")??1);
 if(search.length>254||!Number.isInteger(page)||page<1||page>10000||!["ACTIVE","ARCHIVED","INACTIVE","ALL"].includes(status))throw new FormError("Choose a valid search, family status and page.");
 return {search,status,page,pageSize:25};
}
export async function listFamilies(tx:Prisma.TransactionClient,tenantId:string,q:URLSearchParams){
 const options=familyDirectoryQuery(q),terms=options.search.split(/\s+/).filter(Boolean).slice(0,5);
 const clauses=terms.map(term=>{const pattern=like(term),digits=term.replace(/\D/g,"");return Prisma.sql`(f.name ILIKE ${pattern} OR EXISTS(SELECT 1 FROM "Parent" p WHERE p."familyId"=f.id AND p."tenantId"=${tenantId} AND (p."firstName" ILIKE ${pattern} OR p."lastName" ILIKE ${pattern} OR p.email ILIKE ${pattern} OR p.phone ILIKE ${pattern} ${digits.length>=2&&/^[+0-9().-]+$/.test(term)?Prisma.sql`OR regexp_replace(COALESCE(p.phone,''),'[^0-9]','','g') LIKE ${`%${digits}%`}`:Prisma.empty})) OR EXISTS(SELECT 1 FROM "Child" c WHERE c."familyId"=f.id AND c."tenantId"=${tenantId} AND (c."firstName" ILIKE ${pattern} OR c."lastName" ILIKE ${pattern})))`;});
 const where=Prisma.sql`f."tenantId"=${tenantId} ${options.status==="ALL"?Prisma.empty:Prisma.sql`AND f.status=${options.status}::"AccountStatus"`} ${clauses.length?Prisma.sql`AND ${Prisma.join(clauses," AND ")}`:Prisma.empty}`;
 const [ids,count]=await Promise.all([tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT f.id FROM "Family" f WHERE ${where} ORDER BY f.name,f.id LIMIT ${options.pageSize} OFFSET ${(options.page-1)*options.pageSize}`),tx.$queryRaw<{total:number}[]>(Prisma.sql`SELECT COUNT(*)::integer AS total FROM "Family" f WHERE ${where}`)]);
 const families=ids.length?await tx.family.findMany({where:{tenantId,id:{in:ids.map(r=>r.id)}},orderBy:[{name:"asc"},{id:"asc"}],select:{id:true,name:true,status:true,parents:{where:{tenantId},orderBy:{createdAt:"asc"},take:3,select:{id:true,firstName:true,lastName:true,email:true,phone:true}},_count:{select:{children:{where:{tenantId,active:true}}}}}}):[];
 return {...options,families,total:count[0]?.total??0};
}
export async function readFamily(tx:Prisma.TransactionClient,tenantId:string,id:string,canManage:boolean){
 const family=await tx.family.findFirst({where:{tenantId,id},select:{id:true,name:true,status:true,updatedAt:true,...(canManage?{notes:true}:{}),_count:{select:{parents:true,children:true}},parents:{where:{tenantId},orderBy:{createdAt:"asc"},take:50,select:{id:true,firstName:true,lastName:true,email:true,phone:true,updatedAt:true,address1:true,address2:true,city:true,state:true,zip:true,emergencyContact:true,emergencyPhone:true,relationshipToChild:true,authUserId:true}},children:{where:{tenantId},orderBy:[{active:"desc"},{firstName:"asc"},{id:"asc"}],take:100,select:{id:true,firstName:true,lastName:true,dateOfBirth:true,allergies:true,medicalNotes:true,updatedAt:true,active:true,waivers:{where:validCoverageWhere(tenantId,id),orderBy:{signedAt:"desc"},take:1,select:{id:true,signedAt:true,waiver:{select:{id:true,expiresAt:true,version:true,photoConsent:true}}}}}}}});
 if(!family)throw new FormError("Family not found.",404);
 return {...family,totalParents:family._count.parents,totalChildren:family._count.children,_count:undefined,parents:family.parents.map(({authUserId,...p})=>({...p,linked:!!authUserId}))};
}
