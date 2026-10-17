import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getParentContext, withParent } from "@/lib/parent/access";
import { FormError, validateSigning, saveSignedForm, signingHash } from "@/lib/waivers/signing";
import { legalForm } from "@/lib/waivers/forms";
type Params = {params: Promise<{slug: string}>};
async function handleGET(request: Request, context: Params) {
  void request; void context;
  const {tenant, parent, user} = getParentContext();
  const now = new Date();
  const [children, bookings] = parent ? await Promise.all([
    prisma.child.findMany({where: {tenantId: tenant.id, familyId: parent.familyId, active: true}, orderBy: {firstName:"asc"}, select: {id:true, firstName:true,lastName:true,dateOfBirth:true,allergies:true,waivers:{where:{status:"VALID",signedAt:{not:null},waiver:{kind:"LIABILITY",status:"VALID",signedAt:{not:null},version:{not:null},OR:[{expiresAt:null},{expiresAt:{gt:now}}]}},select:{id:true,signedAt:true,waiver:{select:{expiresAt:true,version:true,photoConsent:true}}}}}}),
    prisma.party.findMany({where:{tenantId:tenant.id,primaryParentId:parent.id,familyId:parent.familyId},orderBy:{startTime:"desc"},select:{id:true,title:true,startTime:true,endTime:true,status:true,balanceDue:true,depositAmount:true,signedForms:{where:{kind:"RENTAL",status:"VALID",signedAt:{not:null}},select:{id:true,signedAt:true,version:true}}}}),
  ]) : [[], []];
  return NextResponse.json({business:{name:tenant.name,slug:tenant.slug,timezone:tenant.timezone},email:user.email,parent:parent?{id:parent.id,firstName:parent.firstName,lastName:parent.lastName,phone:parent.phone}:null,children,bookings,forms:tenant.slug === "palmetto-playhouse" ? {liability:legalForm("LIABILITY"),rental:legalForm("RENTAL")} : null,waiverValidityDays:tenant.waiverValidityDays});
}
async function handlePOST(request: Request, context: Params) {
  void context;
  const {tenant,user} = getParentContext();
  let body;
  try { body = await request.json(); } catch { throw new FormError("Invalid request."); }
  if (!body || typeof body !== "object") throw new FormError("Invalid request.");
  const clean = (value: unknown, field: string, max=100) => {if(typeof value!=="string" || !value.trim() || value.length>max)throw new FormError(`Enter ${field}.`);return value.trim();};
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenant.id} FOR UPDATE`);
    const parent = await tx.parent.findFirst({where:{tenantId:tenant.id,authUserId:user.id},include:{family:true}});
    if (parent && parent.family.status !== "ACTIVE") throw new FormError("Family access is inactive.",403);
    if(body.action === "claim") {
      if(typeof body.token!=="string"||!/^[-_A-Za-z0-9]{43}$/.test(body.token))throw new FormError("Invalid family access link.",400);
      if(parent)throw new FormError("This account is already linked to a family. Contact the venue before changing access.",409);
      const target=await tx.parent.findFirst({where:{tenantId:tenant.id,familyClaimHash:createHash("sha256").update(body.token).digest("hex")},include:{family:true}});
      if(!target||target.authUserId||!target.familyClaimExpiresAt||target.familyClaimExpiresAt<=new Date()||target.family.status!=="ACTIVE")throw new FormError("This family access link is invalid or expired. Ask the venue for a new link.",410);
      if(target.email?.trim().toLowerCase()!==user.email.trim().toLowerCase())throw new FormError("Sign in with the verified email this family link was issued to.",403);
      await tx.parent.update({where:{id:target.id,tenantId:tenant.id,authUserId:null},data:{authUserId:user.id,familyClaimHash:null,familyClaimExpiresAt:null}});
      return {saved:true};
    }
    if(body.action === "setup") {
      if(parent) return {saved:true};
      const firstName=clean(body.firstName,"first name"),lastName=clean(body.lastName,"last name"),phone=clean(body.phone,"phone number",30);
      if(!/^[+0-9() .-]{7,30}$/.test(phone))throw new FormError("Enter a valid phone number.");
      // An email match never grants access to existing family records.
      if(await tx.parent.findFirst({where:{tenantId:tenant.id,email:{equals:user.email,mode:"insensitive"}}})) throw new FormError("The venue already has a customer record for this email. Contact staff to link it securely; no existing family was claimed.",409);
      const family=await tx.family.create({data:{tenantId:tenant.id,name:`${lastName} Family`}});
      await tx.parent.create({data:{tenantId:tenant.id,familyId:family.id,authUserId:user.id,email:user.email,firstName,lastName,phone}});
      return {saved:true};
    }
    if(!parent)throw new FormError("Set up your family first.",403);
    if(body.action === "child") {
      const firstName=clean(body.firstName,"child first name"),lastName=clean(body.lastName,"child last name");
      let dateOfBirth: Date|null=null;
      if(body.dateOfBirth){ if(typeof body.dateOfBirth!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth))throw new FormError("Enter a valid birth date.");dateOfBirth=new Date(`${body.dateOfBirth}T00:00:00Z`);if(!Number.isFinite(dateOfBirth.getTime())||dateOfBirth.toISOString().slice(0,10)!==body.dateOfBirth||dateOfBirth>new Date())throw new FormError("Enter a valid birth date."); }
      if(body.allergies && (typeof body.allergies!=="string"||body.allergies.length>2000))throw new FormError("Allergy notes are too long.");
      const child=await tx.child.create({data:{tenantId:tenant.id,familyId:parent.familyId,firstName,lastName,dateOfBirth,allergies:body.allergies?.trim()||null}});
      return {saved:true,childId:child.id};
    }
    if(body.action!=="waiver" && body.action!=="agreement")throw new FormError("Unknown action.");
    if(tenant.slug!=="palmetto-playhouse")throw new FormError("Forms are not configured for this venue.");
    const kind=body.action==="waiver"?"LIABILITY":"RENTAL";
    const signing=validateSigning(body.signing,kind);
    if(signing.signerEmail!==user.email.trim().toLowerCase())throw new FormError("Use your verified account email to sign.");
    if(signing.signerName.toLowerCase()!==`${parent.firstName} ${parent.lastName}`.trim().toLowerCase())throw new FormError("Use the full name from your parent profile.");
    const ids=kind==="LIABILITY"?body.childIds:[];
    if(!Array.isArray(ids)||(kind==="LIABILITY"&&(!ids.length||ids.length>10))||ids.some(id=>typeof id!=="string")||new Set(ids).size!==ids.length)throw new FormError("Select up to ten children from your family.");
    const children=await tx.child.findMany({where:{id:{in:ids},tenantId:tenant.id,familyId:parent.familyId,active:true}});
    if(children.length!==ids.length)throw new FormError("One or more children do not belong to this family.",403);
    const partyId=kind==="RENTAL"?clean(body.partyId,"booking ID"):undefined;
    const requestHash=signingHash({signing,childIds:children.map(c=>c.id).sort(),partyId:partyId??null});
    const existing=await tx.waiver.findFirst({where:{tenantId:tenant.id,requestId:signing.requestId}});
    if(existing){if(existing.signedById!==parent.id||existing.requestHash!==requestHash)throw new FormError("Submission ID already used with different details.",409);return{saved:true,waiverId:existing.id};}
    const party=partyId?await tx.party.findFirst({where:{id:partyId,tenantId:tenant.id,familyId:parent.familyId,primaryParentId:parent.id,status:{notIn:["CANCELLED","COMPLETED"]}}}):null;
    if(partyId&&!party)throw new FormError("This booking is not available to this parent.",404);
    const waiver=await saveSignedForm(tx,{tenantId:tenant.id,familyId:parent.familyId,parentId:parent.id,kind,signing,validityDays:tenant.waiverValidityDays,children,partyId,eventSnapshot:party?{title:party.title,startTime:party.startTime.toISOString(),endTime:party.endTime.toISOString(),depositAmount:Number(party.depositAmount??0)}:undefined});
    return{saved:true,waiverId:waiver.id};
  },{maxWait:10000,timeout:15000});
  return NextResponse.json(result);
}
export const GET = withParent(handleGET);
export const POST = withParent(handlePOST);
