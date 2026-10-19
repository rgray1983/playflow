import {membershipUse} from "@/lib/visits/service";
import {receiptSelect} from "@/lib/counter/select";
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
  if(query.has("receipt")){
    const id=query.get("receipt")!;
    if(!id||id.length>100)throw new FormError("Choose a saved receipt.");
    const receipt=await prisma.counterSale.findFirst({where:{id,tenantId:tenant.id,familyId:parent.familyId},select:receiptSelect});
    if(!receipt)throw new FormError("Receipt not found.",404);
    return NextResponse.json({receipt});
  }
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
    case "visits":records=await prisma.visit.findMany({where:family,...pagination,orderBy:[{checkedInAt:"desc"},{id:"desc"}],select:{id:true,checkedInAt:true,checkedOutAt:true,status:true,visitType:true,admissionSnapshot:true,counterSale:{select:{status:true}},child:{select:{firstName:true,lastName:true}}}});break;
    case "memberships":{
      const memberships=await prisma.membership.findMany({where:family,...pagination,orderBy:[{startsAt:"desc"},{id:"desc"}],select:{id:true,tenantId:true,familyId:true,childId:true,name:true,status:true,startsAt:true,endsAt:true,autoRenew:true,termsSnapshot:true,membershipPlan:{select:{id:true,tenantId:true,name:true,visitLimit:true}},child:{select:{firstName:true,lastName:true}}}});
      records=await Promise.all(memberships.map(async member=>{
        const use=await membershipUse(prisma,member,tenant.id,parent.familyId,member.childId??"");
        return{id:member.id,name:member.name,status:member.status,startsAt:member.startsAt,endsAt:member.endsAt,autoRenew:member.autoRenew,child:member.child,remaining:use.remaining,eligibilityReason:use.reason};
      }));break;
    }
    case "counter":records=await prisma.counterSale.findMany({where:family,...pagination,orderBy:[{createdAt:"desc"},{id:"desc"}],select:receiptSelect});break;
    case "payments":records=await prisma.eventPayment.findMany({where:{tenantId:tenant.id,party:{tenantId:tenant.id,familyId:parent.familyId,primaryParentId:parent.id}},...pagination,orderBy:[{collectedAt:"desc"},{id:"desc"}],select:{id:true,amount:true,method:true,providerMode:true,status:true,purpose:true,collectedAt:true,party:{select:{title:true}}}});break;
    case "archived":records=await prisma.child.findMany({where:{...family,active:false},...pagination,orderBy:[{firstName:"asc"},{id:"asc"}],select:{id:true,firstName:true,lastName:true,dateOfBirth:true,updatedAt:true}});break;
    default:throw new FormError("Choose a history section.");
  }
  return NextResponse.json({records:records.slice(0,20),hasMore:records.length>20,page});
}
export const GET=withParent(handleGET);
