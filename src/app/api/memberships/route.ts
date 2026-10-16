import { withStaff, getStaffContext, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MembershipPayload = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  billingInterval?: "NONE" | "MONTHLY" | "YEARLY";
  durationDays?: number | string | null;
  visitLimit?: number | string | null;
  autoRenewDefault?: boolean;
  active?: boolean;
};

async function getTenant() { return getStaffTenant(); }

function toNullableInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeMembershipPlan(plan: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  billingInterval: string;
  durationDays: number | null;
  visitLimit: number | null;
  autoRenewDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? "",
    price: Number(plan.price ?? 0),
    billingInterval: plan.billingInterval,
    durationDays: plan.durationDays,
    visitLimit: plan.visitLimit,
    autoRenewDefault: plan.autoRenewDefault,
    active: plan.active,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();

  if (!tenant) return NextResponse.json({ memberships: [] });

  const memberships = await prisma.membershipPlan.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ memberships: memberships.map(serializeMembershipPlan) });
}

async function handlePOST(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding memberships." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as MembershipPayload;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Membership name is required." }, { status: 400 });
  }

  const membership = await prisma.membershipPlan.create({
    data: {
      tenantId: tenant.id,
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      billingInterval: body.billingInterval ?? "NONE",
      durationDays: toNullableInt(body.durationDays),
      visitLimit: toNullableInt(body.visitLimit),
      autoRenewDefault: body.autoRenewDefault ?? false,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ membership: serializeMembershipPlan(membership) });
}

async function handlePUT(request: Request) {
  const body = (await request.json()) as MembershipPayload;
  const id = body.id?.trim();
  const name = body.name?.trim();

  if (!id) return NextResponse.json({ error: "Membership id is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Membership name is required." }, { status: 400 });

  const membership = await prisma.membershipPlan.update({
    where: { id, tenantId: getStaffContext().tenantId },
    data: {
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      billingInterval: body.billingInterval ?? "NONE",
      durationDays: toNullableInt(body.durationDays),
      visitLimit: toNullableInt(body.visitLimit),
      autoRenewDefault: body.autoRenewDefault ?? false,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ membership: serializeMembershipPlan(membership) });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) return NextResponse.json({ error: "Membership id is required." }, { status: 400 });

  await prisma.membershipPlan.delete({ where: { id, tenantId: getStaffContext().tenantId } });

  return NextResponse.json({ ok: true });
}

export const GET = withStaff("read", handleGET);

export const POST = withStaff("settings.write", handlePOST);

export const PUT = withStaff("settings.write", handlePUT);

export const DELETE = withStaff("settings.write", handleDELETE);
