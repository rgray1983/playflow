import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    token: string;
  }>;
};

type RsvpPayload = {
  guestName?: string;
  parentName?: string;
  guestEmail?: string;
  guestPhone?: string;
  waiverAccepted?: boolean;
  notes?: string;
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status }
  );
}

function serializeParty(party: {
  id: string;
  eventNumber: string | null;
  title: string;
  eventDate: Date;
  startTime: Date;
  endTime: Date;
  packageName: string | null;
  guestOfHonor: string | null;
  notes: string | null;
  guests: {
    id: string;
    guestName: string | null;
    parentName: string | null;
    status: string;
    waiverStatus: string | null;
    createdAt: Date;
  }[];
}) {
  return {
    id: party.id,
    eventNumber: party.eventNumber,
    title: party.title,
    eventDate: party.eventDate,
    startTime: party.startTime,
    endTime: party.endTime,
    packageName: party.packageName,
    guestOfHonor: party.guestOfHonor,
    notes: party.notes ?? "",
    guests: party.guests.map((guest) => ({
      id: guest.id,
      guestName: guest.guestName,
      parentName: guest.parentName,
      status: guest.status,
      waiverStatus: guest.waiverStatus ?? "NEEDED",
      createdAt: guest.createdAt,
    })),
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
      return NextResponse.json({ error: "RSVP link was not found." }, { status: 404 });
    }

    return NextResponse.json({
      event: serializeParty(party),
    });
  } catch (error) {
    return jsonError(error, "Unable to load RSVP event.");
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;

    const party = await prisma.party.findUnique({
      where: {
        inviteToken: token,
      },
    });

    if (!party) {
      return NextResponse.json({ error: "RSVP link was not found." }, { status: 404 });
    }

    let body: RsvpPayload;

    try {
      body = (await request.json()) as RsvpPayload;
    } catch (error) {
      return jsonError(error, "Invalid RSVP request body.", 400);
    }

    const guestName = body.guestName?.trim();

    if (!guestName) {
      return NextResponse.json({ error: "Guest name is required." }, { status: 400 });
    }

    const waiverAccepted = Boolean(body.waiverAccepted);

    const guest = await prisma.$transaction(async (tx) => {
      const createdGuest = await tx.partyGuest.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          guestName,
          parentName: body.parentName?.trim() || null,
          guestEmail: body.guestEmail?.trim() || null,
          guestPhone: body.guestPhone?.trim() || null,
          status: "EXPECTED",
          waiverStatus: waiverAccepted ? "SIGNED" : "NEEDED",
          waiverSignedAt: waiverAccepted ? new Date() : null,
          notes: body.notes?.trim() || null,
        },
      });

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: waiverAccepted ? "✓" : "✉",
          title: waiverAccepted ? "Guest RSVP + Waiver Signed" : "Guest RSVP Received",
          body: `${guestName} was added from the RSVP link.`,
          metadata: {
            source: "rsvp",
            guestId: createdGuest.id,
          },
        },
      });

      return createdGuest;
    });

    return NextResponse.json({
      guest: {
        id: guest.id,
        guestName: guest.guestName,
        parentName: guest.parentName,
        status: guest.status,
        waiverStatus: guest.waiverStatus,
        waiverSignedAt: guest.waiverSignedAt,
      },
    });
  } catch (error) {
    return jsonError(error, "Unable to submit RSVP.");
  }
}
