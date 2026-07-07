import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EventTypePayload = {
  id?: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  active?: boolean;
};

async function getTenant() {
  const palmettoTenant = await prisma.tenant.findUnique({ where: { slug: "palmetto-playhouse" } });
  if (palmettoTenant) return palmettoTenant;
  return prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
}

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

export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ eventTypes: [] });

  const eventTypes = await prisma.eventType.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ eventTypes: eventTypes.map(serializeEventType) });
}

export async function POST(request: Request) {
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

export async function PUT(request: Request) {
  const body = (await request.json()) as EventTypePayload;
  const id = body.id?.trim();
  const name = body.name?.trim();

  if (!id) return NextResponse.json({ error: "Event type id is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Event type name is required." }, { status: 400 });

  const eventType = await prisma.eventType.update({
    where: { id },
    data: {
      name,
      description: body.description?.trim() || null,
      color: body.color?.trim() || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ eventType: serializeEventType(eventType) });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) return NextResponse.json({ error: "Event type id is required." }, { status: 400 });

  await prisma.eventType.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
