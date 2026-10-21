import {assertBookingReady} from "@/lib/booking/confirmation";
import { ensurePartyLinks, linksReleased } from "@/lib/booking/party-links";
import { lockReservation, assertReservation } from "@/lib/booking/service";
import { BookingError } from "@/lib/booking/rules";
import { withStaff, getStaffContext } from "@/lib/auth/staff";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status },
  );
}

async function handlePOST(_request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const party = await prisma.party.findUnique({ where: { id: eventId, tenantId: getStaffContext().tenantId } });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    if (party.status === "CANCELLED") {
      return NextResponse.json({ error: "Restore this party before confirming it." }, { status: 400 });
    }

    const updatedParty = await prisma.$transaction(async (tx) => {
      const current = await lockReservation(tx, party.tenantId, party.id);
      if (current.status === "CANCELLED") throw new BookingError("This party has been cancelled.");
      if (current.status !== "PENDING") {if(linksReleased(current.status))await ensurePartyLinks(tx,current);return current;}
      await assertBookingReady(tx,current);
      await assertReservation(tx, current);
      await tx.$executeRawUnsafe(
        'UPDATE "Party" SET status = $1::"PartyStatus", "workflowStep" = $2, "confirmedAt" = NOW(), "updatedAt" = NOW() WHERE id = $3',
        "CONFIRMED",
        "CONFIRMED",
        eventId,
      );

      const confirmed=await tx.party.findUniqueOrThrow({where:{id:party.id,tenantId:party.tenantId}});
      await ensurePartyLinks(tx,confirmed);

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: "✓",
          title: "Booking Confirmed",
          body: `${party.eventNumber || party.title} was confirmed by staff.`,
          metadata: {
            source: "party-manager",
            action: "confirm-party",
          },
        },
      });

      return tx.party.findUnique({ where: { id: eventId, tenantId: getStaffContext().tenantId } });
    });

    return NextResponse.json({ event: updatedParty });
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return jsonError(error, "Unable to confirm party.");
  }
}

export const POST = withStaff("parties.write", handlePOST);
