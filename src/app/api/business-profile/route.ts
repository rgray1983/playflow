import { withStaff, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {businessProfileFields,WorkspaceError} from "@/lib/workspaces/rules";

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

  let fields;
  try{fields=businessProfileFields(await request.json());}catch(error){return NextResponse.json({error:error instanceof WorkspaceError?error.message:"Enter valid business details."},{status:400});}
  const updatedTenant=await prisma.tenant.update({where:{id:tenant.id},data:fields});

  return NextResponse.json({ businessProfile: serializeTenant(updatedTenant) });
}

export const GET = withStaff("read", handleGET);

export const PUT = withStaff("settings.write", handlePUT);
