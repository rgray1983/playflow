import { withStaff, getStaffContext } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import {Prisma} from "@/generated/prisma/client";
import {FormError} from "@/lib/waivers/signing";
import {assertNoPendingPayment} from "@/lib/payments/pending";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ eventId: string }> };

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

async function handlePOST(_request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const party = await prisma.party.findUnique({ where: { id: eventId, tenantId: getStaffContext().tenantId } });
    if (!party) return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    if (party.status === "CANCELLED") return NextResponse.json({ event: party });

    const updatedParty = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Tenant" WHERE id=${party.tenantId} FOR UPDATE`);
      await assertNoPendingPayment(tx,party.tenantId,[`party:${eventId}`]);
      const event = await tx.party.update({ where: { id: eventId, tenantId: getStaffContext().tenantId }, data: { status: "CANCELLED" } });
      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: "×",
          title: party.confirmedAt ? "Confirmed Party Cancelled" : "Pending Hold Cancelled",
          body: party.confirmedAt
            ? `${party.eventNumber || party.title} was cancelled by staff. Refund or credit review may be needed if payment was captured.`
            : `${party.eventNumber || party.title} was cancelled before confirmation. Review recorded payments for any refund or credit due.`,
          metadata: { source: "party-manager", action: "cancel-party", wasConfirmed: Boolean(party.confirmedAt) },
        },
      });
      return event;
    });

    return NextResponse.json({ event: updatedParty });
  } catch (error) {
    if(error instanceof FormError)return NextResponse.json({error:error.message},{status:error.status});
    return jsonError(error, "Unable to cancel party.");
  }
}

export const POST = withStaff("parties.write", handlePOST);
