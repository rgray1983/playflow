import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

export async function POST() {
  try {
    const expiredParties = await prisma.party.findMany({
      where: {
        status: "PENDING",
        confirmationExpiresAt: { lt: new Date() },
      } as any,
      select: { id: true },
    });

    const ids = expiredParties.map((party) => party.id);

    if (ids.length > 0) {
      await prisma.party.deleteMany({ where: { id: { in: ids } } });
    }

    return NextResponse.json({ expiredCount: ids.length, expiredPartyIds: ids });
  } catch (error) {
    return jsonError(error, "Unable to expire pending holds.");
  }
}
