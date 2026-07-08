import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clampWorkflowStep,
  completeWorkflowIndex,
  getStatusForWorkflowStep,
  getWorkflowStep,
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
    const requestedWorkflowStep = clampWorkflowStep(body.workflowStep);
    const nextStatus = getStatusForWorkflowStep(requestedWorkflowStep);
    const workflowStep = getWorkflowStep(requestedWorkflowStep);

    const party = await prisma.party.findUnique({ where: { id: eventId } });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    if (party.status === "CANCELLED") {
      return NextResponse.json({ error: "Restore this party before changing its workflow step." }, { status: 400 });
    }

    const currentWorkflowStep = clampWorkflowStep((party as { workflowStep?: number | null }).workflowStep);

    if (currentWorkflowStep === requestedWorkflowStep && party.status === nextStatus) {
      return NextResponse.json({ event: party });
    }

    const timelineTitle = requestedWorkflowStep >= completeWorkflowIndex
      ? "Party Completed"
      : workflowStep?.timelineTitle ?? `Party moved to step ${requestedWorkflowStep}`;

    const timelineIcon = requestedWorkflowStep >= completeWorkflowIndex
      ? "✓"
      : workflowStep?.timelineIcon ?? "•";

    const timelineBody = requestedWorkflowStep >= completeWorkflowIndex
      ? `${party.eventNumber || party.title} was completed by staff.`
      : `${party.eventNumber || party.title} moved to ${workflowStep?.label ?? "the next workflow step"}.`;

    const updatedParty = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'UPDATE "Party" SET status = $1::"PartyStatus", "workflowStep" = $2, "updatedAt" = NOW() WHERE id = $3',
        nextStatus,
        requestedWorkflowStep,
        eventId,
      );

      await tx.eventTimelineItem.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          icon: timelineIcon,
          title: timelineTitle,
          body: timelineBody,
          metadata: {
            source: "party-manager",
            action: "update-workflow-step",
            previousStatus: party.status,
            nextStatus,
            previousWorkflowStep: currentWorkflowStep,
            nextWorkflowStep: requestedWorkflowStep,
          },
        },
      });

      return tx.party.findUnique({ where: { id: eventId } });
    });

    return NextResponse.json({ event: updatedParty });
  } catch (error) {
    return jsonError(error, "Unable to update party workflow.");
  }
}
