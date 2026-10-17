import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParentContext, withParent } from "@/lib/parent/access";
import { FormError } from "@/lib/waivers/signing";
import type { Prisma } from "@/generated/prisma/client";

async function handleGET(request:Request,context:{params:Promise<{slug:string}>}){
  void context;
  const {tenant,parent}=getParentContext();
  if(!parent)throw new FormError("Set up your family first.",403);
  const query=new URL(request.url).searchParams;
  const formWhere:Prisma.WaiverWhereInput={tenantId:tenant.id,familyId:parent.familyId,signedAt:{not:null},OR:[{kind:"LIABILITY"},{kind:"RENTAL",party:{tenantId:tenant.id,familyId:parent.familyId,primaryParentId:parent.id}}]};
  if(query.has("document")){
    const id=query.get("document")!;
    if(!id||id.length>100)throw new FormError("Choose a saved document.");
    const document=await prisma.waiver.findFirst({where:{...formWhere,id},select:{id:true,kind:true,status:true,version:true,signedAt:true,expiresAt:true,signerName:true,signerEmail:true,signature:true,photoConsent:true,waiverText:true,children:{select:{childId:true,childNameSnapshot:true,dateOfBirthSnapshot:true,signedAt:true,status:true}},party:{select:{title:true}}}});
    if(!document)throw new FormError("Saved document not found.",404);
    return NextResponse.json({document});
  }
  const section=query.get("section")??"forms",page=Number(query.get("page")??1);
  if(!Number.isInteger(page)||page<1||page>10000)throw new FormError("Choose a valid history page.");
  const pagination={skip:(page-1)*20,take:21};
  const family={tenantId:tenant.id,familyId:parent.familyId};
  let records:unknown[];
  switch(section){
    case "forms":records=await prisma.waiver.findMany({where:formWhere,...pagination,orderBy:[{signedAt:"desc"},{id:"desc"}],select:{id:true,kind:true,status:true,version:true,signedAt:true,expiresAt:true,signerName:true,children:{select:{childNameSnapshot:true,status:true}},party:{select:{title:true}}}});break;
    case "visits":records=await prisma.visit.findMany({where:family,...pagination,orderBy:[{checkedInAt:"desc"},{id:"desc"}],select:{id:true,checkedInAt:true,checkedOutAt:true,status:true,visitType:true,child:{select:{firstName:true,lastName:true}}}});break;
    case "memberships":records=await prisma.membership.findMany({where:family,...pagination,orderBy:[{startsAt:"desc"},{id:"desc"}],select:{id:true,name:true,status:true,startsAt:true,endsAt:true,autoRenew:true,child:{select:{firstName:true,lastName:true}}}});break;
    case "payments":records=await prisma.eventPayment.findMany({where:{tenantId:tenant.id,party:{tenantId:tenant.id,familyId:parent.familyId,primaryParentId:parent.id}},...pagination,orderBy:[{collectedAt:"desc"},{id:"desc"}],select:{id:true,amount:true,method:true,status:true,purpose:true,collectedAt:true,party:{select:{title:true}}}});break;
    case "archived":records=await prisma.child.findMany({where:{...family,active:false},...pagination,orderBy:[{firstName:"asc"},{id:"asc"}],select:{id:true,firstName:true,lastName:true,dateOfBirth:true,updatedAt:true}});break;
    default:throw new FormError("Choose a history section.");
  }
  return NextResponse.json({records:records.slice(0,20),hasMore:records.length>20,page});
}
export const GET=withParent(handleGET);
