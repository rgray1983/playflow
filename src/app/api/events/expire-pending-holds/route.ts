import { withStaff, getStaffContext } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

async function handlePOST() {
  try {
    const expiredParties = await prisma.party.findMany({
      where: {
        tenantId: getStaffContext().tenantId,
        status: "PENDING",
        confirmationExpiresAt: { lt: new Date() },
      },
      select: { id: true },
    });

    const ids = expiredParties.map((party) => party.id);

    if (ids.length > 0) {
      await prisma.party.deleteMany({ where: { id: { in: ids }, tenantId: getStaffContext().tenantId } });
    }

    return NextResponse.json({ expiredCount: ids.length, expiredPartyIds: ids });
  } catch (error) {
    return jsonError(error, "Unable to expire pending holds.");
  }
}

export const POST = withStaff("settings.write", handlePOST);
