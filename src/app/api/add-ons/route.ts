import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AddOnPayload = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  active?: boolean;
};

async function getTenant() {
  const palmettoTenant = await prisma.tenant.findUnique({ where: { slug: "palmetto-playhouse" } });
  if (palmettoTenant) return palmettoTenant;
  return prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
}

function serializeAddOn(addOn: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: addOn.id,
    name: addOn.name,
    description: addOn.description ?? "",
    price: Number(addOn.price ?? 0),
    active: addOn.active,
    createdAt: addOn.createdAt,
    updatedAt: addOn.updatedAt,
  };
}

export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ addOns: [] });

  const addOns = await prisma.partyAddOn.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ addOns: addOns.map(serializeAddOn) });
}

export async function POST(request: Request) {
  const tenant = await getTenant();
  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding add-ons." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as AddOnPayload;
  const name = body.name?.trim();

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
    },
  });

  return NextResponse.json({ addOn: serializeAddOn(addOn) });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as AddOnPayload;
  const id = body.id?.trim();
  const name = body.name?.trim();

  if (!id) return NextResponse.json({ error: "Add-on id is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Add-on name is required." }, { status: 400 });

  const addOn = await prisma.partyAddOn.update({
    where: { id },
    data: {
      name,
      description: body.description?.trim() || null,
      price:
        body.price === null || body.price === undefined || body.price === ""
          ? "0"
          : String(body.price),
      active: body.active ?? true,
    },
  });

  return NextResponse.json({ addOn: serializeAddOn(addOn) });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) return NextResponse.json({ error: "Add-on id is required." }, { status: 400 });

  await prisma.partyAddOn.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
