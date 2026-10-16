import { withStaff, getStaffContext, getStaffTenant } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AdmissionPayload = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  color?: string | null;
  active?: boolean;
};

async function getTenant() { return getStaffTenant(); }

function serializeAdmission(admission: {
  id: string;
  name: string;
  description: string | null;
  price: unknown;
  color: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: admission.id,
    name: admission.name,
    description: admission.description ?? "",
    price: Number(admission.price ?? 0),
    color: admission.color ?? "",
    active: admission.active,
    createdAt: admission.createdAt,
    updatedAt: admission.updatedAt,
  };
}

async function handleGET() {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json({ admissions: [] });
  }

  const admissions = await prisma.admissionType.findMany({
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
    admissions: admissions.map(serializeAdmission),
  });
}

async function handlePOST(request: Request) {
  const tenant = await getTenant();

  if (!tenant) {
    return NextResponse.json(
      { error: "No tenant found. Create a tenant before adding admissions." },
      { status: 400 }
    );
  }

  const body = (await request.json()) as AdmissionPayload;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Admission name is required." },
      { status: 400 }
    );
  }

  const admission = await prisma.admissionType.create({
    data: {
      tenantId: tenant.id,
      name,
      description: body.description?.trim() || null,
      price: body.price === null || body.price === undefined || body.price === ""
        ? "0"
        : String(body.price),
      color: body.color?.trim() || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    admission: serializeAdmission(admission),
  });
}

async function handlePUT(request: Request) {
  const body = (await request.json()) as AdmissionPayload;
  const id = body.id?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Admission id is required." },
      { status: 400 }
    );
  }

  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Admission name is required." },
      { status: 400 }
    );
  }

  const admission = await prisma.admissionType.update({
    where: { id, tenantId: getStaffContext().tenantId },
    data: {
      name,
      description: body.description?.trim() || null,
      price: body.price === null || body.price === undefined || body.price === ""
        ? "0"
        : String(body.price),
      color: body.color?.trim() || null,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    admission: serializeAdmission(admission),
  });
}

async function handleDELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json(
      { error: "Admission id is required." },
      { status: 400 }
    );
  }

  await prisma.admissionType.delete({
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
