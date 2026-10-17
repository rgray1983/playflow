import { ensurePartyLinks, linksReleased } from "@/lib/booking/party-links";
import { lockReservation, assertReservation } from "@/lib/booking/service";
import { BookingError } from "@/lib/booking/rules";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const party = await prisma.party.findUnique({ where: { confirmationToken: token } });
    if (!party) return NextResponse.json({ error: "Confirmation link was not found." }, { status: 404 });

    return NextResponse.json({
      party: {
        id: party.id,
        title: party.title,
        eventNumber: party.eventNumber,
        eventDate: party.eventDate,
        startTime: party.startTime,
        endTime: party.endTime,
        status: party.status,
        confirmationExpiresAt: party.confirmationExpiresAt ?? null,
      },
    });
  } catch (error) {
    return jsonError(error, "Unable to load confirmation.");
  }
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const party = await prisma.party.findUnique({ where: { confirmationToken: token } });
    if (!party) return NextResponse.json({ error: "Confirmation link was not found." }, { status: 404 });
    if (party.status === "CANCELLED") return NextResponse.json({ error: "This party has been cancelled." }, { status: 400 });

    const confirmationExpiresAt = party.confirmationExpiresAt ?? null;
    if (party.status === "PENDING" && confirmationExpiresAt && confirmationExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "This pending hold has expired." }, { status: 410 });
    }

    const updatedParty = await prisma.$transaction(async (tx) => {
      const current = await lockReservation(tx, party.tenantId, party.id);
      if (current.status === "CANCELLED") throw new BookingError("This party has been cancelled.");
      if (current.status !== "PENDING") {if(linksReleased(current.status))await ensurePartyLinks(tx,current);return current;}
      await assertReservation(tx, current);
      await tx.$executeRawUnsafe(
        'UPDATE "Party" SET status = $1::"PartyStatus", "workflowStep" = $2, "confirmedAt" = NOW(), "updatedAt" = NOW() WHERE id = $3',
        "CONFIRMED",
        "CONFIRMED",
        party.id,
      );

      const confirmed=await tx.party.findUniqueOrThrow({where:{id:party.id,tenantId:party.tenantId}});
      await ensurePartyLinks(tx,confirmed);

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: "✓",
          title: "Booking Confirmed",
          body: `${party.eventNumber || party.title} was confirmed from the confirmation link.`,
          metadata: { source: "confirmation-link", action: "confirm-party" },
        },
      });

      return tx.party.findUnique({ where: { id: party.id } });
    });

    return NextResponse.json({ party: updatedParty ? {
      id: updatedParty.id, title: updatedParty.title, eventNumber: updatedParty.eventNumber,
      eventDate: updatedParty.eventDate, startTime: updatedParty.startTime,
      endTime: updatedParty.endTime, status: updatedParty.status,
    } : null });
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return jsonError(error, "Unable to confirm party.");
  }
}
