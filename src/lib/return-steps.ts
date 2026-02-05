// Return operational steps definition with STRICT STATE MACHINE
// States must progress: not_started → initiated → intake_done → evidence_done → issues_reviewed → closeout_done → deposit_processed

import type { Database } from "@/integrations/supabase/types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export type ReturnState = 
  | "not_started"
  | "initiated"
  | "intake_done"
  | "evidence_done"
  | "issues_reviewed"
  | "closeout_done"
  | "deposit_processed";

export type ReturnStepId =
  | "intake"
  | "evidence"
  | "issues"
  | "closeout"
  | "deposit";

export interface ReturnStep {
  id: ReturnStepId;
  number: number;
  title: string;
  description: string;
  icon: string;
  requiredState: ReturnState; // State that must be reached to consider this step complete
  prerequisiteState: ReturnState; // State required before this step can start
}

// STRICT: Each step requires the previous state to be completed
export const RETURN_STEPS: ReturnStep[] = [
  {
    id: "intake",
    number: 1,
    title: "Return Intake",
    description: "Record return time, odometer, and fuel level",
    icon: "clipboard-check",
    requiredState: "intake_done",
    prerequisiteState: "initiated",
  },
  {
    id: "evidence",
    number: 2,
    title: "Evidence Capture",
    description: "Capture return condition photos",
    icon: "camera",
    requiredState: "evidence_done",
    prerequisiteState: "intake_done",
  },
  {
    id: "issues",
    number: 3,
    title: "Issues & Damages",
    description: "Review flags, issues, and report any damages",
    icon: "alert-triangle",
    requiredState: "issues_reviewed",
    prerequisiteState: "evidence_done",
  },
  {
    id: "closeout",
    number: 4,
    title: "Closeout",
    description: "Complete the return and update booking status",
    icon: "check-circle",
    requiredState: "closeout_done",
    prerequisiteState: "issues_reviewed",
  },
  {
    id: "deposit",
    number: 5,
    title: "Deposit Release",
    description: "Release or withhold security deposit",
    icon: "wallet",
    requiredState: "deposit_processed",
    prerequisiteState: "closeout_done",
  },
];

// State machine: valid transitions only
export const VALID_STATE_TRANSITIONS: Record<ReturnState, ReturnState[]> = {
  not_started: ["initiated"],
  initiated: ["intake_done"],
  intake_done: ["evidence_done"],
  evidence_done: ["issues_reviewed"],
  issues_reviewed: ["closeout_done"],
  closeout_done: ["deposit_processed"],
  deposit_processed: [], // Terminal state
};

// STATE ORDER for comparison
const STATE_ORDER: ReturnState[] = [
  "not_started",
  "initiated",
  "intake_done",
  "evidence_done",
  "issues_reviewed",
  "closeout_done",
  "deposit_processed",
];

export function getStateIndex(state: ReturnState): number {
  return STATE_ORDER.indexOf(state);
}

export function isStateAtLeast(currentState: ReturnState, requiredState: ReturnState): boolean {
  return getStateIndex(currentState) >= getStateIndex(requiredState);
}

export function canTransitionTo(currentState: ReturnState, targetState: ReturnState): boolean {
  return VALID_STATE_TRANSITIONS[currentState]?.includes(targetState) ?? false;
}

// Check if a step can be accessed (viewed/worked on)
export function canAccessStep(stepId: ReturnStepId, currentState: ReturnState): boolean {
  const step = RETURN_STEPS.find(s => s.id === stepId);
  if (!step) return false;
  
  // Can access if we've reached the prerequisite state
  return isStateAtLeast(currentState, step.prerequisiteState);
}

// Check if a step is complete
export function isStepComplete(stepId: ReturnStepId, currentState: ReturnState): boolean {
  const step = RETURN_STEPS.find(s => s.id === stepId);
  if (!step) return false;
  
  return isStateAtLeast(currentState, step.requiredState);
}

// Get current step based on state
export function getCurrentStepFromState(returnState: ReturnState): ReturnStepId {
  // Find the first step that is not complete
  for (const step of RETURN_STEPS) {
    if (!isStateAtLeast(returnState, step.requiredState)) {
      return step.id;
    }
  }
  return "deposit"; // All done, show last step
}

// Get the next state when completing a step
export function getNextState(stepId: ReturnStepId): ReturnState | null {
  const step = RETURN_STEPS.find(s => s.id === stepId);
  return step?.requiredState ?? null;
}

// LEGACY SUPPORT: Old completion interface (for gradual migration)
export interface ReturnCompletion {
  intake: {
    timeRecorded: boolean;
    odometerRecorded: boolean;
    fuelRecorded: boolean;
  };
  evidence: {
    photosComplete: boolean;
  };
  issues: {
    reviewed: boolean;
    damagesRecorded: boolean;
  };
  closeout: {
    completed: boolean;
  };
  deposit: {
    processed: boolean;
  };
}

// Legacy function - NOW USES STATE MACHINE
export function checkReturnStepComplete(stepId: ReturnStepId, completion: ReturnCompletion, returnState?: ReturnState): boolean {
  // If we have state, use it
  if (returnState) {
    return isStepComplete(stepId, returnState);
  }
  
  // Fallback to old logic
  switch (stepId) {
    case "intake":
      return completion.intake.odometerRecorded || completion.intake.fuelRecorded;
    case "evidence":
      return completion.evidence.photosComplete;
    case "issues":
      return completion.issues.reviewed;
    case "closeout":
      return completion.closeout.completed;
    case "deposit":
      return completion.deposit.processed;
    default:
      return false;
  }
}

export function getReturnMissingItems(stepId: ReturnStepId, completion: ReturnCompletion): string[] {
  const missing: string[] = [];
  
  switch (stepId) {
    case "intake":
      if (!completion.intake.odometerRecorded) missing.push("Odometer reading");
      if (!completion.intake.fuelRecorded) missing.push("Fuel level");
      break;
    case "evidence":
      if (!completion.evidence.photosComplete) missing.push("Return photos");
      break;
    case "issues":
      if (!completion.issues.reviewed) missing.push("Issues review");
      break;
    case "closeout":
      if (!completion.closeout.completed) missing.push("Return completion");
      break;
    case "deposit":
      if (!completion.deposit.processed) missing.push("Deposit decision");
      break;
  }
  
  return missing;
}

// Legacy function - still works but prefer state machine
export function getCurrentReturnStepIndex(completion: ReturnCompletion): number {
  for (let i = 0; i < RETURN_STEPS.length; i++) {
    if (!checkReturnStepComplete(RETURN_STEPS[i].id, completion)) {
      return i;
    }
  }
  return RETURN_STEPS.length - 1;
}

// ========== WORKFLOW ENFORCEMENT ==========

/**
 * Validates whether a booking status transition can bypass the return workflow.
 * Only blocks active → completed if return workflow is incomplete.
 */
export function validateReturnWorkflow(
  currentStatus: BookingStatus,
  newStatus: BookingStatus,
  returnState: ReturnState | null | undefined
): { allowed: boolean; reason?: string } {
  // Only enforce for active → completed transitions
  if (currentStatus === "active" && newStatus === "completed") {
    const state = returnState || "not_started";
    
    // Must have completed at least the closeout step
    if (!isStateAtLeast(state as ReturnState, "closeout_done")) {
      return {
        allowed: false,
        reason: "Complete return workflow first (intake, evidence, issues, closeout)",
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Check if an admin override is valid for bypassing workflow
 * Requires minimum 50 characters for bypass justification
 */
export function isValidBypassReason(reason: string | undefined): boolean {
  return !!reason && reason.trim().length >= 50;
}
