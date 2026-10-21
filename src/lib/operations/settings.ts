import type {FormKind,LegalForm} from "@/lib/waivers/forms";
import {legalForm} from "@/lib/waivers/forms";
export const configurableModules=["admissions","parties","memberships","retail"] as const;
export type ModuleKey=typeof configurableModules[number];
export type Operations={forms?:Partial<Record<FormKind,LegalForm>>;modules?:Partial<Record<ModuleKey,boolean>>;communications?:{enabled:boolean;reminderHours:number}};
export function operations(value:unknown):Operations{return value&&typeof value==="object"&&!Array.isArray(value)?value as Operations:{};}
export function tenantForms(tenant:{slug:string;operationalSettings?:unknown}){
 const saved=operations(tenant.operationalSettings).forms;
 const liability=saved?.LIABILITY??(tenant.slug==="palmetto-playhouse"?legalForm("LIABILITY"):null);
 const rental=saved?.RENTAL??(tenant.slug==="palmetto-playhouse"?legalForm("RENTAL"):null);
 return liability||rental?{liability,rental}:null;
}
export function moduleEnabled(value:unknown,key:ModuleKey){return operations(value).modules?.[key]!==false;}
export function validateFormContent(value:unknown,kind:FormKind):Omit<LegalForm,"version">{
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Enter the form content.");
 const v=value as Record<string,unknown>;
 const text=(x:unknown,name:string,max:number)=>{if(typeof x!=="string"||!x.trim()||x.length>max)throw new Error(`Enter ${name} (up to ${max} characters).`);return x.trim();};
 if(!Array.isArray(v.clauses)||!v.clauses.length||v.clauses.length>30)throw new Error("Add 1–30 required sections.");
 const clauses=v.clauses.map((c:unknown)=>{if(!Array.isArray(c)||c.length!==3)throw new Error("Each section needs an ID, title and wording.");return [text(c[0],"section ID",60),text(c[1],"section title",200),text(c[2],"section wording",10000)] as [string,string,string];});
 if(new Set(clauses.map(c=>c[0])).size!==clauses.length||clauses.some(c=>!/^[-a-zA-Z0-9_]+$/.test(c[0])))throw new Error("Section IDs must be unique letters, numbers, hyphens or underscores.");
 return {kind,title:text(v.title,"a form title",200),notice:text(v.notice,"a notice",2000),clauses,photoConsentText:kind==="LIABILITY"&&v.photoConsentText?text(v.photoConsentText,"photo consent wording",2000):null,signatureConsentText:text(v.signatureConsentText,"electronic signature consent",2000)};
}
