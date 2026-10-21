import type {Prisma} from "@/generated/prisma/client";
import {moduleEnabled,type ModuleKey} from "./settings";
import {FormError} from "@/lib/waivers/signing";
export async function assertModule(tx:Prisma.TransactionClient,tenantId:string,key:ModuleKey){const tenant=await tx.tenant.findUniqueOrThrow({where:{id:tenantId}});if(!moduleEnabled(tenant.operationalSettings,key))throw new FormError(`New ${key} activity is disabled in Company Settings. Existing records can still be completed.`,409);}
