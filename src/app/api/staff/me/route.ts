import { NextResponse } from "next/server";
import { getStaffContext, getStaffTenant, withStaff } from "@/lib/auth/staff";
import { getPermissions } from "@/lib/auth/permissions";

async function handleGET() {
  const staff = getStaffContext();
  const tenant=await getStaffTenant();
  return NextResponse.json({ business:tenant?{name:tenant.name,slug:tenant.slug,timezone:tenant.timezone}:null, staff: { ...staff, permissions: getPermissions(staff.accessRole) } });
}
export const GET = withStaff("read", handleGET);
