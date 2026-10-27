import {scheduleDelivery} from "@/lib/communications/background";
import { AsyncLocalStorage } from "node:async_hooks";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "./server";
import { hasPermission, type Permission } from "./permissions";

export class AccessError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}
type StaffContext = {
  employeeId: string; tenantId: string; authUserId: string;
  name: string; email: string; accessRole: string;
};
const staffStorage = new AsyncLocalStorage<StaffContext>();

export async function getVerifiedUser() {
  const { data: session, error } = await getAuth().getSession();
  if (error || !session?.user) throw new AccessError(401, "Sign in to continue.", "SIGN_IN_REQUIRED");
  if (!session.user.emailVerified) throw new AccessError(403, "Verify your email to continue.", "EMAIL_VERIFICATION_REQUIRED");
  return session.user;
}

export async function requireStaff(permission: Permission = "read"): Promise<StaffContext> {
  const user = await getVerifiedUser();
  let employee = await prisma.employee.findUnique({ where: { authUserId: user.id }, include: { staffRole: true } });
  // Existing seed employees are NOT approvals. Owners must explicitly approve access.
  if (!employee) {
    const approvals = await prisma.employee.findMany({
      where: { email: { equals: user.email.trim(), mode: "insensitive" }, authUserId: null, status: "ACTIVE", accessApproved: true },
      include: { staffRole: true }, take: 2,
    });
    if (approvals.length === 1) {
      const approval = approvals[0];
      const claimed = await prisma.employee.updateMany({
        where: { id: approval.id, authUserId: null, status: "ACTIVE", accessApproved: true },
        data: { authUserId: user.id },
      });
      if (claimed.count === 1) employee = { ...approval, authUserId: user.id };
    }
  }
  if (!employee || !employee.accessApproved || employee.status !== "ACTIVE" || (employee.staffRole && !employee.staffRole.active)) {
    throw new AccessError(403, "Your account has not been approved for staff access.", "STAFF_ACCESS_REQUIRED");
  }
  if (!hasPermission(employee.accessRole, permission)) throw new AccessError(403, "You do not have permission for this action.", "PERMISSION_DENIED");
  return {
    employeeId: employee.id, tenantId: employee.tenantId, authUserId: user.id,
    name: `${employee.firstName} ${employee.lastName}`.trim(), email: user.email, accessRole: employee.accessRole,
  };
}
export function getStaffContext() {
  const staff = staffStorage.getStore();
  if (!staff) throw new AccessError(401, "Staff access is required.", "SIGN_IN_REQUIRED");
  return staff;
}
export function getStaffTenant() {
  return prisma.tenant.findUnique({ where: { id: getStaffContext().tenantId } });
}
export function assertSameOrigin(request: Request | undefined) {
  if (!request || ["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new AccessError(403, "Cross-site requests are not allowed.", "INVALID_ORIGIN");
  }
}
export function accessErrorResponse(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error && typeof error === "object" && "code" in error && error.code === "P2025") return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
  console.error("Staff request failed", error);
  return NextResponse.json({ error: "Unable to complete the staff request." }, { status: 500 });
}
export function withStaff<T extends (...args: never[]) => Promise<Response>>(permission: Permission, handler: T, options: {scheduleEmailDelivery?: boolean} = {}): T {
  const protectedHandler = async (...args: Parameters<T>) => {
    try {
      assertSameOrigin((args as unknown[])[0] as Request | undefined);
      const staff = await requireStaff(permission);
      const response = await staffStorage.run(staff, () => handler(...args));
      response.headers.set("Cache-Control", "private, no-store");
      const request=(args as unknown[])[0] as Request|undefined;
      if(options.scheduleEmailDelivery!==false&&response.ok&&request&&!["GET","HEAD","OPTIONS"].includes(request.method))scheduleDelivery(staff.tenantId);
      return response;
    } catch (error) { return accessErrorResponse(error); }
  };
  return protectedHandler as T;
}
