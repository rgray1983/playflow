import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    token: string;
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

function serializeGuest(guest: {
  id: string;
  guestName: string | null;
  parentName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  status: string;
  rsvpStatus: string;
  waiverStatus: string;
  notes: string | null;
  declineReason: string | null;
  declinedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: guest.id,
    guestName: guest.guestName,
    parentName: guest.parentName,
    guestEmail: guest.guestEmail,
    guestPhone: guest.guestPhone,
    status: guest.status,
    rsvpStatus: guest.rsvpStatus,
    waiverStatus: guest.waiverStatus,
    notes: guest.notes,
    declineReason: guest.declineReason,
    declinedAt: guest.declinedAt,
    createdAt: guest.createdAt,
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;

    const party = await prisma.party.findUnique({
      where: {
        inviteToken: token,
      },
      include: {
        guests: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Host RSVP dashboard was not found." }, { status: 404 });
    }

    const attendingGuests = party.guests.filter((guest) => guest.rsvpStatus !== "DECLINED");
    const declinedGuests = party.guests.filter((guest) => guest.rsvpStatus === "DECLINED");

    return NextResponse.json({
      event: {
        id: party.id,
        eventNumber: party.eventNumber,
        title: party.title,
        eventDate: party.eventDate,
        startTime: party.startTime,
        endTime: party.endTime,
        packageName: party.packageName,
        guestOfHonor: party.guestOfHonor,
        notes: party.notes ?? "",
        guestCount: party.guestCount ?? null,
        totals: {
          attending: attendingGuests.length,
          declined: declinedGuests.length,
          totalResponses: party.guests.length,
          waiverNeeded: attendingGuests.filter((guest) => guest.waiverStatus !== "SIGNED").length,
          favorCount: attendingGuests.length,
          supplyCount: attendingGuests.length,
        },
        attendingGuests: attendingGuests.map(serializeGuest),
        declinedGuests: declinedGuests.map(serializeGuest),
      },
    });
  } catch (error) {
    return jsonError(error, "Unable to load host RSVP dashboard.");
  }
}
