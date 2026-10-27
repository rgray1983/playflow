import {deliveryIssues} from "@/lib/communications/delivery-events";
import {prisma} from "@/lib/prisma";
import {collections,reportRange} from "./daily";
export async function dashboardFinance(tenantId:string,timezone:string,day:string){
 const range=reportRange(day,timezone),source={OR:[{providerMode:null},{providerMode:"live"}]};
 const [counter,party,refunds,sandboxCounter,sandboxParty,pending,unpaidParties,messages]=await Promise.all([
  prisma.counterPayment.aggregate({where:{tenantId,collectedAt:range,...source},_sum:{amountCents:true}}),
  prisma.eventPayment.aggregate({where:{tenantId,collectedAt:range,status:"PAID",...source},_sum:{amount:true}}),
  prisma.paymentRefund.aggregate({where:{tenantId,mode:"live",status:"COMPLETED",completedAt:range},_sum:{amountCents:true}}),
  prisma.counterPayment.aggregate({where:{tenantId,collectedAt:range,providerMode:"sandbox"},_sum:{amountCents:true}}),
  prisma.eventPayment.aggregate({where:{tenantId,collectedAt:range,status:"PAID",providerMode:"sandbox"},_sum:{amount:true}}),
  prisma.providerCheckout.count({where:{tenantId,status:{in:["PENDING","REVIEW"]}}}),
  prisma.party.findMany({where:{tenantId,startTime:range,balanceDue:{gt:0},status:{notIn:["CANCELLED","COMPLETED"]},OR:[{status:{not:"PENDING"}},{confirmationExpiresAt:null},{confirmationExpiresAt:{gt:new Date()}}]},orderBy:{startTime:"asc"},take:5,select:{id:true,title:true,balanceDue:true,depositStatus:true}}),
  prisma.bookingMessage.count({where:{tenantId,OR:[{status:{in:["FAILED","REVIEW"]}},{deliveryStatus:{in:deliveryIssues}}]}}),
 ]);
 return {...collections(counter._sum.amountCents??0,Math.round(Number(party._sum.amount??0)*100),refunds._sum.amountCents??0),sandboxCents:(sandboxCounter._sum.amountCents??0)+Math.round(Number(sandboxParty._sum.amount??0)*100),pending,messages,unpaidParties:unpaidParties.map(p=>({...p,balanceCents:Math.round(Number(p.balanceDue)*100),balanceDue:undefined}))};
}
