import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  completeWorkflowStep,
  getNextWorkflowStep,
  getWorkflowStep,
  isPartyWorkflowStepKey,
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

    const party = await prisma.party.findUnique({ where: { id: eventId } });

    if (!party) {
      return NextResponse.json({ error: "Party or event was not found." }, { status: 404 });
    }

    if (party.status === "CANCELLED") {
      return NextResponse.json({ error: "Restore this party before changing its workflow step." }, { status: 400 });
    }

    const currentWorkflowStep = typeof party.workflowStep === "string" && isPartyWorkflowStepKey(party.workflowStep)
      ? party.workflowStep
      : "PENDING";

    const requestedWorkflowStep = typeof body.workflowStep === "string" && isPartyWorkflowStepKey(body.workflowStep)
      ? body.workflowStep
      : body.complete === true
        ? completeWorkflowStep.key
        : getNextWorkflowStep(currentWorkflowStep)?.key ?? completeWorkflowStep.key;

    const workflowStep = getWorkflowStep(requestedWorkflowStep);
    const nextStatus = body.complete === true ? "COMPLETED" : workflowStep.partyStatus;

    if (currentWorkflowStep === requestedWorkflowStep && party.status === nextStatus) {
      return NextResponse.json({ event: party });
    }

    const timelineTitle = body.complete === true ? "Party Completed" : workflowStep.timelineTitle;
    const timelineIcon = body.complete === true ? "✓" : workflowStep.timelineIcon;
    const timelineBody = body.complete === true
      ? `${party.eventNumber || party.title} was completed by staff.`
      : `${party.eventNumber || party.title} moved to ${workflowStep.label}.`;

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
            action: body.complete === true ? "complete-party" : "update-workflow-step",
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
