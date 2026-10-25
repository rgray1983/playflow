import type {Prisma} from "@/generated/prisma/client";
import {tenantForms} from "@/lib/operations/settings";
import {bookingOptions} from "./service";
import {BookingError,scheduleFrom} from "./rules";
import {bookingQuoteToken} from "./reservation";
type Venue={id:string;slug:string;timezone:string;bookingSettings:unknown;operationalSettings?:unknown};
export async function bookingCatalog(tx:Prisma.TransactionClient,tenant:Venue){
 const forms=tenantForms(tenant);if(!forms?.liability||!forms.rental)throw new BookingError("Publish the liability waiver and party rental agreement in Company Settings before booking.",409);
 const [eventTypes,packages,addOns]=await Promise.all([
 tx.eventType.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},select:{id:true,name:true,description:true}}),
 tx.package.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},select:{id:true,eventTypeId:true,name:true,description:true,price:true,durationMinutes:true,guestLimit:true}}),
 tx.partyAddOn.findMany({where:{tenantId:tenant.id,active:true},orderBy:{name:"asc"},select:{id:true,name:true,description:true,price:true,durationMinutes:true}}),
 ]);
 return {forms,eventTypes,packages:packages.map(p=>({...p,price:Number(p.price)})),addOns:addOns.map(a=>({...a,price:Number(a.price)})),setupMinutes:scheduleFrom(tenant.bookingSettings).setupMinutes};
}
export async function bookingAvailability(tx:Prisma.TransactionClient,tenant:Venue,query:URLSearchParams,waived=false){
 const options=await bookingOptions(tx,tenant,{eventTypeId:query.get("eventTypeId")??"",packageId:query.get("packageId")??"",eventDate:query.get("date")??"",addOnIds:query.getAll("addOnId"),waived});
 const setupMinutes=scheduleFrom(tenant.bookingSettings).setupMinutes;
 return {slots:options.slots,quote:options.quote,timezone:tenant.timezone,setupMinutes,quoteToken:bookingQuoteToken(options,setupMinutes)};
}
