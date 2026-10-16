import { withStaff, getStaffContext } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { normalizeCommerceSettings } from "@/lib/commerce-settings";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { PaymentError, paymentCents } from "@/lib/payments/rules";

type Params = { params: Promise<{ eventId: string }> };
async function handlePOST(request: Request, { params }: Params) {
  try {
    const staff = getStaffContext();
    const { eventId } = await params;
    let body;
    try { body = await request.json(); } catch { throw new PaymentError("Invalid payment request."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new PaymentError("Invalid payment request.");
    const amount = paymentCents(body.amount);
    const purpose = body.purpose;
    if (purpose !== "DEPOSIT" && purpose !== "BALANCE") throw new PaymentError("Choose deposit or balance payment.");
    if (typeof body.requestId !== "string" || !/^[A-Za-z0-9-]{16,100}$/.test(body.requestId)) throw new PaymentError("A payment request ID is required. Refresh and try again.");
    if (typeof body.method !== "string" || !["cash", "card", "other"].includes(body.method)) throw new PaymentError("Choose a supported payment method.");
    if (body.notes != null && (typeof body.notes !== "string" || body.notes.length > 2000)) throw new PaymentError("Payment notes must be no more than 2,000 characters.");
    const notes = body.notes?.trim() || null;
    const fingerprint = createHash("sha256").update(JSON.stringify({ amount, purpose, method: body.method, notes })).digest("hex");
    const result = await prisma.$transaction(async tx => {
      // Read the balance only after acquiring the same business lock used by booking changes.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${staff.tenantId} FOR UPDATE`);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Party" WHERE id = ${eventId} AND "tenantId" = ${staff.tenantId} FOR UPDATE`);
      const party = await tx.party.findUnique({ where: { id: eventId, tenantId: staff.tenantId } });
      if (!party) throw new PaymentError("Party or event was not found.", 404);
      const existing = await tx.eventPayment.findFirst({ where: { tenantId: staff.tenantId, partyId: eventId, requestId: body.requestId } });
      if (existing) {
        if (existing.requestFingerprint !== fingerprint) throw new PaymentError("This payment was already recorded with different details. Start a new payment.", 409);
        return { paymentId: existing.id, replayed: true };
      }
      if (party.status === "CANCELLED") throw new PaymentError("Restore this party before recording payments.");
      if (party.status === "PENDING" && party.confirmationExpiresAt && party.confirmationExpiresAt.getTime() <= Date.now()) throw new PaymentError("This booking hold has expired. Create a new booking before recording payment.", 409);
      const settings = normalizeCommerceSettings(await tx.commerceSettings.findUnique({ where: { tenantId: staff.tenantId } }) ?? {});
      const method = settings.paymentMethods.find(m => m.key === body.method && m.enabled && (purpose === "DEPOSIT" ? m.allowDeposits : m.allowBalances));
      if (!method) throw new PaymentError("This payment method is not enabled for the selected payment type.");
      if (method.requiresNote && !notes) throw new PaymentError(`${method.label} payments require a note.`);
      const depositPayments = await tx.eventPayment.aggregate({ where: { tenantId: staff.tenantId, partyId: eventId, purpose: "DEPOSIT", status: "PAID" }, _sum: { amount: true } });
      const paidDeposit = Math.round(Number(depositPayments._sum.amount ?? 0) * 100);
      const depositDue = party.depositStatus.endsWith("COLLECTED") ? 0 : Math.max(0, Math.round(Number(party.depositAmount ?? 0) * 100) - paidDeposit);
      const balance = Math.round(Number(party.balanceDue ?? 0) * 100);
      const due = purpose === "DEPOSIT" ? depositDue : balance;
      if (purpose === "DEPOSIT" && party.depositStatus === "WAIVED") throw new PaymentError("The deposit was waived. Record a balance payment instead.");
      if (amount > due) throw new PaymentError("Payment exceeds the amount due. Overpayments require a credit or refund workflow.", 409);
      if (!settings.checkoutRules.allowPartialPayments && amount < due) throw new PaymentError("Partial payments are disabled in Commerce Settings.");
      const appliesToBalance = purpose === "BALANCE" || settings.depositRules.applyDepositToBalance;
      if (appliesToBalance && amount > balance) throw new PaymentError("Payment exceeds the remaining booking balance.", 409);
      const nextBalance = balance - (appliesToBalance ? amount : 0);
      const methodEnum = body.method.toUpperCase() as "CASH" | "CARD" | "OTHER";
      const payment = await tx.eventPayment.create({ data: { tenantId: staff.tenantId, partyId: eventId, requestId: body.requestId, requestFingerprint: fingerprint, purpose, staffName: staff.name, staffEmployeeId: staff.employeeId, amount: new Prisma.Decimal(amount / 100), method: methodEnum, status: "PAID", notes } });
      const depositComplete = (purpose === "DEPOSIT" && amount === depositDue) || (nextBalance === 0 && party.depositStatus === "PENDING" && Number(party.depositAmount ?? 0) > 0 && settings.depositRules.applyDepositToBalance);
      await tx.party.update({ where: { id: eventId, tenantId: staff.tenantId }, data: { balanceDue: new Prisma.Decimal(nextBalance / 100), ...(depositComplete ? { depositStatus: methodEnum === "CASH" ? "CASH_COLLECTED" : methodEnum === "CARD" ? "CARD_COLLECTED" : "OTHER_COLLECTED", depositMethod: methodEnum, depositCapturedAt: new Date() } : {}) } });
      await tx.eventTimelineItem.create({ data: { tenantId: staff.tenantId, partyId: eventId, icon: "$", title: purpose === "DEPOSIT" ? "Deposit Payment Recorded" : "Balance Payment Recorded", body: `$${(amount / 100).toFixed(2)} recorded as ${method.label} by ${staff.name}. Remaining balance: $${(nextBalance / 100).toFixed(2)}.`, metadata: { paymentId: payment.id, purpose, staffEmployeeId: staff.employeeId, amount: amount / 100, method: body.method, balanceDue: nextBalance / 100, source: "party-manager" } } });
      return { paymentId: payment.id, replayed: false };
    }, { maxWait: 10000, timeout: 15000 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Unable to record payment", error);
    return NextResponse.json({ error: "Unable to record payment. Retry the same submission to check whether it was saved." }, { status: 500 });
  }
}
export const POST = withStaff("payments.write", handlePOST);
