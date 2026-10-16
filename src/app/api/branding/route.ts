import { withStaff, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BrandingPayload = {
  logoUrl?: string | null;
  iconLogoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  tertiaryColor?: string | null;
};

async function getTenant() { return getStaffTenant(); }

function serializeBranding(tenant: Awaited<ReturnType<typeof getTenant>>) {
  if (!tenant) {
    return null;
  }

  return {
    logoUrl: tenant.logoUrl ?? "",
    iconLogoUrl: tenant.iconLogoUrl ?? "",
    primaryColor: tenant.primaryColor ?? "#1E293B",
    accentColor: tenant.accentColor ?? "#20B8A8",
    tertiaryColor: tenant.tertiaryColor ?? "#FFD56B",
  };
}

async function handleGET() {
  const tenant = await getTenant();

  return NextResponse.json({
    branding: serializeBranding(tenant),
  });
}

async function handlePUT(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ error: "No tenant found." }, { status: 400 });
  }

  const body = (await request.json()) as BrandingPayload;

  const updatedTenant = await prisma.tenant.update({
    where: {
      id: tenant.id,
    },
    data: {
      logoUrl: body.logoUrl?.trim() || null,
      iconLogoUrl: body.iconLogoUrl?.trim() || null,
      primaryColor: body.primaryColor?.trim() || null,
      accentColor: body.accentColor?.trim() || null,
      tertiaryColor: body.tertiaryColor?.trim() || null,
    },
  });

  return NextResponse.json({
    branding: serializeBranding(updatedTenant),
  });
}

export const GET = withStaff("read", handleGET);

export const PUT = withStaff("settings.write", handlePUT);
