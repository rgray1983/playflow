import { NextResponse } from "next/server";
import { getStaffTenant, withStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/prisma";
import { bookingOptions } from "@/lib/booking/service";
import { BookingError } from "@/lib/booking/rules";
async function handleGET(request: Request) {
  try {
    const tenant = await getStaffTenant();
    if (!tenant) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    const query = new URL(request.url).searchParams;
    const options = await bookingOptions(prisma, tenant, { eventTypeId: query.get("eventTypeId") ?? "", packageId: query.get("packageId") ?? "", addOnIds: query.getAll("addOnId"), eventDate: query.get("date") ?? "", waived: query.get("waived") === "true" });
    return NextResponse.json({ slots: options.slots, quote: options.quote, timezone: options.timezone });
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Booking availability failed", error);
    return NextResponse.json({ error: "Unable to check availability. Please try again." }, { status: 500 });
  }
}
export const GET = withStaff("parties.write", handleGET);
