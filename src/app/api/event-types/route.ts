import { withStaff, getStaffContext, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EventTypePayload = {
  id?: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  active?: boolean;
};

async function getTenant() { return getStaffTenant(); }

function serializeEventType(eventType: {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: eventType.id,
    name: eventType.name,
    description: eventType.description ?? "",
    color: eventType.color ?? "",
    active: eventType.active,
    createdAt: eventType.createdAt,
    updatedAt: eventType.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ eventTypes: [] });

  const eventTypes = await prisma.eventType.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ eventTypes: eventTypes.map(serializeEventType) });
}

async function handlePOST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding event types." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as EventTypePayload;
  const name = body.name?.trim();

  if (!name) return NextResponse.json({ error: "Event type name is required." }, { status: 400 });

  const eventType = await prisma.eventType.create({
    data: {
      tenantId: tenant.id,
      name,
      description: body.description?.trim() || null,
      color: body.color?.trim() || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ eventType: serializeEventType(eventType) });
}

async function handlePUT(request: Request) {
  const body = (await request.json()) as EventTypePayload;
  const id = body.id?.trim();
  const name = body.name?.trim();

  if (!id) return NextResponse.json({ error: "Event type id is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Event type name is required." }, { status: 400 });

  const eventType = await prisma.eventType.update({
    where: { id, tenantId: getStaffContext().tenantId },
    data: {
      name,
      description: body.description?.trim() || null,
      color: body.color?.trim() || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ eventType: serializeEventType(eventType) });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) return NextResponse.json({ error: "Event type id is required." }, { status: 400 });

  await prisma.eventType.delete({ where: { id, tenantId: getStaffContext().tenantId } });

  return NextResponse.json({ ok: true });
}

export const GET = withStaff("read", handleGET);

export const POST = withStaff("settings.write", handlePOST);

export const PUT = withStaff("settings.write", handlePUT);

export const DELETE = withStaff("settings.write", handleDELETE);
