import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ eventId: string }>;
};

const allowedStatuses = new Set([
  "PENDING",
  "CONFIRMED",
  "READY",
  "IN_PROGRESS",
  "CLEANING_UP",
  "COMPLETED",
]);

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  READY: "Ready",
  IN_PROGRESS: "In Progress",
  CLEANING_UP: "Cleaning Up",
  COMPLETED: "Completed",
};

const timelineTitles: Record<string, string> = {
  PENDING: "Party Marked Pending",
  CONFIRMED: "Party Confirmed",
  READY: "Party Marked Ready",
  IN_PROGRESS: "Party Started",
  CLEANING_UP: "Party Moved to Cleaning Up",
  COMPLETED: "Party Completed",
};

const timelineIcons: Record<string, string> = {
  PENDING: "…",
  CONFIRMED: "✓",
  READY: "★",
  IN_PROGRESS: "▶",
  CLEANING_UP: "↻",
  COMPLETED: "✓",
};

function jsonError(error: unknown, fallbackMessage: string, status = 500) {
  console.error(fallbackMessage, error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status },
  );
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const body = await request.json().catch(() => ({}));
    const nextStatus = typeof body.status === "string" ? body.status : "";

    if (!allowedStatuses.has(nextStatus)) {
      return NextResponse.json({ error: "Unsupported party status." }, { status: 400 });
    }

    const party = await prisma.party.findUnique({ where: { id: eventId } });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    if (party.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Restore this party before changing its workflow status." },
        { status: 400 },
      );
    }

    if (party.status === nextStatus) {
      return NextResponse.json({ event: party });
    }

    const updatedParty = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'UPDATE "Party" SET status = $1::"PartyStatus", "updatedAt" = NOW() WHERE id = $2',
        nextStatus,
        eventId,
      );

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: timelineIcons[nextStatus] ?? "•",
          title: timelineTitles[nextStatus] ?? `Party status changed to ${statusLabels[nextStatus]}`,
          body: `${party.eventNumber || party.title} was moved to ${statusLabels[nextStatus]} by staff.`,
          metadata: {
            source: "party-manager",
            action: "update-party-status",
            previousStatus: party.status,
            nextStatus,
          },
        },
      });

      return tx.party.findUnique({ where: { id: eventId } });
    });

    return NextResponse.json({ event: updatedParty });
  } catch (error) {
    return jsonError(error, "Unable to update party status.");
  }
}
