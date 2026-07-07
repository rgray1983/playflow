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

async function getTenant() {
  const palmettoTenant = await prisma.tenant.findUnique({
    where: {
      slug: "palmetto-playhouse",
    },
  });

  if (palmettoTenant) {
    return palmettoTenant;
  }

  return prisma.tenant.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });
}

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

export async function GET() {
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

export async function POST(request: Request) {
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

export async function PUT(request: Request) {
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
    where: {
      id,
    },
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

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Package id is required." },
      { status: 400 }
    );
  }

  await prisma.package.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}
