import {normalizeCommerceSettings} from "@/lib/commerce-settings";
import {preparePartyMessages} from "@/lib/communications/service";
import {confirmReadyBooking} from "./confirmation";
import {assertModule} from "@/lib/operations/guards";
import {tenantForms} from "@/lib/operations/settings";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { bookingOptions } from "./service";
import { BookingError, normalizePhone, scheduleFrom } from "./rules";
import { FormError, saveSignedForm, signingHash, validateSigning } from "@/lib/waivers/signing";

export function bookingQuoteToken(options: Awaited<ReturnType<typeof bookingOptions>>, setupMinutes: number) {
  return signingHash({quote: options.quote, duration: options.pkg.durationMinutes ?? 120, addOns: options.addOns.map(a => ({id:a.id,duration:a.durationMinutes})), timezone: options.timezone, setupMinutes});
}

export function bookingResult(party: {
  id:string; eventNumber:string|null; title:string; status:string; startTime:Date; endTime:Date;
  confirmationExpiresAt:Date|null; depositAmount:unknown; depositStatus:string; balanceDue:unknown; payments?:{amount:unknown}[];
},applyDepositToBalance=true) {
  const unpaidDeposit=Math.max(0,Math.round(Number(party.depositAmount)*100)-(party.payments??[]).reduce((n,p)=>n+Math.round(Number(p.amount)*100),0));
  const depositCents=applyDepositToBalance?Math.min(unpaidDeposit,Math.max(0,Math.round(Number(party.balanceDue)*100))):unpaidDeposit;
  return {id:party.id,eventNumber:party.eventNumber,title:party.title,status:party.status,startTime:party.startTime,endTime:party.endTime,expiresAt:party.confirmationExpiresAt,depositDue:party.depositStatus==="PENDING"?depositCents/100:0,balanceDue:Number(party.balanceDue)};
}

export async function currentBookingResult(tx:Prisma.TransactionClient,party:Parameters<typeof bookingResult>[0]&{tenantId:string}){
 const settings=normalizeCommerceSettings(await tx.commerceSettings.findUnique({where:{tenantId:party.tenantId}})??{});
 return bookingResult(party,settings.depositRules.applyDepositToBalance);
}

export type BookingActor={kind:"parent";user:{id:string;email:string}}|{kind:"staff";staff:{tenantId:string;employeeId:string;name:string}};
export async function createBooking(tx:Prisma.TransactionClient,tenantId:string,actor:BookingActor,input:unknown){
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BookingError("Invalid booking request.");
  const body = input as Record<string,unknown>;
  const text = (key:string,max=100) => {const value=body[key];if(typeof value!=="string"||!value.trim()||value.length>max)throw new BookingError(`Choose a valid ${key}.`);return value.trim();};
  const requestId=text("requestId");
  if(!/^[A-Za-z0-9-]{16,100}$/.test(requestId))throw new BookingError("Refresh the booking form and try again.");
  if(actor.kind==="staff"&&actor.staff.tenantId!==tenantId)throw new FormError("Staff access belongs to another business.",403);
  const childId=text("childId"), eventTypeId=text("eventTypeId"), packageId=text("packageId"), eventDate=text("eventDate"), startTime=text("startTime"), quoteToken=text("quoteToken");
  if(!Array.isArray(body.addOnIds)||body.addOnIds.length>50||body.addOnIds.some(id=>typeof id!=="string"||id.length>100)||new Set(body.addOnIds).size!==body.addOnIds.length)throw new BookingError("Choose each add-on only once.");
  const addOnIds=(body.addOnIds as string[]).slice().sort();
  if(body.notes!==undefined&&(typeof body.notes!=="string"||body.notes.length>2000))throw new BookingError("Party notes must be under 2,000 characters.");
  if(body.depositWaived!==undefined&&typeof body.depositWaived!=="boolean")throw new BookingError("Choose a valid deposit setting.");
  const waived=body.depositWaived===true;
  if(waived&&actor.kind!=="staff")throw new FormError("Only venue staff can waive a deposit.",403);
  const waiverReason=waived?text("depositWaiverReason",500):"";
  const source=actor.kind==="parent"?"PARENT_PORTAL":"STAFF_BOOKING";
  const notes=typeof body.notes==="string"?body.notes.trim():"";
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`);
  const tenant=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});
  if(!tenantForms(tenant)?.rental||!tenantForms(tenant)?.liability)throw new BookingError("Booking forms are not configured for this venue.");
  const form=tenantForms(tenant)!.rental!;
  const signing=validateSigning(body.signing,"RENTAL",form);
  const parent=await tx.parent.findFirst({where:actor.kind==="parent"?{tenantId,authUserId:actor.user.id}:{tenantId,id:text("parentId"),familyId:text("familyId")},include:{family:true}});
  if(!parent||parent.family.status!=="ACTIVE")throw new FormError("Set up an active family before booking.",403);
  const signerEmail=actor.kind==="parent"?actor.user.email.trim().toLowerCase():parent.email?.trim().toLowerCase()||signing.signerEmail;
  if(signing.signerEmail!==signerEmail||signing.signerName.toLowerCase()!==`${parent.firstName} ${parent.lastName}`.trim().toLowerCase())throw new FormError("The hosting parent must sign using their saved full name and email.",403);
  const fingerprint=signingHash({source,...(actor.kind==="staff"?{staffId:actor.staff.employeeId,waived,waiverReason}:{}),parentId:parent.id,childId,eventTypeId,packageId,eventDate,startTime,addOnIds,notes,quoteToken,signing});
  const existing=await tx.party.findFirst({where:{tenantId,bookingRequestId:requestId},include:{payments:{where:{status:"PAID",purpose:"DEPOSIT"},select:{amount:true}}}});
  if(existing){
    const snapshot=existing.pricingSnapshot as {requestFingerprint?:string}|null;
    if(existing.primaryParentId!==parent.id||existing.familyId!==parent.familyId||snapshot?.requestFingerprint!==fingerprint)throw new BookingError("This request was already saved with different details. Start a new booking.",409);
    return currentBookingResult(tx,existing);
  }
  await assertModule(tx,tenantId,"parties");
  if(!/^[0-9]{7,15}$/.test(normalizePhone(parent.phone??"")))throw new BookingError("Contact the venue to update your family phone number before booking.");
  const child=await tx.child.findFirst({where:{id:childId,tenantId,familyId:parent.familyId,active:true}});
  if(!child)throw new FormError("Choose a child from your own family.",403);
  const coverage=await tx.waiverChild.findFirst({where:{childId:child.id,status:"VALID",signedAt:{not:null},waiver:{tenantId,familyId:parent.familyId,kind:"LIABILITY",status:"VALID",signedAt:{not:null},version:{not:null},OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]}},orderBy:{signedAt:"desc"}});
  if(!coverage)throw new BookingError("Complete the liability waiver for this child before booking.",409);
  const pending=actor.kind==="parent"?await tx.party.count({where:{tenantId,primaryParentId:parent.id,status:"PENDING",OR:[{confirmationExpiresAt:null},{confirmationExpiresAt:{gt:new Date()}}]}}):0;
  if(pending>=2)throw new BookingError("You already have two pending bookings. Cancel an unused hold or contact the venue.",409);
  const options=await bookingOptions(tx,tenant,{eventTypeId,packageId,addOnIds,eventDate,waived});
  if(bookingQuoteToken(options,scheduleFrom(tenant.bookingSettings).setupMinutes)!==quoteToken)throw new BookingError("Prices or setup details have changed. Go back and check availability again before signing.",409);
  const slot=options.slots.find(s=>s.time===startTime);
  if(!slot?.available)throw new BookingError("That time is no longer available. Go back and choose another time.",409);
  if(await tx.waiver.findFirst({where:{tenantId,requestId:signing.requestId}}))throw new FormError("This signature submission has already been used. Close and reopen the agreement.",409);
  if(actor.kind==="staff"&&!parent.email)await tx.parent.update({where:{id:parent.id,tenantId},data:{email:signerEmail}});
  const childName=`${child.firstName} ${child.lastName}`;
  const party=await tx.party.create({data:{
    tenantId,familyId:parent.familyId,primaryParentId:parent.id,bookingRequestId:requestId,eventNumber:`EVT-${randomUUID().toUpperCase()}`,
    eventTypeId,packageId,title:`${childName}'s party`,guestOfHonor:childName,packageName:options.pkg.name,
    eventDate:slot.eventDate,startTime:slot.startTime,endTime:slot.endTime,setupStartsAt:slot.setupStartsAt,
    status:"PENDING",workflowStep:"AWAITING_DEPOSIT",depositStatus:waived?"WAIVED":"PENDING",depositAmount:new Prisma.Decimal(options.quote.depositDue),balanceDue:new Prisma.Decimal(options.quote.total),
    confirmationExpiresAt:new Date(Date.now()+48*60*60*1000),notes:notes||null,
    pricingSnapshot:{...options.quote,source,...(actor.kind==="staff"?{staffId:actor.staff.employeeId,depositWaived:waived,depositWaiverReason:waiverReason}:{}),requestFingerprint:fingerprint,hostChildId:child.id,timezone:tenant.timezone,customer:{firstName:parent.firstName,lastName:parent.lastName,email:signerEmail,phone:parent.phone}},
  }});
  await saveSignedForm(tx,{tenantId,familyId:parent.familyId,parentId:parent.id,kind:"RENTAL",form,signing,validityDays:null,identityMethod:actor.kind==="parent"?"VERIFIED_ACCOUNT":"IN_PERSON_GUARDIAN",...(actor.kind==="staff"?{witness:{staffId:actor.staff.employeeId,name:actor.staff.name}}:{}),children:[],partyId:party.id,eventSnapshot:{title:party.title,childId:child.id,childName,packageName:options.pkg.name,setupStartsAt:slot.setupStartsAt.toISOString(),startTime:slot.startTime.toISOString(),endTime:slot.endTime.toISOString(),timezone:tenant.timezone,depositWaived:waived,depositWaiverReason:waiverReason,...options.quote}});
  for(const addOn of options.addOns)await tx.partyAddOnItem.create({data:{tenantId,partyId:party.id,partyAddOnId:addOn.id,quantity:1,unitPrice:addOn.price,totalPrice:addOn.price}});
  await tx.partyGuest.create({data:{tenantId,partyId:party.id,childId:child.id,guestName:childName,parentName:`${parent.firstName} ${parent.lastName}`,guestEmail:signerEmail,guestPhone:parent.phone,waiverChildId:coverage.id,waiverStatus:"SIGNED",waiverSignedAt:coverage.signedAt,notes:"Hosting child"}});
  await tx.eventTimelineItem.create({data:{tenantId,partyId:party.id,title:actor.kind==="parent"?"Parent booking awaiting deposit":"Staff booking with hosting parent signature",icon:"…",body:waived?`Rental agreement signed. Staff waived the deposit: ${waiverReason}. No money collected.`:options.quote.depositDue>0?"Rental agreement signed. Temporary hold expires in 48 hours. No payment collected. Complete the deposit from the booking checkout or parent portal.":"Rental agreement signed. No deposit is required; no money collected.",metadata:{source,...(actor.kind==="staff"?{staffId:actor.staff.employeeId}:{}),depositWaived:waived,depositWaiverReason:waiverReason}}});
  await confirmReadyBooking(tx,tenantId,party.id);
  await preparePartyMessages(tx,tenantId,party.id);
  return currentBookingResult(tx,await tx.party.findUniqueOrThrow({where:{id:party.id,tenantId},include:{payments:{where:{status:"PAID",purpose:"DEPOSIT"},select:{amount:true}}}}));
}
