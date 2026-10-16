import { withStaff, getStaffContext } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
async function handlePOST() {
  try {
    const tenantId = getStaffContext().tenantId;
    const ids = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`);
      const expired = await tx.party.findMany({ where: { tenantId, status: "PENDING", confirmationExpiresAt: { lte: new Date() } }, select: { id: true } });
      for (const party of expired) {
        await tx.party.update({ where: { id: party.id, tenantId }, data: { status: "CANCELLED" } });
        await tx.eventTimelineItem.create({ data: { tenantId, partyId: party.id, title: "Pending Hold Expired", body: "The hold expired. Booking, guest records and payment history were preserved. Review any recorded payments for a refund or credit.", icon: "×", metadata: { source: "hold-expiration" } } });
      }
      return expired.map(p => p.id);
    }, { maxWait: 10000, timeout: 15000 });
    return NextResponse.json({ expiredCount: ids.length, expiredPartyIds: ids });
  } catch (error) {
    console.error("Unable to expire pending holds", error);
    return NextResponse.json({ error: "Unable to expire pending holds." }, { status: 500 });
  }
}
export const POST = withStaff("settings.write", handlePOST);
