import {productCartQuote} from "./products";
import { Prisma } from "@/generated/prisma/client";
import { Temporal } from "@js-temporal/polyfill";
import { normalizeCommerceSettings } from "@/lib/commerce-settings";
import { FormError, signingHash } from "@/lib/waivers/signing";
import { lockVisits, recordId, visitRequestId, type VisitStaff } from "@/lib/visits/service";
import { cents, quoteCounter } from "./quote";
type DB = Prisma.TransactionClient;
export type MemberTerms = {
    version: 1;
    visitLimit: number | null;
    durationDays: number | null;
    billingInterval: "NONE" | "MONTHLY" | "YEARLY";
    timezone: string;
};
export function memberEnd(terms: MemberTerms, now: Date) {
    let local = Temporal.Instant.from(now.toISOString()).toZonedDateTimeISO(terms.timezone);
    if (terms.durationDays !== null)
        local = local.add({ days: terms.durationDays });
    else if (terms.billingInterval === "MONTHLY")
        local = local.add({ months: 1 });
    else if (terms.billingInterval === "YEARLY")
        local = local.add({ years: 1 });
    else
        return null;
    return new Date(local.toInstant().epochMilliseconds);
}
async function settingsFor(tx: DB, tenantId: string) { return normalizeCommerceSettings(await tx.commerceSettings.findUnique({ where: { tenantId } }) ?? {}); }
export async function membershipQuote(tx: DB, staff: VisitStaff, input: Record<string, unknown>) {
    const familyId = recordId(input.familyId, "a family"), planId = recordId(input.planId, "a membership plan"), childId = input.childId ? recordId(input.childId, "a child") : null;
    const [family, plan, tenant] = await Promise.all([tx.family.findFirst({ where: { id: familyId, tenantId: staff.tenantId, status: "ACTIVE" } }), tx.membershipPlan.findFirst({ where: { id: planId, tenantId: staff.tenantId, active: true } }), tx.tenant.findUniqueOrThrow({ where: { id: staff.tenantId } })]);
    if (!family || !plan)
        throw new FormError("Choose an active family and plan.", 404);
    if (childId && !await tx.child.findFirst({ where: { id: childId, tenantId: staff.tenantId, familyId, active: true } }))
        throw new FormError("Choose an active child in this family.", 404);
    if (plan.visitLimit !== null && (!Number.isInteger(plan.visitLimit) || plan.visitLimit <= 0) || plan.durationDays !== null && (!Number.isInteger(plan.durationDays) || plan.durationDays <= 0 || plan.durationDays > 36500))
        throw new FormError("Review this plan’s duration and visit limit in Company Settings.");
    const terms: MemberTerms = { version: 1, visitLimit: plan.visitLimit, durationDays: plan.durationDays, billingInterval: plan.billingInterval, timezone: tenant.timezone };
    const quote = quoteCounter([{ id: plan.id, label: plan.name, priceCents: cents(plan.price) }], "memberships", await settingsFor(tx, staff.tenantId));
    return { familyId, childId, plan, terms, quote, quoteHash: signingHash({ familyId, childId, planId: plan.id, updatedAt: plan.updatedAt, terms, quote }) };
}
async function createSale(tx: DB, staff: VisitStaff, data: {
    familyId: string;
    requestId: string;
    requestHash: string;
    kind: string;
    quote: ReturnType<typeof quoteCounter>;
    membershipId?: string;
}) {
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: staff.tenantId } }), settings = await settingsFor(tx, staff.tenantId), q = data.quote;
    return tx.counterSale.create({ data: { tenantId: staff.tenantId, familyId: data.familyId, requestId: data.requestId, requestHash: data.requestHash, kind: data.kind, status: q.totalCents === 0 ? "PAID" : "OPEN", subtotalCents: q.subtotalCents, taxCents: q.taxCents, feeCents: q.feeCents, totalCents: q.totalCents, quoteSnapshot: q, businessSnapshot: { name: tenant.name, phone: tenant.phone, email: tenant.email, address1: tenant.address1, city: tenant.city, state: tenant.state, zip: tenant.zip, timezone: tenant.timezone, footer: settings.receiptRules.footerText, policy: settings.receiptRules.refundPolicyText }, membershipId: data.membershipId, staffId: staff.employeeId, staffName: staff.name } });
}
export async function enrollMembership(tx: DB, staff: VisitStaff, input: Record<string, unknown>) {
    const requestId = visitRequestId(input.requestId), familyId = recordId(input.familyId, "a family");
    const hash = signingHash({ familyId, planId: input.planId, childId: input.childId || null, quoteHash: input.quoteHash });
    await lockVisits(tx, staff.tenantId);
    const existing = await tx.counterSale.findFirst({ where: { tenantId: staff.tenantId, requestId } });
    if (existing) {
        if (existing.requestHash !== hash || existing.kind !== "MEMBERSHIP")
            throw new FormError("This request already saved different details.", 409);
        return { saleId: existing.id, replayed: true };
    }
    const prepared = await membershipQuote(tx, staff, input);
    if (input.quoteHash !== prepared.quoteHash)
        throw new FormError("The plan or total changed. Review a fresh quote before enrolling.", 409);
    const now = new Date(), active = prepared.quote.totalCents === 0;
    const membership = await tx.membership.create({ data: { tenantId: staff.tenantId, familyId, childId: prepared.childId, membershipPlanId: prepared.plan.id, name: prepared.plan.name, status: active ? "ACTIVE" : "PENDING", startsAt: now, endsAt: active ? memberEnd(prepared.terms, now) : null, autoRenew: false, termsSnapshot: prepared.terms } });
    const sale = await createSale(tx, staff, { familyId, requestId, requestHash: hash, kind: "MEMBERSHIP", quote: prepared.quote, membershipId: membership.id });
    return { saleId: sale.id, replayed: false };
}
export async function billAdmissions(tx: DB, staff: VisitStaff, input: Record<string, unknown>) {
    const familyId = recordId(input.familyId, "a family"), requestId = visitRequestId(input.requestId);
    if (!Array.isArray(input.visitIds) || !input.visitIds.length || input.visitIds.length > 20 || input.visitIds.some(id => typeof id !== "string" || !id || id.length > 100) || new Set(input.visitIds).size !== input.visitIds.length)
        throw new FormError("Choose one to twenty admission visits.");
    const ids = (input.visitIds as string[]).toSorted(), hash = signingHash({ familyId, ids });
    await lockVisits(tx, staff.tenantId);
    const existing = await tx.counterSale.findFirst({ where: { tenantId: staff.tenantId, requestId } });
    if (existing) {
        if (existing.requestHash !== hash || existing.kind !== "ADMISSION")
            throw new FormError("This request already saved a different bill.", 409);
        return { saleId: existing.id, replayed: true };
    }
    if (!await tx.family.findFirst({ where: { id: familyId, tenantId: staff.tenantId, status: "ACTIVE" } }))
        throw new FormError("Active family not found.", 404);
    const visits = await tx.visit.findMany({ where: { tenantId: staff.tenantId, familyId, id: { in: ids } }, include: { child: { select: { firstName: true, lastName: true } } }, orderBy: { id: "asc" } });
    if (visits.length !== ids.length)
        throw new FormError("One or more visits were not found in this family.", 404);
    const lines = visits.map(v => {
        const snap = v.admissionSnapshot as {
            mode?: string;
            name?: string;
            listedPrice?: number;
        } | null;
        if (v.counterSaleId || v.status === "CANCELLED" || snap?.mode !== "ADMISSION" || typeof snap.listedPrice !== "number")
            throw new FormError("A selected visit is already billed or has no supported admission price. Refresh the family.", 409);
        return { id: v.id, label: `${snap.name ?? v.visitType} · ${v.child.firstName} ${v.child.lastName}`, priceCents: cents(snap.listedPrice) };
    });
    const quote = quoteCounter(lines, "admissions", await settingsFor(tx, staff.tenantId));
    const sale = await createSale(tx, staff, { familyId, requestId, requestHash: hash, kind: "ADMISSION", quote });
    const linked = await tx.visit.updateMany({ where: { tenantId: staff.tenantId, familyId, id: { in: ids }, counterSaleId: null }, data: { counterSaleId: sale.id } });
    if (linked.count !== ids.length)
        throw new FormError("A selected visit changed. Refresh before billing.", 409);
    return { saleId: sale.id, replayed: false };
}
export async function recordCounterPayment(tx: DB, staff: VisitStaff, input: Record<string, unknown>, groupFingerprint?: string) {
    const saleId = recordId(input.saleId, "a bill"), requestId = visitRequestId(input.requestId);
    if (!Number.isSafeInteger(input.amountCents) || Number(input.amountCents) <= 0 || Number(input.amountCents) > 100000000)
        throw new FormError("Enter a valid payment amount.");
    if (typeof input.method !== "string" || !["cash", "card", "other"].includes(input.method))
        throw new FormError("Choose a supported payment method.");
    if (input.notes != null && (typeof input.notes !== "string" || input.notes.length > 2000))
        throw new FormError("Notes must be 2,000 characters or fewer.");
    if (input.collectedAcknowledged !== true)
        throw new FormError("Confirm that this payment has already been collected.");
    const notes = typeof input.notes === "string" ? input.notes.trim() || null : null, amountCents = Number(input.amountCents), hash = signingHash({ saleId, amountCents, method: input.method, notes, ...(groupFingerprint ? {groupFingerprint} : {}) });
    await lockVisits(tx, staff.tenantId);
    const sale = await tx.counterSale.findFirst({ where: { id: saleId, tenantId: staff.tenantId }, include: { payments: true, membership: true } });
    if (!sale)
        throw new FormError("Bill not found.", 404);
    const existing = await tx.counterPayment.findFirst({ where: { tenantId: staff.tenantId, requestId } });
    if (existing) {
        if (existing.requestHash !== hash)
            throw new FormError("This payment request already saved different details.", 409);
        return { saleId, paymentId: existing.id, replayed: true };
    }
    if (sale.status !== "OPEN")
        throw new FormError("This bill is paid or voided.", 409);
    const settings = await settingsFor(tx, staff.tenantId), method = settings.paymentMethods.find(m => m.key === input.method && m.enabled && m.allowBalances);
    if (!method)
        throw new FormError("This payment method is not enabled in Commerce Settings.");
    if (method.requiresNote && !notes)
        throw new FormError(`${method.label} payments require a note.`);
    const paid = sale.payments.reduce((s, p) => s + p.amountCents, 0), due = sale.totalCents - paid;
    if (amountCents > due)
        throw new FormError("Payment exceeds the remaining amount due.", 409);
    if (!settings.checkoutRules.allowPartialPayments && amountCents < due)
        throw new FormError("Partial payments are disabled in Commerce Settings.");
    if (!settings.checkoutRules.allowSplitPayments && sale.payments.some(p => p.method !== input.method))
        throw new FormError("Additional split payments are disabled in Commerce Settings.");
    const payment = await tx.counterPayment.create({ data: { tenantId: staff.tenantId, saleId, requestId, requestHash: hash, amountCents, method: input.method, methodLabel: method.label, notes, staffId: staff.employeeId, staffName: staff.name } });
    if (amountCents === due) {
        await tx.counterSale.update({ where: { id: sale.id }, data: { status: "PAID" } });
        if (sale.membership) {
            if (sale.membership.tenantId !== staff.tenantId || sale.membership.familyId !== sale.familyId || sale.membership.status !== "PENDING")
                throw new FormError("This membership needs manager review before payment.", 409);
            const now = new Date(), terms = sale.membership.termsSnapshot as MemberTerms;
            if (!terms || terms.version !== 1)
                throw new FormError("The saved membership terms need review.", 409);
            await tx.membership.update({ where: { id: sale.membership.id }, data: { status: "ACTIVE", startsAt: now, endsAt: memberEnd(terms, now) } });
        }
    }
    return { saleId, paymentId: payment.id, replayed: false };
}
export async function voidCounterSale(tx: DB, staff: VisitStaff, input: Record<string, unknown>) {
    const saleId = recordId(input.saleId, "a bill");
    if (typeof input.reason !== "string" || !input.reason.trim() || input.reason.length > 1000)
        throw new FormError("Enter a void reason (up to 1,000 characters).");
    await lockVisits(tx, staff.tenantId);
    const sale = await tx.counterSale.findFirst({ where: { id: saleId, tenantId: staff.tenantId }, include: { payments: true } });
    if (!sale)
        throw new FormError("Bill not found.", 404);
    if (sale.status === "VOID")
        return { saleId, replayed: true };
    if (sale.status !== "OPEN" || sale.payments.length)
        throw new FormError("Only unpaid bills can be voided. Payments need a refund workflow.", 409);
    await tx.counterSale.update({ where: { id: sale.id }, data: { status: "VOID", voidedAt: new Date(), voidedBy: staff.name, voidReason: input.reason.trim() } });
    await tx.visit.updateMany({ where: { tenantId: staff.tenantId, counterSaleId: sale.id }, data: { counterSaleId: null } });
    if (sale.membershipId)
        await tx.membership.update({ where: { id: sale.membershipId, tenantId: staff.tenantId, familyId: sale.familyId, status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    return { saleId, replayed: false };
}


// One externally collected amount can settle several existing family bills. Each
// allocation retains its bill linkage; the whole collection commits or rolls back.
export async function recordCheckoutPayment(tx: DB, staff: VisitStaff, input: Record<string, unknown>) {
    const familyId = recordId(input.familyId, "a family"), requestId = visitRequestId(input.requestId);
    if (!Array.isArray(input.bills) || !input.bills.length || input.bills.length > 20)
        throw new FormError("Choose one to twenty bills for this checkout.");
    const bills = input.bills.map(value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new FormError("Choose valid bills.");
        const item = value as Record<string, unknown>;
        if (!Number.isSafeInteger(item.dueCents) || Number(item.dueCents) <= 0) throw new FormError("Review the remaining bill balances.");
        return {id:recordId(item.id,"a bill"),dueCents:Number(item.dueCents)};
    }).sort((a,b)=>a.id.localeCompare(b.id));
    if (new Set(bills.map(b=>b.id)).size !== bills.length) throw new FormError("Select each bill only once.");
    if (!Number.isSafeInteger(input.amountCents) || Number(input.amountCents)<=0 || Number(input.amountCents)>100000000) throw new FormError("Enter a valid payment amount.");
    if (input.collectedAcknowledged !== true) throw new FormError("Confirm that this payment has already been collected.");
    if (typeof input.method!=="string" || !["cash","card","other"].includes(input.method)) throw new FormError("Choose a supported payment method.");
    if (input.notes!=null && (typeof input.notes!=="string" || input.notes.length>2000)) throw new FormError("Notes must be 2,000 characters or fewer.");
    const notes=typeof input.notes==="string"?input.notes.trim()||null:null, amount=Number(input.amountCents);
    const fingerprint=signingHash({familyId,bills,amount,method:input.method,notes});
    const requestIds=Array.from({length:20},(_,index)=>`checkout-${signingHash({requestId,index})}`);
    await lockVisits(tx,staff.tenantId);
    const sales=await tx.counterSale.findMany({where:{tenantId:staff.tenantId,familyId,id:{in:bills.map(b=>b.id)}},include:{payments:true}});
    if(sales.length!==bills.length) throw new FormError("One or more bills were not found in this family.",404);
    const existing=await tx.counterPayment.findMany({where:{tenantId:staff.tenantId,requestId:{in:requestIds}}});
    if(existing.length){
        if(existing.reduce((sum,p)=>sum+p.amountCents,0)!==amount || existing.some(p=>p.requestHash!==signingHash({saleId:p.saleId,amountCents:p.amountCents,method:input.method,notes,groupFingerprint:fingerprint})))
            throw new FormError("This checkout payment already saved different details. Refresh before starting another.",409);
        return {saleIds:bills.map(b=>b.id),paymentIds:existing.map(p=>p.id),replayed:true};
    }
    for(const bill of bills){
        const sale=sales.find(s=>s.id===bill.id)!;
        const due=sale.totalCents-sale.payments.reduce((sum,p)=>sum+p.amountCents,0);
        if(sale.status!=="OPEN" || due!==bill.dueCents) throw new FormError("A bill balance changed. Refresh and review the checkout total.",409);
    }
    const total=bills.reduce((sum,b)=>sum+b.dueCents,0);
    if(!Number.isSafeInteger(total) || amount>total) throw new FormError("Payment exceeds the checkout balance.",409);
    const settings=await settingsFor(tx,staff.tenantId);
    if(!settings.checkoutRules.allowPartialPayments && amount!==total) throw new FormError("Partial payments are disabled in Commerce Settings.");
    let remaining=amount;const paymentIds:string[]=[];
    for(const [index,bill] of bills.entries()){
        const allocated=Math.min(remaining,bill.dueCents);if(!allocated)break;
        const result=await recordCounterPayment(tx,staff,{saleId:bill.id,amountCents:allocated,method:input.method,notes,requestId:requestIds[index],collectedAcknowledged:true},fingerprint);
        paymentIds.push(result.paymentId);remaining-=allocated;
    }
    return {saleIds:bills.map(b=>b.id),paymentIds,replayed:false};
}


export async function createProductSale(tx:DB,staff:VisitStaff,input:Record<string,unknown>){
 const requestId=visitRequestId(input.requestId),familyId=recordId(input.familyId,"a family");
 const hash=signingHash({familyId,quoteHash:input.quoteHash});await lockVisits(tx,staff.tenantId);
 const existing=await tx.counterSale.findFirst({where:{tenantId:staff.tenantId,requestId}});
 if(existing){if(existing.requestHash!==hash||!["RETAIL","CUSTOM"].includes(existing.kind))throw new FormError("This request already saved a different sale.",409);return{saleId:existing.id,replayed:true};}
 if(!await tx.family.findFirst({where:{id:familyId,tenantId:staff.tenantId,status:"ACTIVE"}}))throw new FormError("Active family not found.",404);
 const prepared=await productCartQuote(tx,staff,input);
 if(input.quoteHash!==prepared.quoteHash)throw new FormError("A product price or total changed. Review the refreshed total.",409);
 const sale=await createSale(tx,staff,{familyId,requestId,requestHash:hash,kind:prepared.products.length?"RETAIL":"CUSTOM",quote:prepared.quote});
 return{saleId:sale.id,replayed:false};
}
