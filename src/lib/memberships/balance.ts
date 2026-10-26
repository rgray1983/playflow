import type {Prisma} from "@/generated/prisma/client";
export type BalanceMembership={id:string;tenantId:string;familyId:string;startsAt:Date;termsSnapshot?:unknown;visitCreditAdjustment?:number;membershipPlan:{tenantId:string;visitLimit:number|null}|null};
export async function membershipBalance(tx:Prisma.TransactionClient,m:BalanceMembership){
 const terms=m.termsSnapshot as {version?:number;visitLimit?:number|null}|null;
 const base=terms?.version===1?terms.visitLimit:m.membershipPlan?.tenantId===m.tenantId?m.membershipPlan.visitLimit:undefined;
 const adjustment=m.visitCreditAdjustment??0;
 if(base!==null&&(typeof base!=="number"||!Number.isSafeInteger(base)||base<0)||!Number.isSafeInteger(adjustment))return {valid:false,baseLimit:null,totalLimit:null,adjustment,used:0,remaining:null};
 const used=await tx.visit.count({where:{tenantId:m.tenantId,familyId:m.familyId,membershipId:m.id,status:{not:"CANCELLED"},checkedInAt:{gte:m.startsAt}}});
 const totalLimit=base===null?null:base!+adjustment;
 if(totalLimit!==null&&(!Number.isSafeInteger(totalLimit)||totalLimit<0))return {valid:false,baseLimit:base??null,totalLimit,adjustment,used,remaining:null};
 return {valid:true,baseLimit:base??null,totalLimit,adjustment,used,remaining:totalLimit===null?null:Math.max(0,totalLimit-used)};
}
