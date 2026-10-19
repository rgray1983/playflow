import {Prisma} from "@/generated/prisma/client";
import {FormError} from "@/lib/waivers/signing";
export type PaymentExecution={validateOnly?:boolean;providerCheckoutId?:string;sourceLabel?:string;sourceMode?:"sandbox"|"live"};
export async function assertNoPendingPayment(tx:Prisma.TransactionClient,tenantId:string,keys:string[],except?:string){
 const rows=await tx.$queryRaw<{id:string}[]>(Prisma.sql`SELECT id FROM "ProviderCheckout" WHERE "tenantId"=${tenantId} AND status IN ('PENDING','REVIEW') AND "targetKeys" && ARRAY[${Prisma.join(keys)}]::text[] AND id <> ${except??""} LIMIT 1`);
 if(rows.length)throw new FormError("A Square payment is pending or needs review for this bill. Check its status before collecting again.",409);
}
