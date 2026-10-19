import type {Prisma} from "@/generated/prisma/client";
import {FormError,signingHash} from "@/lib/waivers/signing";
import {recordId,visitRequestId,lockVisits,type VisitStaff} from "@/lib/visits/service";
import {quoteMixedCounter} from "./quote";
import {normalizeCommerceSettings} from "@/lib/commerce-settings";
type DB=Prisma.TransactionClient;
export type ProductEntry={productId:string;quantity:number};
export type CustomEntry={id:string;name:string;amountCents:number;quantity:number;profile:string};
export function productFields(input:Record<string,unknown>){
 if(typeof input.name!=="string"||!input.name.trim()||input.name.trim().length>100)throw new FormError("Enter a product name (up to 100 characters).");
 if(!["SNACK","RETAIL"].includes(String(input.category)))throw new FormError("Choose Snacks or Retail.");
 if(!Number.isSafeInteger(input.priceCents)||Number(input.priceCents)<0||Number(input.priceCents)>100000000)throw new FormError("Enter a valid product price.");
 if(typeof input.active!=="boolean")throw new FormError("Choose whether this product is available.");
 return{name:input.name.trim(),category:String(input.category),priceCents:Number(input.priceCents),active:input.active};
}
export async function saveCounterProduct(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
 const fields=productFields(input);await lockVisits(tx,staff.tenantId);
 if(input.id){const id=recordId(input.id,"a product"),product=await tx.counterProduct.findFirst({where:{id,tenantId:staff.tenantId}});if(!product)throw new FormError("Product not found.",404);
 if(typeof input.updatedAt!=="string"||product.updatedAt.toISOString()!==input.updatedAt)throw new FormError("This product changed. Refresh before editing.",409);
 return tx.counterProduct.update({where:{id,tenantId:staff.tenantId},data:{...fields,updatedBy:staff.employeeId}});}
 // A new-product request uses its UUID as the product ID to make retries safe.
 const id=visitRequestId(input.requestId),existing=await tx.counterProduct.findFirst({where:{id}});
 if(existing){if(existing.tenantId!==staff.tenantId||signingHash(productFields(existing))!==signingHash(fields))throw new FormError("This product request already saved different details.",409);return existing;}
 return tx.counterProduct.create({data:{id,tenantId:staff.tenantId,...fields,updatedBy:staff.employeeId}});
}
export async function productCartQuote(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
 if(!Array.isArray(input.products)||!Array.isArray(input.custom)||input.products.length+input.custom.length<1||input.products.length+input.custom.length>50)throw new FormError("Choose one to fifty items.");
 const quantity=(value:unknown)=>{if(!Number.isInteger(value)||Number(value)<1||Number(value)>99)throw new FormError("Item quantities must be between 1 and 99.");return Number(value);};
 const products=input.products.map(value=>{if(!value||typeof value!=="object"||Array.isArray(value))throw new FormError("Choose valid products.");return{productId:recordId(value.productId,"a product"),quantity:quantity(value.quantity)};}).sort((a,b)=>a.productId.localeCompare(b.productId));
 if(new Set(products.map(p=>p.productId)).size!==products.length)throw new FormError("List each product only once.");
 const custom=input.custom.map(value=>{if(!value||typeof value!=="object"||Array.isArray(value)||typeof value.name!=="string"||!value.name.trim()||value.name.length>100||!Number.isSafeInteger(value.amountCents)||value.amountCents<=0||value.amountCents>100000000||!["retail","services","admissions"].includes(value.profile))throw new FormError("Enter a valid description, positive custom amount and tax category.");return{id:recordId(value.id,"a custom item"),name:value.name.trim(),amountCents:Number(value.amountCents),quantity:quantity(value.quantity),profile:String(value.profile)};}).sort((a,b)=>a.id.localeCompare(b.id));
 if(new Set(custom.map(c=>c.id)).size!==custom.length)throw new FormError("List each custom item only once.");
 const rows=products.length?await tx.counterProduct.findMany({where:{tenantId:staff.tenantId,active:true,id:{in:products.map(p=>p.productId)}}}):[];
 if(rows.length!==products.length)throw new FormError("A selected product is unavailable. Refresh the catalog.",409);
 const lines=products.map(p=>{const row=rows.find(r=>r.id===p.productId)!;return{id:`product:${row.id}`,label:`${p.quantity} × ${row.name}`,priceCents:row.priceCents*p.quantity,profile:"retail"};}).concat(custom.map(c=>({id:`custom:${c.id}`,label:`${c.quantity} × ${c.name}`,priceCents:c.amountCents*c.quantity,profile:c.profile})));
 const settings=normalizeCommerceSettings(await tx.commerceSettings.findUnique({where:{tenantId:staff.tenantId}})??{}),quote=quoteMixedCounter(lines,settings);
 return{quote,products,custom,quoteHash:signingHash({products,custom,quote})};
}
