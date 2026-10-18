import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,withStaff} from "@/lib/auth/staff";
import {attachUpcomingCoverage,FormError,saveSignedForm,signingHash,validateSigning} from "@/lib/waivers/signing";
import {lockVisits,recordId} from "@/lib/visits/service";
async function handlePOST(request:Request){
  try{
    let body;try{body=await request.json();}catch{throw new FormError("Invalid waiver request.");}
    if(!body||typeof body!=="object"||Array.isArray(body))throw new FormError("Invalid waiver request.");
    const staff=getStaffContext(),familyId=recordId(body.familyId,"a family"),guardianId=recordId(body.guardianParentId,"the signing guardian"),signing=validateSigning(body.signing,"LIABILITY");
    if(!Array.isArray(body.childIds)||!body.childIds.length||body.childIds.length>10||body.childIds.some((id:unknown)=>typeof id!=="string"||id.length>100)||new Set(body.childIds).size!==body.childIds.length)throw new FormError("Select up to ten children.");
    const result=await prisma.$transaction(async tx=>{
      await lockVisits(tx,staff.tenantId);
      const tenant=await tx.tenant.findUniqueOrThrow({where:{id:staff.tenantId}});
      if(tenant.slug!=="palmetto-playhouse")throw new FormError("The waiver form is not configured for this business.");
      const parent=await tx.parent.findFirst({where:{id:guardianId,tenantId:staff.tenantId,familyId,family:{status:"ACTIVE"}}});
      if(!parent)throw new FormError("Guardian not found in this active family.",404);
      if(signing.signerName.toLowerCase()!==`${parent.firstName} ${parent.lastName}`.trim().toLowerCase())throw new FormError("The attending guardian must sign using their saved full name.");
      if(parent.email&&parent.email.trim().toLowerCase()!==signing.signerEmail)throw new FormError("Use the saved guardian email or have the venue update their record first.");
      const children=await tx.child.findMany({where:{id:{in:body.childIds},tenantId:staff.tenantId,familyId,active:true}});
      if(children.length!==body.childIds.length)throw new FormError("One or more children are not active in this family.",404);
      const hash=signingHash({signing,childIds:children.map(child=>child.id).sort(),partyId:null});
      const existing=await tx.waiver.findFirst({where:{tenantId:staff.tenantId,requestId:signing.requestId}});
      if(existing){if(existing.familyId!==familyId||existing.signedById!==parent.id||existing.requestHash!==hash)throw new FormError("This signature request already saved different details.",409);return{saved:true,replayed:true};}
      if(!parent.email)await tx.parent.update({where:{id:parent.id,tenantId:staff.tenantId},data:{email:signing.signerEmail}});
      const waiver=await saveSignedForm(tx,{tenantId:staff.tenantId,familyId,parentId:parent.id,kind:"LIABILITY",signing,validityDays:tenant.waiverValidityDays,children,identityMethod:"IN_PERSON_GUARDIAN",witness:{staffId:staff.employeeId,name:staff.name}});
      await attachUpcomingCoverage(tx,staff.tenantId,waiver.children);
      return{saved:true,replayed:false};
    },{maxWait:10000,timeout:15000});
    return NextResponse.json(result);
  }catch(error){if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});console.error("Desk waiver failed",error);return NextResponse.json({error:"Unable to save this waiver. Please try again."},{status:500});}
}
export const POST = withStaff("visits.write",handlePOST);
