import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { defaultCommerceSettings, normalizeCommerceSettings } from "@/lib/commerce-settings";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

type PaymentPayload = {
  amount?: number | string;
  method?: string;
  notes?: string;
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status },
  );
}

function toPaymentMethod(value: string) {
  if (value === "cash") return "CASH";
  if (value === "card") return "CARD";
  if (value === "other") return "OTHER";
  return null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

async function loadCommerceSettings(tenantId: string) {
  const savedSettings = await prisma.commerceSettings.findUnique({
    where: {
      tenantId,
    },
  });

  if (!savedSettings) {
    return defaultCommerceSettings;
  }

  return normalizeCommerceSettings({
    paymentMethods: savedSettings.paymentMethods,
    depositRules: savedSettings.depositRules,
    taxRules: savedSettings.taxRules,
    feeRules: savedSettings.feeRules,
    tipRules: savedSettings.tipRules,
    discountRules: savedSettings.discountRules,
    refundRules: savedSettings.refundRules,
    receiptRules: savedSettings.receiptRules,
    checkoutRules: savedSettings.checkoutRules,
    processorRules: savedSettings.processorRules,
  });
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const party = await prisma.party.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    if (party.status === "CANCELLED") {
      return NextResponse.json({ error: "Restore this party before collecting payments." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as PaymentPayload;
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
    }

    const commerceSettings = await loadCommerceSettings(party.tenantId);
    const methodKey = typeof body.method === "string" ? body.method : "";
    const paymentMethod = commerceSettings.paymentMethods.find(
      (method) => method.key === methodKey && method.enabled && method.allowBalances,
    );

    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method is not enabled for balance payments." }, { status: 400 });
    }

    const eventPaymentMethod = toPaymentMethod(paymentMethod.key);

    if (!eventPaymentMethod) {
      return NextResponse.json({ error: "Payment method is not supported for event payments yet." }, { status: 400 });
    }

    const notes = body.notes?.trim() || null;

    if (paymentMethod.requiresNote && !notes) {
      return NextResponse.json({ error: `${paymentMethod.label} payments require a note.` }, { status: 400 });
    }

    const currentBalance = Number(party.balanceDue ?? 0);

    if (!commerceSettings.checkoutRules.allowOverpayment && amount > currentBalance) {
      return NextResponse.json({ error: "Payment amount cannot exceed the remaining balance." }, { status: 400 });
    }

    const nextBalance = Math.max(currentBalance - amount, 0);
    const paymentAmount = new Prisma.Decimal(amount.toFixed(2));
    const balanceDue = new Prisma.Decimal(nextBalance.toFixed(2));

    const updatedParty = await prisma.$transaction(async (tx) => {
      await tx.eventPayment.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          amount: paymentAmount,
          method: eventPaymentMethod,
          status: "PAID",
          notes,
        },
      });

      await tx.party.update({
        where: {
          id: party.id,
        },
        data: {
          balanceDue,
        },
      });

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: "$",
          title: "Payment Collected",
          body: `${formatCurrency(amount)} collected by ${paymentMethod.label}. Remaining balance: ${formatCurrency(nextBalance)}.`,
          metadata: {
            source: "party-manager",
            action: "collect-payment",
            amount,
            method: paymentMethod.key,
            balanceDue: nextBalance,
          },
        },
      });

      return tx.party.findUniqueOrThrow({
        where: {
          id: party.id,
        },
        include: {
          guests: { orderBy: { createdAt: "asc" } },
          timelineItems: { orderBy: { createdAt: "desc" }, take: 10 },
          payments: { orderBy: { collectedAt: "desc" } },
        },
      });
    });

    return NextResponse.json({
      event: {
        ...updatedParty,
        depositAmount: Number(updatedParty.depositAmount ?? 0),
        balanceDue: Number(updatedParty.balanceDue ?? 0),
        payments: updatedParty.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount ?? 0),
          method: payment.method,
          notes: payment.notes ?? "",
          staff: "Staff",
          collectedAt: payment.collectedAt,
          createdAt: payment.createdAt,
        })),
      },
    });
  } catch (error) {
    return jsonError(error, "Unable to collect payment.");
  }
}
