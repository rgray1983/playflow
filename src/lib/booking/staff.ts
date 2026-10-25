import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getStaffContext} from "@/lib/auth/staff";
import {BookingError} from "./rules";
import {FormError} from "@/lib/waivers/signing";
import {createBooking} from "./reservation";
export async function createStaffBookingResponse(request:Request){
 try{
  let body;try{body=await request.json();}catch{throw new BookingError("Invalid booking request.");}
  const staff=getStaffContext();
  const booking=await prisma.$transaction(tx=>createBooking(tx,staff.tenantId,{kind:"staff",staff},body),{maxWait:10000,timeout:15000});
  return NextResponse.json({booking});
 }catch(error){if(error instanceof BookingError||error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});throw error;}
}
