import { withStaff, getStaffContext, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PackagePayload = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  depositAmount?: number | string | null;
  guestLimit?: number | string | null;
  durationMinutes?: number | string | null;
  active?: boolean;
};

async function getTenant() { return getStaffTenant(); }

function toNullableInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function serializePackage(packageItem: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  depositAmount: unknown;
  guestLimit: number | null;
  durationMinutes: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: packageItem.id,
    name: packageItem.name,
    description: packageItem.description ?? "",
    price: Number(packageItem.price ?? 0),
    depositAmount: Number(packageItem.depositAmount ?? 0),
    guestLimit: packageItem.guestLimit,
    durationMinutes: packageItem.durationMinutes,
    active: packageItem.active,
    createdAt: packageItem.createdAt,
    updatedAt: packageItem.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ packages: [] });
  }

  const packages = await prisma.package.findMany({
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
    packages: packages.map(serializePackage),
  });
}

async function handlePOST(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding packages." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as PackagePayload;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Package name is required." },
      { status: 400 }
    );
  }

  const packageItem = await prisma.package.create({
    data: {
      tenantId: tenant.id,
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      depositAmount:
        body.depositAmount === null ||
        body.depositAmount === undefined ||
        body.depositAmount === ""
          ? "0"
          : String(body.depositAmount),
      guestLimit: toNullableInt(body.guestLimit),
      durationMinutes: toNullableInt(body.durationMinutes),
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    package: serializePackage(packageItem),
  });
}

async function handlePUT(request: Request) {
  const body = (await request.json()) as PackagePayload;
  const id = body.id?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Package id is required." },
      { status: 400 }
    );
  }

  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Package name is required." },
      { status: 400 }
    );
  }

  const packageItem = await prisma.package.update({
    where: { id, tenantId: getStaffContext().tenantId },
    data: {
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      depositAmount:
        body.depositAmount === null ||
        body.depositAmount === undefined ||
        body.depositAmount === ""
          ? "0"
          : String(body.depositAmount),
      guestLimit: toNullableInt(body.guestLimit),
      durationMinutes: toNullableInt(body.durationMinutes),
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    package: serializePackage(packageItem),
  });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Package id is required." },
      { status: 400 }
    );
  }

  await prisma.package.delete({
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
