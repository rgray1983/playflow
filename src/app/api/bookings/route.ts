import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffTenant,withStaff} from "@/lib/auth/staff";
import {bookingCatalog,bookingAvailability} from "@/lib/booking/catalog";
import {currentBookingResult} from "@/lib/booking/reservation";
import {createStaffBookingResponse} from "@/lib/booking/staff";
import {BookingError} from "@/lib/booking/rules";
import {recordId,validCoverageWhere} from "@/lib/visits/service";
import {FormError} from "@/lib/waivers/signing";
async function get(request:Request){try{
 const tenant=await getStaffTenant();if(!tenant)throw new BookingError("Business not found.",404);
 const q=new URL(request.url).searchParams;
 if(q.has("familyId")){
  const familyId=recordId(q.get("familyId"),"a family");
  const family=await prisma.family.findFirst({where:{id:familyId,tenantId:tenant.id,status:"ACTIVE"},select:{id:true,name:true,parents:{orderBy:{createdAt:"asc"},select:{id:true,firstName:true,lastName:true,email:true,phone:true}},children:{where:{active:true},orderBy:{firstName:"asc"},select:{id:true,firstName:true,lastName:true,waivers:{where:validCoverageWhere(tenant.id,familyId),take:1,select:{id:true}}}}}});
  if(!family)throw new BookingError("Active family not found.",404);
  return NextResponse.json({family});
 }
 if(q.has("q")){
  const search=q.get("q")!.trim();if(search.length>254)throw new BookingError("Search text is too long.");if(search.length<2)return NextResponse.json({families:[]});
  const terms=search.split(/\s+/).slice(0,5);
  const families=await prisma.family.findMany({where:{tenantId:tenant.id,status:"ACTIVE",AND:terms.map(term=>({OR:[{name:{contains:term,mode:"insensitive"}},{parents:{some:{OR:[{firstName:{contains:term,mode:"insensitive"}},{lastName:{contains:term,mode:"insensitive"}},{email:{contains:term,mode:"insensitive"}},{phone:{contains:term}}]}}},{children:{some:{active:true,OR:[{firstName:{contains:term,mode:"insensitive"}},{lastName:{contains:term,mode:"insensitive"}}]}}}]}))},select:{id:true,name:true,parents:{take:2,select:{firstName:true,lastName:true,email:true}}},take:20,orderBy:{name:"asc"}});
  return NextResponse.json({families});
 }
 if(q.has("partyId")){
  const party=await prisma.party.findFirst({where:{id:recordId(q.get("partyId"),"a booking"),tenantId:tenant.id},include:{payments:{where:{status:"PAID",purpose:"DEPOSIT"},select:{amount:true}}}});
  if(!party)throw new BookingError("Booking not found.",404);return NextResponse.json({booking:await currentBookingResult(prisma,party)});
 }
 return NextResponse.json(q.has("date")?await bookingAvailability(prisma,tenant,q,q.get("waived")==="true"):await bookingCatalog(prisma,tenant));
 }catch(e){if(e instanceof BookingError||e instanceof FormError)return NextResponse.json({error:e.message},{status:e.status});throw e;}}
export const GET = withStaff("parties.write",get);
export const POST = withStaff("parties.write",createStaffBookingResponse);
