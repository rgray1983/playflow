import {FormError} from "@/lib/waivers/signing";
export function membershipPlanFields(input:unknown){
 if(!input||typeof input!=="object"||Array.isArray(input))throw new FormError("Enter valid membership details.");
 const body=input as Record<string,unknown>;
 if(typeof body.name!=="string"||!body.name.trim()||body.name.trim().length>100)throw new FormError("Enter a membership name (up to 100 characters).");
 const rawPrice=body.price==null||body.price===""?"0":String(body.price);
 if(!/^\d{1,7}(\.\d{1,2})?$/.test(rawPrice)||Number(rawPrice)>1000000)throw new FormError("Enter a non-negative membership price with up to two decimals.");
 const nullableInt=(value:unknown,label:string,max:number)=>{if(value==null||value==="")return null;if((typeof value!=="number"&&typeof value!=="string")||!Number.isInteger(Number(value))||Number(value)<1||Number(value)>max)throw new FormError(`${label} must be a positive whole number or blank.`);return Number(value);};
 const billingInterval=body.billingInterval??"NONE";
 if(billingInterval!=="NONE"&&billingInterval!=="MONTHLY"&&billingInterval!=="YEARLY")throw new FormError("Choose a supported billing interval.");
 if(body.description!=null&&(typeof body.description!=="string"||body.description.length>2000))throw new FormError("Description must be up to 2,000 characters.");
 if(body.active!=null&&typeof body.active!=="boolean"||body.autoRenewDefault!=null&&typeof body.autoRenewDefault!=="boolean")throw new FormError("Choose valid membership options.");
 return{name:body.name.trim(),description:typeof body.description==="string"?body.description.trim()||null:null,price:(Number(rawPrice)).toFixed(2),billingInterval:billingInterval as "NONE"|"MONTHLY"|"YEARLY",durationDays:nullableInt(body.durationDays,"Duration days",36500),visitLimit:nullableInt(body.visitLimit,"Visit limit",1000000),autoRenewDefault:(body.autoRenewDefault??false) as boolean,active:(body.active??true) as boolean};
}
