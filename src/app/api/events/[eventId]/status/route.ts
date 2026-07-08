import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getNextWorkflowStep,
  getWorkflowStep,
  isWorkflowStatus,
} from "@/lib/party-workflow";

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

export async function POST(request: Request, { params }: Params) {
  try {
    const { eventId } = await params;
    const body = await request.json().catch(() => ({}));
    const nextStatus = typeof body.status === "string" ? body.status : "";

    if (!isWorkflowStatus(nextStatus)) {
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

    const expectedNextStep = getNextWorkflowStep(party.status);

    if (!expectedNextStep || expectedNextStep.status !== nextStatus) {
      return NextResponse.json(
        { error: "This workflow step is not the next recommended action." },
        { status: 400 },
      );
    }

    const nextStep = getWorkflowStep(nextStatus);

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
          icon: nextStep.timelineIcon,
          title: nextStep.timelineTitle,
          body: `${party.eventNumber || party.title} was moved to ${nextStep.label} by staff.`,
          metadata: {
            source: "party-manager",
            action: "advance-party-workflow",
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
