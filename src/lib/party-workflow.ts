export type PartyWorkflowStatus =
  | "PENDING"
  | "CONFIRMED"
  | "READY"
  | "IN_PROGRESS"
  | "CLEANING_UP"
  | "COMPLETED";

export type PartyWorkflowStep = {
  status: PartyWorkflowStatus;
  label: string;
  shortLabel: string;
  description: string;
  nextActionLabel: string;
  confirmationTitle: string;
  confirmationBody: string;
  timelineTitle: string;
  timelineIcon: string;
};

export const partyWorkflowSteps: PartyWorkflowStep[] = [
  {
    status: "PENDING",
    label: "Pending",
    shortLabel: "Pending",
    description: "Booking needs confirmation before staff starts party prep.",
    nextActionLabel: "Confirm Booking",
    confirmationTitle: "Confirm this booking?",
    confirmationBody:
      "This moves the party into the confirmed schedule, keeps all booking details, and records the change in the timeline.",
    timelineTitle: "Party Confirmed",
    timelineIcon: "✓",
  },
  {
    status: "CONFIRMED",
    label: "Confirmed",
    shortLabel: "Confirmed",
    description: "Booking is confirmed. Staff can prepare the room and review details.",
    nextActionLabel: "Mark Ready",
    confirmationTitle: "Mark this party ready?",
    confirmationBody:
      "Use this when the room setup and party prep are ready. Guest tools and the timeline stay connected to this party.",
    timelineTitle: "Party Marked Ready",
    timelineIcon: "★",
  },
  {
    status: "READY",
    label: "Ready",
    shortLabel: "Ready",
    description: "Room setup is ready. The next step is to begin the live party.",
    nextActionLabel: "Start Party",
    confirmationTitle: "Start this party?",
    confirmationBody:
      "This begins the live party workflow. Guest check-in becomes the main focus and PlayFlow records that the party started.",
    timelineTitle: "Party Started",
    timelineIcon: "▶",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    shortLabel: "Live",
    description: "The party is running. Staff should manage guests, waivers, payments, and timeline activity.",
    nextActionLabel: "Begin Cleanup",
    confirmationTitle: "Begin cleanup?",
    confirmationBody:
      "Use this when the party activities are ending and staff is ready to move into room reset and final checkout tasks.",
    timelineTitle: "Party Moved to Cleaning Up",
    timelineIcon: "↻",
  },
  {
    status: "CLEANING_UP",
    label: "Cleaning Up",
    shortLabel: "Cleanup",
    description: "The party is ending. Staff should reset the room, check out guests, and close remaining balances.",
    nextActionLabel: "Complete Party",
    confirmationTitle: "Complete this party?",
    confirmationBody:
      "This closes the party workflow, keeps the records preserved, and moves the party out of the active operations dashboard.",
    timelineTitle: "Party Completed",
    timelineIcon: "✓",
  },
  {
    status: "COMPLETED",
    label: "Completed",
    shortLabel: "Done",
    description: "Party is finished. Records, timeline, guests, and payments are preserved.",
    nextActionLabel: "Completed",
    confirmationTitle: "Party completed",
    confirmationBody: "This party has already been completed.",
    timelineTitle: "Party Completed",
    timelineIcon: "✓",
  },
];

export const partyWorkflowStatuses = partyWorkflowSteps.map((step) => step.status);

export function getWorkflowStep(status: string | null | undefined) {
  return partyWorkflowSteps.find((step) => step.status === status) ?? partyWorkflowSteps[0];
}

export function getWorkflowStepIndex(status: string | null | undefined) {
  const index = partyWorkflowSteps.findIndex((step) => step.status === status);
  return index >= 0 ? index : 0;
}

export function getNextWorkflowStep(status: string | null | undefined) {
  const index = getWorkflowStepIndex(status);
  return partyWorkflowSteps[index + 1] ?? null;
}

export function isWorkflowStatus(status: string): status is PartyWorkflowStatus {
  return partyWorkflowStatuses.includes(status as PartyWorkflowStatus);
}
