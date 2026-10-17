import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { bookingOptions } from "./service";
import { BookingError, normalizePhone, scheduleFrom } from "./rules";
import { FormError, saveSignedForm, signingHash, validateSigning } from "@/lib/waivers/signing";

export function parentQuoteToken(options: Awaited<ReturnType<typeof bookingOptions>>, setupMinutes: number) {
  return signingHash({quote: options.quote, duration: options.pkg.durationMinutes ?? 120, addOns: options.addOns.map(a => ({id:a.id,duration:a.durationMinutes})), timezone: options.timezone, setupMinutes});
}

export function parentBookingResult(party: {
  id:string; eventNumber:string|null; title:string; status:string; startTime:Date; endTime:Date;
  confirmationExpiresAt:Date|null; depositAmount:unknown; depositStatus:string; balanceDue:unknown;
}) {
  return {id:party.id,eventNumber:party.eventNumber,title:party.title,status:party.status,startTime:party.startTime,endTime:party.endTime,expiresAt:party.confirmationExpiresAt,depositDue:party.depositStatus==="PENDING"?Number(party.depositAmount):0,balanceDue:Number(party.balanceDue),checkoutAvailable:false};
}

export async function createParentBooking(tx: Prisma.TransactionClient, tenantId: string, user: {id:string;email:string}, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BookingError("Invalid booking request.");
  const body = input as Record<string,unknown>;
  const text = (key:string,max=100) => {const value=body[key];if(typeof value!=="string"||!value.trim()||value.length>max)throw new BookingError(`Choose a valid ${key}.`);return value.trim();};
  const requestId=text("requestId");
  if(!/^[A-Za-z0-9-]{16,100}$/.test(requestId))throw new BookingError("Refresh the booking form and try again.");
  const childId=text("childId"), eventTypeId=text("eventTypeId"), packageId=text("packageId"), eventDate=text("eventDate"), startTime=text("startTime"), quoteToken=text("quoteToken");
  if(!Array.isArray(body.addOnIds)||body.addOnIds.length>50||body.addOnIds.some(id=>typeof id!=="string"||id.length>100)||new Set(body.addOnIds).size!==body.addOnIds.length)throw new BookingError("Choose each add-on only once.");
  const addOnIds=(body.addOnIds as string[]).slice().sort();
  if(body.notes!==undefined&&(typeof body.notes!=="string"||body.notes.length>2000))throw new BookingError("Party notes must be under 2,000 characters.");
  const notes=typeof body.notes==="string"?body.notes.trim():"";
  const signing=validateSigning(body.signing,"RENTAL");
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`);
  const tenant=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
  if(tenant.slug!=="palmetto-playhouse")throw new BookingError("Parent booking is not configured for this venue.");
  const parent=await tx.parent.findFirst({where:{tenantId,authUserId:user.id},include:{family:true}});
  if(!parent||parent.family.status!=="ACTIVE")throw new FormError("Set up an active family before booking.",403);
  if(signing.signerEmail!==user.email.toLowerCase().trim()||signing.signerName.toLowerCase()!==`${parent.firstName} ${parent.lastName}`.trim().toLowerCase())throw new FormError("Sign using your parent profile name and verified email.",403);
  const fingerprint=signingHash({source:"PARENT_PORTAL",parentId:parent.id,childId,eventTypeId,packageId,eventDate,startTime,addOnIds,notes,quoteToken,signing});
  const existing=await tx.party.findFirst({where:{tenantId,bookingRequestId:requestId}});
  if(existing){
    const snapshot=existing.pricingSnapshot as {requestFingerprint?:string}|null;
    if(existing.primaryParentId!==parent.id||existing.familyId!==parent.familyId||snapshot?.requestFingerprint!==fingerprint)throw new BookingError("This request was already saved with different details. Start a new booking.",409);
    return parentBookingResult(existing);
  }
  if(!/^[0-9]{7,15}$/.test(normalizePhone(parent.phone??"")))throw new BookingError("Contact the venue to update your family phone number before booking.");
  const child=await tx.child.findFirst({where:{id:childId,tenantId,familyId:parent.familyId,active:true}});
  if(!child)throw new FormError("Choose a child from your own family.",403);
  const coverage=await tx.waiverChild.findFirst({where:{childId:child.id,status:"VALID",signedAt:{not:null},waiver:{tenantId,familyId:parent.familyId,kind:"LIABILITY",status:"VALID",signedAt:{not:null},version:{not:null},OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}},orderBy:{signedAt:"desc"}});
  if(!coverage)throw new BookingError("Complete the liability waiver for this child before booking.",409);
  const pending=await tx.party.count({where:{tenantId,primaryParentId:parent.id,status:"PENDING",OR:[{confirmationExpiresAt:null},{confirmationExpiresAt:{gt:new Date()}}]}});
  if(pending>=2)throw new BookingError("You already have two pending bookings. Cancel an unused hold or contact the venue.",409);
  const options=await bookingOptions(tx,tenant,{eventTypeId,packageId,addOnIds,eventDate});
  if(parentQuoteToken(options,scheduleFrom(tenant.bookingSettings).setupMinutes)!==quoteToken)throw new BookingError("Prices or setup details have changed. Go back and check availability again before signing.",409);
  const slot=options.slots.find(s=>s.time===startTime);
  if(!slot?.available)throw new BookingError("That time is no longer available. Go back and choose another time.",409);
  if(await tx.waiver.findFirst({where:{tenantId,requestId:signing.requestId}}))throw new FormError("This signature submission has already been used. Close and reopen the agreement.",409);
  const childName=`${child.firstName} ${child.lastName}`;
  const party=await tx.party.create({data:{
    tenantId,familyId:parent.familyId,primaryParentId:parent.id,bookingRequestId:requestId,eventNumber:`EVT-${randomUUID().toUpperCase()}`,
    eventTypeId,packageId,title:`${childName}'s party`,guestOfHonor:childName,packageName:options.pkg.name,
    eventDate:slot.eventDate,startTime:slot.startTime,endTime:slot.endTime,setupStartsAt:slot.setupStartsAt,
    status:"PENDING",workflowStep:"AWAITING_DEPOSIT",depositStatus:"PENDING",depositAmount:new Prisma.Decimal(options.quote.depositDue),balanceDue:new Prisma.Decimal(options.quote.total),
    confirmationExpiresAt:new Date(Date.now()+48*60*60*1000),notes:notes||null,
    pricingSnapshot:{...options.quote,source:"PARENT_PORTAL",requestFingerprint:fingerprint,hostChildId:child.id,timezone:tenant.timezone,customer:{firstName:parent.firstName,lastName:parent.lastName,email:user.email,phone:parent.phone}},
  }});
  await saveSignedForm(tx,{tenantId,familyId:parent.familyId,parentId:parent.id,kind:"RENTAL",signing,validityDays:null,children:[],partyId:party.id,eventSnapshot:{title:party.title,childId:child.id,childName,packageName:options.pkg.name,setupStartsAt:slot.setupStartsAt.toISOString(),startTime:slot.startTime.toISOString(),endTime:slot.endTime.toISOString(),timezone:tenant.timezone,...options.quote}});
  for(const addOn of options.addOns)await tx.partyAddOnItem.create({data:{tenantId,partyId:party.id,partyAddOnId:addOn.id,quantity:1,unitPrice:addOn.price,totalPrice:addOn.price}});
  await tx.partyGuest.create({data:{tenantId,partyId:party.id,childId:child.id,guestName:childName,parentName:`${parent.firstName} ${parent.lastName}`,guestEmail:user.email,guestPhone:parent.phone,waiverChildId:coverage.id,waiverStatus:"SIGNED",waiverSignedAt:coverage.signedAt,notes:"Hosting child"}});
  await tx.eventTimelineItem.create({data:{tenantId,partyId:party.id,title:"Parent booking awaiting deposit",icon:"…",body:"Rental agreement signed. Temporary hold expires in 48 hours. No payment collected; checkout is not connected and this party is not confirmed.",metadata:{source:"parent-portal"}}});
  return parentBookingResult(party);
}
