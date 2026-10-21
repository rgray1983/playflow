import {Prisma} from "@/generated/prisma/client";
import {prisma} from "@/lib/prisma";
import {addDays,parseDay} from "@/lib/calendar/dates";
import {bookingTime} from "@/lib/booking/rules";
export function reportRange(day:string,timezone:string){parseDay(day);return {gte:bookingTime(day,"00:00",timezone,60).startTime,lt:bookingTime(addDays(day,1),"00:00",timezone,60).startTime};}
export function collections(counter:number,party:number,refunds:number){return {counterCents:counter,partyCents:party,grossCents:counter+party,refundCents:refunds,netCents:counter+party-refunds};}
export async function dailyReport(tenantId:string,timezone:string,day:string,mode:"live"|"sandbox"){
 const range=reportRange(day,timezone),source=mode==="sandbox"?{providerMode:"sandbox"}:{OR:[{providerMode:null},{providerMode:"live"}]};
 const [counter,party,refunds,counterPayments,partyPayments,checkouts,refundItems,unpaid,pending,forms]=await Promise.all([
  prisma.counterPayment.aggregate({where:{tenantId,collectedAt:range,...source},_sum:{amountCents:true}}),
  prisma.eventPayment.aggregate({where:{tenantId,collectedAt:range,status:"PAID",...source},_sum:{amount:true}}),
  prisma.paymentRefund.aggregate({where:{tenantId,mode,status:"COMPLETED",completedAt:range},_sum:{amountCents:true}}),
  prisma.counterPayment.findMany({where:{tenantId,collectedAt:range,...source},orderBy:[{collectedAt:"desc"},{id:"asc"}],take:100,select:{id:true,saleId:true,amountCents:true,methodLabel:true,providerMode:true,collectedAt:true,sale:{select:{family:{select:{name:true}}}}}}),
  prisma.eventPayment.findMany({where:{tenantId,collectedAt:range,status:"PAID",...source},orderBy:[{collectedAt:"desc"},{id:"asc"}],take:100,select:{id:true,partyId:true,amount:true,purpose:true,method:true,providerMode:true,collectedAt:true,party:{select:{title:true}}}}),
  prisma.providerCheckout.findMany({where:{tenantId,mode,status:"PAID",createdAt:range},orderBy:{createdAt:"desc"},take:100,select:{id:true,amountCents:true,receiptUrl:true,channel:true,createdAt:true,refunds:{select:{id:true,amountCents:true,status:true}}}}),
  prisma.paymentRefund.findMany({where:{tenantId,mode,OR:[{createdAt:range},{completedAt:range},{status:{in:["PENDING","REVIEW"]}}]},orderBy:{createdAt:"desc"},take:100,select:{id:true,checkoutId:true,amountCents:true,reason:true,status:true,createdAt:true,completedAt:true,staffName:true}}),
  prisma.$queryRaw<{kind:string;id:string;label:string;dueCents:number}[]>(Prisma.sql`
   SELECT 'counter' AS kind,s.id,f.name AS label,GREATEST(0,s."totalCents"-COALESCE(SUM(p."amountCents"),0))::integer AS "dueCents"
   FROM "CounterSale" s JOIN "Family" f ON f.id=s."familyId" LEFT JOIN "CounterPayment" p ON p."saleId"=s.id AND p."tenantId"=${tenantId}
   WHERE s."tenantId"=${tenantId} AND s.status='OPEN' GROUP BY s.id,f.name HAVING s."totalCents">COALESCE(SUM(p."amountCents"),0)
   UNION ALL SELECT 'party',id,title,ROUND("balanceDue"*100)::integer FROM "Party" WHERE "tenantId"=${tenantId} AND status NOT IN ('CANCELLED','COMPLETED') AND "balanceDue">0 AND (status<>'PENDING' OR "confirmationExpiresAt" IS NULL OR "confirmationExpiresAt">NOW())
   ORDER BY "dueCents" DESC,id ASC LIMIT 100`),
  prisma.providerCheckout.count({where:{tenantId,mode,status:{in:["PENDING","REVIEW"]}}}),
  prisma.party.count({where:{tenantId,status:{notIn:["CANCELLED","COMPLETED"]},startTime:range,signedForms:{none:{tenantId,kind:"RENTAL",status:"VALID",signedAt:{not:null}}}}}),
 ]);
 return {day,timezone,mode,summary:collections(counter._sum.amountCents??0,Math.round(Number(party._sum.amount??0)*100),refunds._sum.amountCents??0),counterPayments,partyPayments:partyPayments.map(p=>({...p,amountCents:Math.round(Number(p.amount)*100),amount:undefined})),checkouts,refunds:refundItems,unpaid,pending,missingAgreements:forms,limit:100};
}
