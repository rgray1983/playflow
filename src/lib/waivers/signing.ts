import { createHash } from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { FORM_VERSION, legalForm, type FormKind } from "./forms";
export class FormError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function validateSigning(input: unknown, kind: FormKind) {
  if (!input || typeof input !== "object") throw new FormError("Complete the signature form.");
  const value = input as Record<string, unknown>;
  const clean = (key: string, max: number) => { if (typeof value[key] !== "string" || !(value[key] as string).trim() || (value[key] as string).length > max) throw new FormError(`Enter a valid ${key}.`); return (value[key] as string).trim(); };
  const signerName = clean("signerName", 150), signerEmail = clean("signerEmail", 254).toLowerCase(), signature = clean("signature", 150), requestId = clean("requestId", 100);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail) || !/^[A-Za-z0-9-]{16,100}$/.test(requestId)) throw new FormError("Enter a valid email and submission ID.");
  if (value.version !== FORM_VERSION) throw new FormError("This form has changed. Reload it before signing.", 409);
  if (signature.toLocaleLowerCase() !== signerName.toLocaleLowerCase() || value.signatureConsent !== true) throw new FormError("Type your full name as your signature and confirm electronic signing.");
  const form = legalForm(kind);
  if (!Array.isArray(value.acknowledgments) || !form.clauses.every(clause => (value.acknowledgments as unknown[]).includes(clause[0]))) throw new FormError("Read and acknowledge every required section.");
  if (value.photoConsent !== undefined && typeof value.photoConsent !== "boolean") throw new FormError("Photo permission must be an explicit choice.");
  return { signerName, signerEmail, signature, requestId, photoConsent: kind === "LIABILITY" && value.photoConsent === true, acknowledgments: form.clauses.map(c => c[0]), version: FORM_VERSION, signatureConsent: true };
}
export function signingHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export async function saveSignedForm(tx: Prisma.TransactionClient, input: {
  tenantId: string; familyId: string; parentId: string; kind: FormKind; signing: ReturnType<typeof validateSigning>; validityDays: number | null;
  identityMethod?: "VERIFIED_ACCOUNT" | "INVITATION_FORM" | "IN_PERSON_GUARDIAN";
  witness?: {staffId:string;name:string};
  children: {id: string; firstName: string; lastName: string; dateOfBirth: Date | null}[]; partyId?: string; eventSnapshot?: Prisma.InputJsonValue;
}) {
  const signedAt = new Date();
  const form = legalForm(input.kind);
  const snapshot = { ...form, children: input.children.map(child => ({id: child.id, name: `${child.firstName} ${child.lastName}`.trim(), dateOfBirth: child.dateOfBirth?.toISOString() ?? null})), event: input.eventSnapshot ?? null };
  return tx.waiver.create({ data: {
    tenantId: input.tenantId, familyId: input.familyId, signedById: input.parentId, kind: input.kind, version: form.version, requestId: input.signing.requestId,
    requestHash: signingHash({signing: input.signing, childIds: input.children.map(c => c.id).sort(), partyId: input.partyId ?? null}),
    partyId: input.partyId, signerName: input.signing.signerName, signerEmail: input.signing.signerEmail, signature: input.signing.signature,
    waiverText: JSON.stringify(snapshot), acknowledgments: {required: input.signing.acknowledgments, electronicSignature: true, identityMethod: input.identityMethod ?? "VERIFIED_ACCOUNT", ...(input.witness?{witness:input.witness}:{}), photoConsentText: form.photoConsentText}, photoConsent: input.signing.photoConsent,
    signedAt, status: "VALID", expiresAt: input.kind === "LIABILITY" && input.validityDays != null ? new Date(signedAt.getTime() + input.validityDays * 86400000) : null,
    children: { create: input.children.map(child => ({childId: child.id, signedAt, status: "VALID", childNameSnapshot: `${child.firstName} ${child.lastName}`.trim(), dateOfBirthSnapshot: child.dateOfBirth})) },
  }, include: { children: true } });
}

export async function attachUpcomingCoverage(tx:Prisma.TransactionClient,tenantId:string,children:{id:string;childId:string;signedAt:Date|null}[]){
  for(const coverage of children)await tx.partyGuest.updateMany({where:{tenantId,childId:coverage.childId,status:"EXPECTED",rsvpStatus:{not:"DECLINED"},party:{tenantId,status:{notIn:["CANCELLED","COMPLETED"]},endTime:{gt:new Date()}}},data:{waiverChildId:coverage.id,waiverStatus:"SIGNED",waiverSignedAt:coverage.signedAt}});
}
