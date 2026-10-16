import { withStaff, getStaffContext, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AddOnPayload = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  active?: boolean;
  durationMinutes?: number;
};

async function getTenant() { return getStaffTenant(); }

function serializeAddOn(addOn: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  active: boolean;
  durationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: addOn.id,
    name: addOn.name,
    description: addOn.description ?? "",
    price: Number(addOn.price ?? 0),
    active: addOn.active,
    durationMinutes: addOn.durationMinutes,
    createdAt: addOn.createdAt,
    updatedAt: addOn.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ addOns: [] });

  const addOns = await prisma.partyAddOn.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ addOns: addOns.map(serializeAddOn) });
}

async function handlePOST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding add-ons." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as AddOnPayload;
  const name = body.name?.trim();
  if (body.durationMinutes !== undefined && (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 0 || body.durationMinutes > 720)) return NextResponse.json({ error: "Extra time must be 0–720 whole minutes." }, { status: 400 });

  if (!name) return NextResponse.json({ error: "Add-on name is required." }, { status: 400 });

  const addOn = await prisma.partyAddOn.create({
    data: {
      tenantId: tenant.id,
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      active: body.active ?? true,
      durationMinutes: body.durationMinutes ?? 0,
    },
  });

  return NextResponse.json({ addOn: serializeAddOn(addOn) });
}

async function handlePUT(request: Request) {
  const body = (await request.json()) as AddOnPayload;
  const id = body.id?.trim();
  const name = body.name?.trim();
  if (body.durationMinutes !== undefined && (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 0 || body.durationMinutes > 720)) return NextResponse.json({ error: "Extra time must be 0–720 whole minutes." }, { status: 400 });

  if (!id) return NextResponse.json({ error: "Add-on id is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Add-on name is required." }, { status: 400 });

  const addOn = await prisma.partyAddOn.update({
    where: { id, tenantId: getStaffContext().tenantId },
    data: {
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      active: body.active ?? true,
      durationMinutes: body.durationMinutes ?? 0,
    },
  });

  return NextResponse.json({ addOn: serializeAddOn(addOn) });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) return NextResponse.json({ error: "Add-on id is required." }, { status: 400 });

  await prisma.partyAddOn.delete({ where: { id, tenantId: getStaffContext().tenantId } });

  return NextResponse.json({ ok: true });
}

export const GET = withStaff("read", handleGET);

export const POST = withStaff("settings.write", handlePOST);

export const PUT = withStaff("settings.write", handlePUT);

export const DELETE = withStaff("settings.write", handleDELETE);
