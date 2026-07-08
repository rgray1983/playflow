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
        pendingExpiresAt: (party as { pendingExpiresAt?: Date | null }).pendingExpiresAt ?? null,
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

    const pendingExpiresAt = (party as { pendingExpiresAt?: Date | null }).pendingExpiresAt ?? null;
    if (party.status === "PENDING" && pendingExpiresAt && pendingExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "This pending hold has expired." }, { status: 410 });
    }

    const updatedParty = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'UPDATE "Party" SET status = $1::"PartyStatus", "workflowStep" = 1, "confirmedAt" = NOW(), "updatedAt" = NOW() WHERE id = $2',
        "CONFIRMED",
        party.id,
      );

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

    return NextResponse.json({ party: updatedParty });
  } catch (error) {
    return jsonError(error, "Unable to confirm party.");
  }
}
