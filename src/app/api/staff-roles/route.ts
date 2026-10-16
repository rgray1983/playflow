import { withStaff, getStaffContext, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type StaffRolePayload = {
  id?: string;
  name?: string;
  description?: string | null;
  permissions?: Prisma.InputJsonValue | null;
  active?: boolean;
};

async function getTenant() { return getStaffTenant(); }

function normalizePermissions(
  permissions: StaffRolePayload["permissions"]
): Prisma.InputJsonValue {
  if (permissions === null || permissions === undefined) {
    return {};
  }

  return permissions;
}

function serializeStaffRole(role: {
  id: string;
  name: string;
  description: string | null;
  permissions: Prisma.JsonValue;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    permissions: role.permissions ?? {},
    active: role.active,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ staffRoles: [] });
  }

  const staffRoles = await prisma.staffRole.findMany({
    where: {
      tenantId: tenant.id,
    },
    orderBy: [
      {
        active: "desc",
      },
      {
        name: "asc",
      },
    ],
  });

  return NextResponse.json({
    staffRoles: staffRoles.map(serializeStaffRole),
  });
}

async function handlePOST(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding staff roles." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as StaffRolePayload;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Staff role name is required." },
      { status: 400 }
    );
  }

  const staffRole = await prisma.staffRole.create({
    data: {
      tenantId: tenant.id,
      name,
      description: body.description?.trim() || null,
      permissions: normalizePermissions(body.permissions),
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    staffRole: serializeStaffRole(staffRole),
  });
}

async function handlePUT(request: Request) {
  const body = (await request.json()) as StaffRolePayload;
  const id = body.id?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Staff role id is required." },
      { status: 400 }
    );
  }

  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Staff role name is required." },
      { status: 400 }
    );
  }

  const staffRole = await prisma.staffRole.update({
    where: { id, tenantId: getStaffContext().tenantId },
    data: {
      name,
      description: body.description?.trim() || null,
      permissions: normalizePermissions(body.permissions),
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    staffRole: serializeStaffRole(staffRole),
  });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Staff role id is required." },
      { status: 400 }
    );
  }

  await prisma.staffRole.delete({
    where: { id, tenantId: getStaffContext().tenantId },
  });

  return NextResponse.json({
    ok: true,
  });
}

export const GET = withStaff("read", handleGET);

export const POST = withStaff("settings.write", handlePOST);

export const PUT = withStaff("settings.write", handlePUT);

export const DELETE = withStaff("settings.write", handleDELETE);
