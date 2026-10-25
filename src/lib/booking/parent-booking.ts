import type {Prisma} from "@/generated/prisma/client";
import {createBooking} from "./reservation";
export {bookingQuoteToken as parentQuoteToken,bookingResult as parentBookingResult} from "./reservation";
export function createParentBooking(tx:Prisma.TransactionClient,tenantId:string,user:{id:string;email:string},input:unknown){return createBooking(tx,tenantId,{kind:"parent",user},input);}
