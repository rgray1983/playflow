import { NextResponse } from "next/server";
import { getStaffContext, withStaff } from "@/lib/auth/staff";
import { getPermissions } from "@/lib/auth/permissions";

async function handleGET() {
  const staff = getStaffContext();
  return NextResponse.json({ staff: { ...staff, permissions: getPermissions(staff.accessRole) } });
}
export const GET = withStaff("read", handleGET);
