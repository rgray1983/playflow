import { withStaff, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type BusinessProfilePayload = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  timezone?: string | null;
};

async function getTenant() { return getStaffTenant(); }

function serializeTenant(tenant: Awaited<ReturnType<typeof getTenant>>) {
  if (!tenant) return null;

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    timezone: tenant.timezone,
    phone: tenant.phone ?? "",
    email: tenant.email ?? "",
    website: tenant.website ?? "",
    address1: tenant.address1 ?? "",
    address2: tenant.address2 ?? "",
    city: tenant.city ?? "",
    state: tenant.state ?? "",
    zip: tenant.zip ?? "",
  };
}

async function handleGET() {
  const tenant = await getTenant();
  return NextResponse.json({ businessProfile: serializeTenant(tenant) });
}

async function handlePUT(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ error: "No tenant found." }, { status: 400 });
  }

  const body = (await request.json()) as BusinessProfilePayload;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      website: body.website?.trim() || null,
      address1: body.address1?.trim() || null,
      address2: body.address2?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      zip: body.zip?.trim() || null,
      timezone: body.timezone?.trim() || "America/New_York",
    },
  });

  return NextResponse.json({ businessProfile: serializeTenant(updatedTenant) });
}

export const GET = withStaff("read", handleGET);

export const PUT = withStaff("settings.write", handlePUT);
