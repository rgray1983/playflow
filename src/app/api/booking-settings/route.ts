import { NextResponse } from "next/server";
import { withStaff, getStaffTenant, getStaffContext } from "@/lib/auth/staff";
import { prisma } from "@/lib/prisma";
import { scheduleFrom } from "@/lib/booking/rules";
async function handleGET() {
  const tenant = await getStaffTenant();
  return NextResponse.json({ schedule: scheduleFrom(tenant?.bookingSettings), timezone: tenant?.timezone });
}
async function handlePUT(request: Request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid schedule." }, { status: 400 }); }
  if (!body || !Array.isArray(body.startTimes) || body.startTimes.length < 1 || body.startTimes.length > 48 || new Set(body.startTimes).size !== body.startTimes.length || body.startTimes.some((t: unknown) => typeof t !== "string" || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(t)) || !Number.isInteger(body.bufferMinutes) || body.bufferMinutes < 0 || body.bufferMinutes > 720 || !Array.isArray(body.daysOfWeek) || body.daysOfWeek.length < 1 || body.daysOfWeek.some((d: unknown) => typeof d !== "number" || !Number.isInteger(d) || d < 1 || d > 7)) return NextResponse.json({ error: "Enter valid start times, open days, and turnaround minutes (0–720)." }, { status: 400 });
  const schedule = { startTimes: [...body.startTimes].sort(), bufferMinutes: body.bufferMinutes, daysOfWeek: [...new Set<number>(body.daysOfWeek)].sort() };
  await prisma.tenant.update({ where: { id: getStaffContext().tenantId }, data: { bookingSettings: schedule } });
  return NextResponse.json({ schedule });
}
export const GET = withStaff("read", handleGET);
export const PUT = withStaff("settings.write", handlePUT);
