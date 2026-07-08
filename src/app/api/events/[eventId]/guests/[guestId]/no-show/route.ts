import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    eventId: string;
    guestId: string;
  }>;
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status },
  );
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { eventId, guestId } = await params;

    const guest = await prisma.partyGuest.findFirst({
      where: {
        id: guestId,
        partyId: eventId,
      },
      include: {
        party: true,
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest was not found for this party." }, { status: 404 });
    }

    if (guest.party.status === "CANCELLED") {
      return NextResponse.json({ error: "Cancelled parties cannot be updated." }, { status: 400 });
    }

    const updatedGuest = await prisma.$transaction(async (tx) => {
      const savedGuest = await tx.partyGuest.update({
        where: {
          id: guestId,
        },
        data: {
          status: "NO_SHOW",
        },
      });

      await tx.eventTimelineItem.create({
        data: {
          tenantId: guest.tenantId,
          partyId: eventId,
          icon: "○",
          title: "Guest Marked No Show",
          body: `${guest.guestName || "Unnamed guest"} was marked no show.`,
          metadata: {
            source: "party-manager",
            action: "no-show",
            guestId,
          },
        },
      });

      return savedGuest;
    });

    return NextResponse.json({ guest: updatedGuest });
  } catch (error) {
    return jsonError(error, "Unable to update guest.");
  }
}
