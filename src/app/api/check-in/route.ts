import {billAdmissions} from "@/lib/counter/service";
import {hasPermission} from "@/lib/auth/permissions";
import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,getStaffTenant,withStaff} from "@/lib/auth/staff";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {addVisitChild,checkInVisits,checkOutVisits,intakeFamily,membershipUse,recordId,validCoverageWhere} from "@/lib/visits/service";

function errorResponse(error:unknown){
  if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return NextResponse.json({error:"A matching request or active visit already exists. Refresh before trying again."},{status:409});
  console.error("Playtime visit request failed",error);return NextResponse.json({error:"Unable to complete the visit request. Please try again."},{status:500});
}
async function handleGET(request:Request){
  try{
    const tenant=await getStaffTenant();if(!tenant)throw new FormError("Business not found.",404);
    const query=new URL(request.url).searchParams;
    if(query.has("familyId")){
      const familyId=recordId(query.get("familyId"),"a family");
      const family=await prisma.family.findFirst({where:{id:familyId,tenantId:tenant.id,status:"ACTIVE"},select:{id:true,name:true,parents:{orderBy:{createdAt:"asc"},select:{id:true,firstName:true,lastName:true,email:true,phone:true}},children:{where:{active:true},orderBy:{firstName:"asc"},select:{id:true,firstName:true,lastName:true,dateOfBirth:true,allergies:true,medicalNotes:true,waivers:{where:validCoverageWhere(tenant.id,familyId),orderBy:{signedAt:"desc"},take:1,select:{id:true,signedAt:true,waiver:{select:{version:true,expiresAt:true}}}},visits:{where:{status:"CHECKED_IN",checkedOutAt:null},take:1,select:{id:true,checkedInAt:true,visitType:true}}}}}});
      if(!family)throw new FormError("Active family not found.",404);
      const members=await prisma.membership.findMany({where:{tenantId:tenant.id,familyId,status:{in:["ACTIVE","PENDING","PAUSED"]}},orderBy:{startsAt:"desc"},take:100,include:{membershipPlan:{select:{id:true,name:true,tenantId:true,visitLimit:true}}}});
      const uses=new Map(await Promise.all(members.map(async member=>[member.id,await membershipUse(prisma,member,tenant.id,family.id,member.childId??family.children[0]?.id??"")] as const)));
      return NextResponse.json({family:{id:family.id,name:family.name,parents:family.parents,children:family.children.map(child=>({id:child.id,firstName:child.firstName,lastName:child.lastName,dateOfBirth:child.dateOfBirth,allergies:child.allergies,medicalNotes:child.medicalNotes,waiver:child.waivers[0]??null,activeVisit:child.visits[0]??null,memberships:members.filter(m=>!m.childId||m.childId===child.id).map(m=>({id:m.id,name:m.name,status:m.status,startsAt:m.startsAt,endsAt:m.endsAt,...uses.get(m.id)}))}))}});
    }
    if(query.has("q")){
      const q=query.get("q")!.trim();if(q.length>254)throw new FormError("Search text is too long.");
      if(q.length<2)return NextResponse.json({families:[]});
      const terms=q.split(/\s+/).slice(0,5);
      const families=await prisma.family.findMany({where:{tenantId:tenant.id,status:"ACTIVE",AND:terms.map(term=>({OR:[{name:{contains:term,mode:"insensitive"}},{parents:{some:{OR:[{firstName:{contains:term,mode:"insensitive"}},{lastName:{contains:term,mode:"insensitive"}},{email:{contains:term,mode:"insensitive"}},{phone:{contains:term}}]}}},{children:{some:{active:true,OR:[{firstName:{contains:term,mode:"insensitive"}},{lastName:{contains:term,mode:"insensitive"}}]}}}]}))},orderBy:{name:"asc"},take:20,select:{id:true,name:true,parents:{take:3,select:{firstName:true,lastName:true,email:true,phone:true}},_count:{select:{children:{where:{active:true}}}}}});
      return NextResponse.json({families,limit:20});
    }
    const page=Number(query.get("page")??1);if(!Number.isInteger(page)||page<1||page>10000)throw new FormError("Choose a valid inside-list page.");
    const where={tenantId:tenant.id,status:"CHECKED_IN" as const,checkedOutAt:null};
    const [visits,insideCount,admissions]=await Promise.all([
      prisma.visit.findMany({where,skip:(page-1)*50,take:50,orderBy:[{checkedInAt:"asc"},{id:"asc"}],select:{id:true,familyId:true,checkedInAt:true,visitType:true,admissionSnapshot:true,counterSale:{select:{status:true,totalCents:true,payments:{select:{amountCents:true}}}},child:{select:{firstName:true,lastName:true}},family:{select:{name:true}},guardianParent:{select:{firstName:true,lastName:true}}}}),
      prisma.visit.count({where}),prisma.admissionType.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},take:100,select:{id:true,name:true,price:true}}),
    ]);
    return NextResponse.json({business:{name:tenant.name,slug:tenant.slug,timezone:tenant.timezone},visits,insideCount,page,pageSize:50,admissions:admissions.map(a=>({...a,price:Number(a.price)})),formsAvailable:tenant.slug==="palmetto-playhouse"});
  }catch(error){return errorResponse(error);}
}
async function handlePOST(request:Request){
  try{
    let body;try{body=await request.json();}catch{throw new FormError("Invalid visit request.");}
    if(!body||typeof body!=="object"||Array.isArray(body))throw new FormError("Invalid visit request.");
    const staff=getStaffContext();
    const result=await prisma.$transaction(async tx=>{
      switch(body.action){
        case "intake":return intakeFamily(tx,staff,body);
        case "add-child":return addVisitChild(tx,staff,body);
        case "check-in":{
          const result=await checkInVisits(tx,staff,body);
          if(body.createAdmissionBill===true){
            if(!hasPermission(staff.accessRole,"payments.write"))throw new FormError("Payment access is required to create a bill.",403);
            const admissionIds=(body.entries as {childId:string;mode:string}[]).filter(e=>e.mode==="ADMISSION").map(e=>e.childId);
            if(admissionIds.length){
              const visits=await tx.visit.findMany({where:{tenantId:staff.tenantId,id:{in:result.visitIds},childId:{in:admissionIds}},select:{id:true}});
              const bill=await billAdmissions(tx,staff,{familyId:body.familyId,visitIds:visits.map(v=>v.id),requestId:`visit-bill-${signingHash({requestId:body.requestId})}`});
              return{...result,saleId:bill.saleId};
            }
          }
          return result;
        }
        case "check-out":return checkOutVisits(tx,staff,body);
        default:throw new FormError("Choose a valid visit action.");
      }
    },{maxWait:10000,timeout:20000});
    return NextResponse.json(result);
  }catch(error){return errorResponse(error);}
}
export const GET = withStaff("visits.write",handleGET);
export const POST = withStaff("visits.write",handlePOST);
