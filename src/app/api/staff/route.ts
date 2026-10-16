import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, getStaffContext, withStaff } from "@/lib/auth/staff";
import { isAccessRole } from "@/lib/auth/permissions";

async function handleGET() {
  const employees = await prisma.employee.findMany({ where: { tenantId: getStaffContext().tenantId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ staff: employees.map((employee) => ({
    id: employee.id, firstName: employee.firstName, lastName: employee.lastName,
    email: employee.email, accessRole: employee.accessRole, status: employee.status,
    accessApproved: employee.accessApproved, linked: Boolean(employee.authUserId),
  })) });
}

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!firstName || firstName.length > 100 || lastName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !isAccessRole(body.accessRole) || body.accessRole === "OWNER") {
    throw new AccessError(400, "Enter a name, valid email, and staff role.", "INVALID_STAFF");
  }
  const exists = await prisma.employee.findFirst({ where: { email: { equals: email, mode: "insensitive" }, accessApproved: true } });
  if (exists) throw new AccessError(409, "This email already has approved staff access.", "DUPLICATE_STAFF");
  const employee = await prisma.employee.create({ data: {
    tenantId: getStaffContext().tenantId, firstName, lastName, email, accessRole: body.accessRole, accessApproved: true,
  } });
  return NextResponse.json({ id: employee.id }, { status: 201 });
}

async function handlePUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const staff = getStaffContext();
  if (typeof body.id !== "string" || !isAccessRole(body.accessRole) || body.accessRole === "OWNER" || !["ACTIVE", "INACTIVE"].includes(body.status)) {
    throw new AccessError(400, "Choose a valid staff account, role, and status.", "INVALID_STAFF");
  }
  const target = await prisma.employee.findFirst({ where: { id: body.id, tenantId: staff.tenantId } });
  if (!target) throw new AccessError(404, "Staff account was not found.", "NOT_FOUND");
  if (target.id === staff.employeeId || target.accessRole === "OWNER") throw new AccessError(403, "The owner account cannot be changed here.", "OWNER_PROTECTED");
  await prisma.employee.update({ where: { id: target.id, tenantId: staff.tenantId }, data: {
    accessRole: body.accessRole, status: body.status, accessApproved: true,
  } });
  return NextResponse.json({ ok: true });
}

export const GET = withStaff("staff.manage", handleGET);
export const POST = withStaff("staff.manage", handlePOST);
export const PUT = withStaff("staff.manage", handlePUT);
