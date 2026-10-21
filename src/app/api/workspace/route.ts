import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext,getStaffTenant,withStaff} from "@/lib/auth/staff";
import {publicConnection} from "@/lib/payments/square/client";
import {workspaceSetup} from "@/lib/workspaces/status";
import {localDay,addDays} from "@/lib/calendar/dates";
import {bookingTime} from "@/lib/booking/rules";
async function get(){
 const staff=getStaffContext(),tenant=await getStaffTenant();
 if(!tenant)return NextResponse.json({error:"Business not found."},{status:404});
 const now=new Date(),today=localDay(now,tenant.timezone),start=bookingTime(today,"00:00",tenant.timezone,60).startTime,end=bookingTime(addDays(today,1),"00:00",tenant.timezone,60).startTime;
 const partyWhere={tenantId:tenant.id,status:{not:"CANCELLED" as const},OR:[{status:{not:"PENDING" as const}},{confirmationExpiresAt:null},{confirmationExpiresAt:{gt:now}}]};
 const [families,children,inside,partiesToday,admissions,eventTypes,packages,staffCount,payment,visits,events]=await Promise.all([
  prisma.family.count({where:{tenantId:tenant.id,status:"ACTIVE"}}),
  prisma.child.count({where:{tenantId:tenant.id,active:true,family:{tenantId:tenant.id,status:"ACTIVE"}}}),
  prisma.visit.count({where:{tenantId:tenant.id,status:"CHECKED_IN",checkedOutAt:null}}),
  prisma.party.count({where:{...partyWhere,startTime:{gte:start,lt:end}}}),
  prisma.admissionType.count({where:{tenantId:tenant.id,active:true}}),
  prisma.eventType.count({where:{tenantId:tenant.id,active:true}}),
  prisma.package.count({where:{tenantId:tenant.id,active:true}}),
  prisma.employee.count({where:{tenantId:tenant.id,status:"ACTIVE",accessApproved:true}}),
  publicConnection(tenant.id),
  prisma.visit.findMany({where:{tenantId:tenant.id,status:"CHECKED_IN",checkedOutAt:null},select:{id:true,checkedInAt:true,visitType:true,child:{select:{firstName:true,lastName:true}}},orderBy:[{checkedInAt:"desc"},{id:"asc"}],take:5}),
  prisma.party.findMany({where:{...partyWhere,startTime:{gte:start,lt:end}},select:{id:true,title:true,startTime:true,status:true},orderBy:[{startTime:"asc"},{id:"asc"}],take:5}),
 ]);
 const setup=workspaceSetup({profile:!!(tenant.phone&&tenant.email&&tenant.address1&&tenant.city),admissions,eventTypes,packages,staff:staffCount,forms:tenant.slug==="palmetto-playhouse",payment});
 return NextResponse.json({business:{name:tenant.name,slug:tenant.slug,timezone:tenant.timezone},role:staff.accessRole,metrics:{families,children,inside,partiesToday},visits,events,setup,billing:{status:"NOT_AVAILABLE",message:"PlayFlow subscription billing is not active. Venue customer payments through Square are separate."},payment:{mode:payment.mode,ready:payment.ready},today});
}
export const GET = withStaff("read",get);
