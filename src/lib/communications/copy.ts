export const emailKinds = ["HOLD", "CONFIRMATION", "REMINDER"] as const;
export type EmailKind = typeof emailKinds[number];
export type EmailCopy = {subject: string; introduction: string; closing: string};
export type EmailTemplates = Record<EmailKind, EmailCopy>;
export const emailCopyLimits = {subject:160, introduction:1200, closing:800} as const;
export function defaultEmailCopy(kind: EmailKind): EmailCopy {
  const closing = kind === "HOLD" ? "Need a hand finishing your booking? Contact the venue and we’ll help you get ready." : "We can’t wait to celebrate with you. Questions before the big day? Contact the venue and we’ll be happy to help.";
  switch(kind) {
    case "HOLD": return {subject:"party reservation on hold",introduction:"Complete your rental agreement and required deposit in the parent portal to secure your celebration.",closing};
    case "CONFIRMATION": return {subject:"party booking confirmed",introduction:"We’re looking forward to celebrating with you! Your booking details and everything you need to get ready are below.",closing};
    case "REMINDER": return {subject:"your party is coming up",introduction:"Your celebration is getting close. Review your booking, current balance and guest attendance in your parent portal, and share your invitation with any guests who still need to RSVP.",closing};
  }
}
function field(value: unknown, key: keyof EmailCopy) {
  if(typeof value!=="string"||value.length>emailCopyLimits[key]||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new Error(`Enter ${key} text up to ${emailCopyLimits[key]} characters.`);
  if(key==="subject"&&/[\r\n]/.test(value))throw new Error("Keep the subject on one line.");
  const normalized=value.replace(/\r\n?/g,"\n").trim();
  if(key!=="closing"&&!normalized)throw new Error(`Enter the email ${key}.`);
  return normalized;
}
export function validateEmailCopy(value: unknown): EmailCopy {
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Enter the email wording.");
  const raw=value as Record<string,unknown>;
  if(Object.keys(raw).some(key=>!Object.hasOwn(emailCopyLimits,key)))throw new Error("Only the subject, introduction and closing can be edited.");
  return {subject:field(raw.subject,"subject"),introduction:field(raw.introduction,"introduction"),closing:field(raw.closing,"closing")};
}
export function resolveEmailCopy(kind: EmailKind, value: unknown): EmailCopy {
  const result=defaultEmailCopy(kind);
  if(value&&typeof value==="object"&&!Array.isArray(value))for(const key of Object.keys(result) as (keyof EmailCopy)[]) {
    try {result[key]=field((value as Record<string,unknown>)[key],key);}catch {/* Invalid legacy settings use the standard wording for this field. */}
  }
  return result;
}
export function emailTemplates(value: unknown): EmailTemplates {
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  return Object.fromEntries(emailKinds.map(kind=>[kind,resolveEmailCopy(kind,raw[kind])])) as EmailTemplates;
}
