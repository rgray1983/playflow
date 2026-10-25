import { NextRequest, NextResponse } from "next/server";
import { AccessError, requireStaff } from "@/lib/auth/staff";

export async function proxy(request: NextRequest) {
  try {
    await requireStaff(request.nextUrl.pathname==="/families"||request.nextUrl.pathname.startsWith("/families/")?"families.read":"read");
    return NextResponse.next();
  } catch (error) {
    const path = error instanceof AccessError
      ? error.code === "SIGN_IN_REQUIRED" ? "/auth/sign-in"
        : error.code === "EMAIL_VERIFICATION_REQUIRED" ? "/auth/verify" : "/auth/access"
      : "/auth/unavailable";
    return NextResponse.redirect(new URL(path, request.url));
  }
}

export const config = {
  matcher: ["/", "/families/:path*", "/bookings/:path*", "/calendar/:path*", "/check-in/:path*", "/company-settings/:path*", "/parties/:path*", "/pos/:path*", "/reports/:path*"],
};
