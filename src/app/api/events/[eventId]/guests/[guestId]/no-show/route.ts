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
      return NextResponse.json(
        { error: "Guest was not found for this event." },
        { status: 404 },
      );
    }

    const updatedGuest = await prisma.$transaction(async (tx) => {
      const updated = await tx.partyGuest.update({
        where: {
          id: guest.id,
        },
        data: {
          status: "NO_SHOW",
          checkedInAt: null,
          checkedOutAt: null,
        },
      });

      if (guest.status !== "NO_SHOW") {
        await tx.eventTimelineItem.create({
          data: {
            tenantId: guest.tenantId,
            partyId: guest.partyId,
            icon: "!",
            title: "Guest Marked No-Show",
            body: `${guest.guestName || "Unnamed Guest"} was marked as a no-show.`,
            metadata: {
              source: "party-control-center",
              guestId: guest.id,
            },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      guest: {
        id: updatedGuest.id,
        guestName: updatedGuest.guestName,
        guestEmail: updatedGuest.guestEmail,
        guestPhone: updatedGuest.guestPhone,
        parentName: updatedGuest.parentName,
        status: updatedGuest.status,
        waiverStatus: updatedGuest.waiverStatus,
        waiverSignedAt: updatedGuest.waiverSignedAt,
        checkedInAt: updatedGuest.checkedInAt,
        checkedOutAt: updatedGuest.checkedOutAt,
      },
    });
  } catch (error) {
    return jsonError(error, "Unable to mark guest as no-show.");
  }
}
