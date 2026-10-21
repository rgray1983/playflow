import {tenantForms} from "@/lib/operations/settings";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { FormError, validateSigning, saveSignedForm, signingHash } from "@/lib/waivers/signing";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    token: string;
  }>;
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status }
  );
}

function serializeParty(party: {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: Date;
  startTime: Date;
  endTime: Date;
  packageName: string | null;
  guestOfHonor: string | null;
  notes: string | null;
}) {
  return {
    id: party.id,
    eventNumber: party.eventNumber,
    title: party.title,
    eventDate: party.eventDate,
    startTime: party.startTime,
    endTime: party.endTime,
    packageName: party.packageName,
    guestOfHonor: party.guestOfHonor,
    notes: party.notes ?? "",
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;

    const party = await prisma.party.findUnique({
      where: {
        inviteToken: token,
      },
    });

    if (!party) {
      return NextResponse.json({ error: "RSVP link was not found." }, { status: 404 });
    }

    return NextResponse.json({
      event: serializeParty(party),
      form:tenantForms(await prisma.tenant.findUniqueOrThrow({where:{id:party.tenantId}}))?.liability??null,
    });
  } catch (error) {
    return jsonError(error, "Unable to load RSVP event.");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const {token}=await params;
    let body;
    try {body=await request.json();}catch {throw new FormError("Invalid RSVP request.");}
    if(!body||typeof body!=="object")throw new FormError("Invalid RSVP request.");
    const text=(value:unknown,max:number)=>{if(value==null)return "";if(typeof value!=="string"||value.length>max)throw new FormError("A form field is invalid or too long.");return value.trim();};
    if(body.response!=="attending"&&body.response!=="declined")throw new FormError("Choose whether you are attending.");
    const parentName=text(body.parentName,150),email=text(body.guestEmail,254).toLowerCase(),phone=text(body.guestPhone,30),notes=text(body.notes,2000),declineReason=text(body.declineReason,1000);
    const guestName=text(body.guestName,150);
    const names=body.response==="attending"?body.children:[guestName];
    if(!Array.isArray(names)||names.length<1||names.length>10||names.some(name=>typeof name!=="string"||!name.trim()||name.length>150))throw new FormError("List between one and ten children individually.");
    const childNames=names.map((name:string)=>name.trim());
    if(new Set(childNames.map((name:string)=>name.toLowerCase())).size!==childNames.length)throw new FormError("List each child once.");
    const result=await prisma.$transaction(async tx=>{
      const found=await tx.party.findUnique({where:{inviteToken:token}});
      if(!found)throw new FormError("RSVP link was not found.",404);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${found.tenantId} FOR UPDATE`);
      const party=await tx.party.findUniqueOrThrow({where:{id:found.id}});
      if(["CANCELLED","COMPLETED"].includes(party.status)||(party.status==="PENDING"&&party.confirmationExpiresAt&&party.confirmationExpiresAt.getTime()<=Date.now()))throw new FormError("This party is no longer accepting RSVPs.",410);
      const tenant=await tx.tenant.findUniqueOrThrow({where:{id:party.tenantId}});
      const form=tenantForms(tenant)?.liability;
      if(body.response==="attending"&&!form)throw new FormError("The venue has not configured its waiver.");
      const signing=body.response==="attending"?validateSigning(body.signing,"LIABILITY",form!):null;
      if(signing&&(signing.signerName!==parentName||signing.signerEmail!==email))throw new FormError("The signer name and email must match the guardian details.");
      const hash=signingHash({signing,childNames,parentName,email,phone,notes,partyId:party.id});
      if(signing){
        const prior=await tx.waiver.findFirst({where:{tenantId:tenant.id,requestId:signing.requestId}});
        if(prior){if(prior.requestHash!==hash||prior.partyId!==party.id)throw new FormError("This submission was already used with different details.",409);return {saved:true,replayed:true};}
      }
      const children: {id:string;firstName:string;lastName:string;dateOfBirth:Date|null}[]=[];
      let signed: Awaited<ReturnType<typeof saveSignedForm>>|null=null;
      if(signing){
        // Public contact details cannot claim or modify an existing verified family.
        const family=await tx.family.create({data:{tenantId:tenant.id,name:`${parentName} Family`}});
        const parent=await tx.parent.create({data:{tenantId:tenant.id,familyId:family.id,firstName:parentName,lastName:"",email,phone:phone||null}});
        for(const name of childNames){const [firstName,...rest]=name.split(/\s+/);children.push(await tx.child.create({data:{tenantId:tenant.id,familyId:family.id,firstName,lastName:rest.join(" ")}}));}
        signed=await saveSignedForm(tx,{tenantId:tenant.id,familyId:family.id,parentId:parent.id,kind:"LIABILITY",form:form!,signing,validityDays:tenant.waiverValidityDays,children,partyId:party.id,identityMethod:"INVITATION_FORM"});
        await tx.waiver.update({where:{id:signed.id},data:{requestHash:hash}});
      }
      for(let index=0;index<childNames.length;index++){
        await tx.partyGuest.create({data:{tenantId:tenant.id,partyId:party.id,childId:children[index]?.id,waiverChildId:signed?.children.find(coverage=>coverage.childId===children[index]?.id)?.id,guestName:childNames[index],parentName:parentName||null,guestEmail:email||null,guestPhone:phone||null,status:signing?"EXPECTED":"NO_SHOW",rsvpStatus:signing?"ATTENDING":"DECLINED",waiverStatus:signing?"SIGNED":"NOT_NEEDED",waiverSignedAt:signed?.signedAt,declinedAt:signing?null:new Date(),declineReason:signing?null:declineReason||null,notes:signing?notes||null:null}});
      }
      await tx.eventTimelineItem.create({data:{tenantId:tenant.id,partyId:party.id,icon:signing?"✓":"–",title:signing?"Guest RSVP + Liability Waiver Saved":"Guest Declined RSVP",body:signing?`${parentName} signed for ${childNames.length} child(ren). Each child has a separate waiver coverage record.`:`${guestName} cannot attend.`,metadata:{source:"rsvp",waiverId:signed?.id??null,childCount:children.length}}});
      return {saved:true,replayed:false};
    },{maxWait:10000,timeout:15000});
    return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});console.error("Unable to submit RSVP",error);return NextResponse.json({error:"Unable to save RSVP. Retry the same form."},{status:500});}
}
