export type PartyWorkflowStepKey =
  | "PENDING"
  | "CONFIRMED"
  | "ROOM_SETUP"
  | "CHECK_IN"
  | "PARTY_TIME"
  | "PAYMENT"
  | "CLEANUP";

export type PartyStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "READY"
  | "IN_PROGRESS"
  | "CLEANING_UP"
  | "COMPLETED"
  | "CANCELLED";

export type PartyWorkflowStep = {
  key: PartyWorkflowStepKey;
  label: string;
  description: string;
  nextActionLabel: string;
  confirmationTitle: string;
  confirmationBody: string;
  timelineTitle: string;
  timelineIcon: string;
  partyStatus: Exclude<PartyStatusValue, "CANCELLED">;
};

export const partyWorkflowSteps: PartyWorkflowStep[] = [
  {
    key: "PENDING",
    label: "Pending",
    description: "The date and time are being held. Confirmation is required within 48 hours before the deposit is processed.",
    nextActionLabel: "Confirm Party",
    confirmationTitle: "Confirm this party?",
    confirmationBody: "This will lock the party into the schedule, process the saved deposit method if one is attached, and move the party into the active workflow.",
    timelineTitle: "Party Confirmed",
    timelineIcon: "✓",
    partyStatus: "PENDING",
  },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    description: "The party is confirmed. Staff can review details and prepare the room.",
    nextActionLabel: "Start Room Setup",
    confirmationTitle: "Start room setup?",
    confirmationBody: "This moves the party into room setup so staff can prep decorations, tables, food, and event details.",
    timelineTitle: "Room Setup Started",
    timelineIcon: "★",
    partyStatus: "CONFIRMED",
  },
  {
    key: "ROOM_SETUP",
    label: "Room Setup",
    description: "The room is being prepared before guests arrive.",
    nextActionLabel: "Open Check-In",
    confirmationTitle: "Open guest check-in?",
    confirmationBody: "This makes check-in the main focus so staff can begin receiving guests and waivers.",
    timelineTitle: "Guest Check-In Opened",
    timelineIcon: "✓",
    partyStatus: "READY",
  },
  {
    key: "CHECK_IN",
    label: "Check-In",
    description: "Guests are arriving. Staff should check guests in and watch waiver status.",
    nextActionLabel: "Start Party Time",
    confirmationTitle: "Start party time?",
    confirmationBody: "This begins the live party portion and records that the party officially started.",
    timelineTitle: "Party Time Started",
    timelineIcon: "▶",
    partyStatus: "IN_PROGRESS",
  },
  {
    key: "PARTY_TIME",
    label: "Party Time",
    description: "The party is live. Staff can manage guests, activities, and timeline activity.",
    nextActionLabel: "Move to Payment",
    confirmationTitle: "Move to payment?",
    confirmationBody: "Use this when the party is nearing checkout and staff should collect any remaining balance.",
    timelineTitle: "Moved to Payment",
    timelineIcon: "$",
    partyStatus: "IN_PROGRESS",
  },
  {
    key: "PAYMENT",
    label: "Payment",
    description: "Collect remaining balance before closing the event.",
    nextActionLabel: "Begin Cleanup",
    confirmationTitle: "Begin cleanup?",
    confirmationBody: "This moves the party into cleanup after payment and checkout tasks are handled.",
    timelineTitle: "Cleanup Started",
    timelineIcon: "↻",
    partyStatus: "CLEANING_UP",
  },
  {
    key: "CLEANUP",
    label: "Cleanup",
    description: "Reset the room, check out guests, save notes, and finish the event.",
    nextActionLabel: "Ready to Complete",
    confirmationTitle: "Mark cleanup done?",
    confirmationBody: "This marks the progress bar complete. The Complete Party button will become available next.",
    timelineTitle: "Cleanup Completed",
    timelineIcon: "✓",
    partyStatus: "CLEANING_UP",
  },
];

export const partyWorkflowStepKeys = partyWorkflowSteps.map((step) => step.key);
export const completeWorkflowStep = partyWorkflowSteps[partyWorkflowSteps.length - 1];

export function isPartyWorkflowStepKey(value: string): value is PartyWorkflowStepKey {
  return partyWorkflowStepKeys.includes(value as PartyWorkflowStepKey);
}

export function getWorkflowStep(stepKey: string | null | undefined) {
  return partyWorkflowSteps.find((step) => step.key === stepKey) ?? partyWorkflowSteps[0];
}

export function getWorkflowStepIndex(stepKey: string | null | undefined) {
  const index = partyWorkflowSteps.findIndex((step) => step.key === stepKey);
  return index >= 0 ? index : 0;
}

export function getNextWorkflowStep(stepKey: string | null | undefined) {
  const index = getWorkflowStepIndex(stepKey);
  return partyWorkflowSteps[index + 1] ?? null;
}

export function getProgressPercent(stepKey: string | null | undefined) {
  const index = getWorkflowStepIndex(stepKey);
  return Math.round(((index + 1) / partyWorkflowSteps.length) * 100);
}

export function isWorkflowComplete(stepKey: string | null | undefined) {
  return getWorkflowStepIndex(stepKey) >= partyWorkflowSteps.length - 1;
}
