import { NextResponse } from "next/server";
import { defaultCommerceSettings, normalizeCommerceSettings } from "@/lib/commerce-settings";
import { prisma } from "@/lib/prisma";

async function getTenant() {
  const palmettoTenant = await prisma.tenant.findUnique({
    where: {
      slug: "palmetto-playhouse",
    },
  });

  if (palmettoTenant) {
    return palmettoTenant;
  }

  return prisma.tenant.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });
}

function serializeCommerceSettings(settings: Awaited<ReturnType<typeof prisma.commerceSettings.findUnique>>) {
  if (!settings) {
    return defaultCommerceSettings;
  }

  return normalizeCommerceSettings({
    paymentMethods: settings.paymentMethods,
    depositRules: settings.depositRules,
    taxRules: settings.taxRules,
    feeRules: settings.feeRules,
    tipRules: settings.tipRules,
    discountRules: settings.discountRules,
    refundRules: settings.refundRules,
    receiptRules: settings.receiptRules,
    checkoutRules: settings.checkoutRules,
    processorRules: settings.processorRules,
  });
}

export async function GET() {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ commerceSettings: defaultCommerceSettings });
  }

  const commerceSettings = await prisma.commerceSettings.findUnique({
    where: {
      tenantId: tenant.id,
    },
  });

  return NextResponse.json({
    commerceSettings: serializeCommerceSettings(commerceSettings),
  });
}

export async function PUT(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ error: "No tenant found." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const commerceSettings = normalizeCommerceSettings(body);

    const savedSettings = await prisma.commerceSettings.upsert({
      where: {
        tenantId: tenant.id,
      },
      create: {
        tenantId: tenant.id,
        paymentMethods: commerceSettings.paymentMethods,
        depositRules: commerceSettings.depositRules,
        taxRules: commerceSettings.taxRules,
        feeRules: commerceSettings.feeRules,
        tipRules: commerceSettings.tipRules,
        discountRules: commerceSettings.discountRules,
        refundRules: commerceSettings.refundRules,
        receiptRules: commerceSettings.receiptRules,
        checkoutRules: commerceSettings.checkoutRules,
        processorRules: commerceSettings.processorRules,
      },
      update: {
        paymentMethods: commerceSettings.paymentMethods,
        depositRules: commerceSettings.depositRules,
        taxRules: commerceSettings.taxRules,
        feeRules: commerceSettings.feeRules,
        tipRules: commerceSettings.tipRules,
        discountRules: commerceSettings.discountRules,
        refundRules: commerceSettings.refundRules,
        receiptRules: commerceSettings.receiptRules,
        checkoutRules: commerceSettings.checkoutRules,
        processorRules: commerceSettings.processorRules,
      },
    });

    return NextResponse.json({
      commerceSettings: serializeCommerceSettings(savedSettings),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save commerce settings." },
      { status: 400 },
    );
  }
}
