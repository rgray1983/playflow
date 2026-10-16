import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, accessErrorResponse, assertSameOrigin, getVerifiedUser } from "@/lib/auth/staff";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getVerifiedUser();
    const body = await request.json().catch(() => ({}));
    const expected = process.env.PLAYFLOW_SETUP_TOKEN;
    const tenantId = process.env.PLAYFLOW_SETUP_TENANT_ID;
    const supplied = typeof body.setupCode === "string" ? body.setupCode.trim() : "";
    if (!expected || expected.length < 32 || !tenantId || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new AccessError(403, "The setup code is invalid or owner setup is unavailable.", "SETUP_DENIED");
    }
    if (await prisma.employee.findUnique({ where: { authUserId: user.id } })) {
      throw new AccessError(409, "This login already has a staff account.", "ALREADY_ASSIGNED");
    }
    await prisma.$transaction(async (tx) => {
      // Conditional write serializes simultaneous claims; only one can win.
      const claimed = await tx.tenant.updateMany({ where: { id: tenantId, ownerAuthUserId: null }, data: { ownerAuthUserId: user.id } });
      if (claimed.count !== 1) throw new AccessError(409, "An owner has already been set up.", "OWNER_EXISTS");
      const [firstName, ...last] = (user.name || user.email).trim().split(/\s+/);
      await tx.employee.create({ data: {
        tenantId, authUserId: user.id, email: user.email.trim().toLowerCase(),
        firstName, lastName: last.join(" "), role: "Owner", accessRole: "OWNER", accessApproved: true,
      } });
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return accessErrorResponse(error); }
}
