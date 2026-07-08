import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ eventId: string }> };

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallbackMessage }, { status });
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const party = await prisma.party.findUnique({ where: { id: eventId } });

    if (!party) return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    if (party.status === "CANCELLED") return NextResponse.json({ event: party });

    const updatedParty = await prisma.$transaction(async (tx) => {
      const event = await tx.party.update({ where: { id: eventId }, data: { status: "CANCELLED" } });
      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: "×",
          title: "Party Cancelled",
          body: `${party.eventNumber || party.title} was cancelled by staff. Booking, guest, timeline, and payment records were preserved.`,
          metadata: { source: "party-manager", action: "cancel-party" },
        },
      });
      return event;
    });

    return NextResponse.json({ event: updatedParty });
  } catch (error) {
    return jsonError(error, "Unable to cancel party.");
  }
}
