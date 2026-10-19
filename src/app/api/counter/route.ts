import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffContext, withStaff } from "@/lib/auth/staff";
import { FormError } from "@/lib/waivers/signing";
import { normalizeCommerceSettings } from "@/lib/commerce-settings";
import {receiptSelect} from "@/lib/counter/select";
import { recordCheckoutPayment, billAdmissions, enrollMembership, membershipQuote, recordCounterPayment, voidCounterSale } from "@/lib/counter/service";
import { recordId } from "@/lib/visits/service";
function failure(error: unknown) { if (error instanceof FormError)
    return NextResponse.json({ error: error.message }, { status: error.status }); if (error && typeof error === "object" && "code" in error && error.code === "P2002")
    return NextResponse.json({ error: "This request may already be saved. Refresh before submitting another." }, { status: 409 }); console.error("Counter request failed", error); return NextResponse.json({ error: "Unable to save. Retry the same submission to check whether it was saved." }, { status: 500 }); }
async function handleGET(request: Request) {
    try {
        const staff = getStaffContext(), q = new URL(request.url).searchParams, familyId = recordId(q.get("familyId"), "a family"), page = Number(q.get("page") ?? 1);
        if (!Number.isInteger(page) || page < 1 || page > 10000)
            throw new FormError("Choose a valid page.");
        if (!await prisma.family.findFirst({ where: { id: familyId, tenantId: staff.tenantId, status: "ACTIVE" }, select: { id: true } }))
            throw new FormError("Active family not found.", 404);
        const [sales, unbilled, plans, raw] = await Promise.all([
            prisma.counterSale.findMany({ where: { tenantId: staff.tenantId, familyId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21, include: { payments: { orderBy: { collectedAt: "asc" } } } }),
            prisma.visit.findMany({ where: { tenantId: staff.tenantId, familyId, counterSaleId: null, membershipId: null, admissionSnapshot: { path: ["mode"], equals: "ADMISSION" }, status: { not: "CANCELLED" } }, orderBy: [{ checkedInAt: "desc" }, { id: "desc" }], take: 51, select: { id: true, visitType: true, checkedInAt: true, admissionSnapshot: true, child: { select: { firstName: true, lastName: true } } } }),
            prisma.membershipPlan.findMany({ where: { tenantId: staff.tenantId, active: true }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, price: true, visitLimit: true, durationDays: true, billingInterval: true } }),
            prisma.commerceSettings.findUnique({ where: { tenantId: staff.tenantId } }),
        ]);
        const settings = normalizeCommerceSettings(raw ?? {});
        return NextResponse.json({ sales: sales.slice(0, 20), hasMore: sales.length > 20, page, unbilled: unbilled.slice(0, 50).filter(v => (v.admissionSnapshot as {
                mode?: string;
            } | null)?.mode === "ADMISSION"), moreUnbilled: unbilled.length > 50, plans: plans.map(p => ({ ...p, price: Number(p.price) })), paymentMethods: settings.paymentMethods.filter(m => m.enabled && m.allowBalances && ["cash", "card", "other"].includes(m.key)), allowSplitPayments: settings.checkoutRules.allowSplitPayments, allowPartialPayments: settings.checkoutRules.allowPartialPayments });
    }
    catch (error) {
        return failure(error);
    }
}
async function handlePOST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        }
        catch {
            throw new FormError("Invalid counter request.");
        }
        if (!body || typeof body !== "object" || Array.isArray(body))
            throw new FormError("Invalid counter request.");
        const staff = getStaffContext();
        const result = await prisma.$transaction(async (tx) => {
            switch (body.action) {
                case "bill-admissions": return billAdmissions(tx, staff, body);
                case "quote-membership": {
                    const result = await membershipQuote(tx, staff, body);
                    return { quote: result.quote, quoteHash: result.quoteHash, terms: result.terms };
                }
                case "enroll": return enrollMembership(tx, staff, body);
                case "checkout-payment": {
                    const result=await recordCheckoutPayment(tx,staff,body);
                    const receipts=await tx.counterSale.findMany({where:{tenantId:staff.tenantId,familyId:body.familyId,id:{in:result.saleIds}},select:receiptSelect});
                    return {...result,receipts};
                }
                case "payment": return recordCounterPayment(tx, staff, body);
                case "void": return voidCounterSale(tx, staff, body);
                default: throw new FormError("Choose a valid counter action.");
            }
        }, { maxWait: 10000, timeout: 20000 });
        return NextResponse.json(result);
    }
    catch (error) {
        return failure(error);
    }
}
export const GET = withStaff("payments.write", handleGET);
export const POST = withStaff("payments.write", handlePOST);
