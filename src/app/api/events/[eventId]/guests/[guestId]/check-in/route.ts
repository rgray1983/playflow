import { withStaff, getStaffContext } from "@/lib/auth/staff";
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

async function handlePOST(_request: Request, { params }: Params) {
  try {
    const { eventId, guestId } = await params;

    const guest = await prisma.partyGuest.findFirst({
      where: {
        id: guestId,
        partyId: eventId,
        tenantId: getStaffContext().tenantId,
      },
      include: {
        party: true,
        waiverChild: {include: {waiver: true}},
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest was not found for this party." }, { status: 404 });
    }

    if (guest.party.status === "CANCELLED") {
      return NextResponse.json({ error: "Cancelled parties cannot be updated." }, { status: 400 });
    }

    if (guest.rsvpStatus === "DECLINED") return NextResponse.json({error: "This guest declined the invitation."}, {status:400});
    const coverage = guest.waiverChild;
    const waiver = coverage?.waiver;
    if (!coverage || !waiver || coverage.childId !== guest.childId || waiver.tenantId !== guest.tenantId || waiver.kind !== "LIABILITY" || coverage.status !== "VALID" || waiver.status !== "VALID" || !coverage.signedAt || !waiver.signedAt || !waiver.version || (waiver.expiresAt && waiver.expiresAt.getTime() <= Date.now())) return NextResponse.json({error: "A signed liability waiver linked to this child is required before check-in."}, {status:400});
    if (guest.status === "CHECKED_IN") return NextResponse.json({guest});
    const updatedGuest = await prisma.$transaction(async (tx) => {
      const savedGuest = await tx.partyGuest.update({
        where: { id: guestId, tenantId: getStaffContext().tenantId },
        data: {
          status: "CHECKED_IN",
          checkedInAt: new Date(),
        },
      });

      await tx.eventTimelineItem.create({
        data: {
          tenantId: guest.tenantId,
          partyId: eventId,
          icon: "✓",
          title: "Guest Checked In",
          body: `${guest.guestName || "Unnamed guest"} was checked in.`,
          metadata: {
            source: "party-manager",
            action: "check-in",
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

export const POST = withStaff("guests.write", handlePOST);
