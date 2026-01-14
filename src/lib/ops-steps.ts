// Operational steps definition for full-screen wizard
// UPDATED: Simplified workflow per requirements

export type OpsStepId = 
  | "prep" 
  | "checkin" 
  | "payment" 
  | "agreement" 
  | "walkaround" 
  | "handover";

// Enhanced status types including blocked states
export type OpsStepStatus = "locked" | "ready" | "in_progress" | "complete" | "blocked" | "needs_attention";

export interface OpsStep {
  id: OpsStepId;
  number: number;
  title: string;
  description: string;
  icon: string;
}

// UPDATED: 6 steps (removed "intake" - license is now on profile)
export const OPS_STEPS: OpsStep[] = [
  {
    id: "prep",
    number: 1,
    title: "Pre-Arrival Preparation",
    description: "Complete prep checklist and capture pre-inspection photos",
    icon: "wrench",
  },
  {
    id: "checkin",
    number: 2,
    title: "Customer Check-In",
    description: "Verify Gov ID, driver's license on file, age, and expiry",
    icon: "user-check",
  },
  {
    id: "payment",
    number: 3,
    title: "Payment & Deposit",
    description: "Payment auto-syncs if online; deposit is manual/offline",
    icon: "credit-card",
  },
  {
    id: "agreement",
    number: 4,
    title: "Rental Agreement",
    description: "Manual in-person agreement signing",
    icon: "file-text",
  },
  {
    id: "walkaround",
    number: 5,
    title: "Vehicle Walkaround",
    description: "Staff-only inspection checklist (no customer signature)",
    icon: "eye",
  },
  {
    id: "handover",
    number: 6,
    title: "Handover & Activation",
    description: "Complete handover, send SMS, move to Active Rentals",
    icon: "key",
  },
];

export interface StepCompletion {
  prep: {
    checklistComplete: boolean;
    photosComplete: boolean;
  };
  checkin: {
    govIdVerified: boolean;
    licenseOnFile: boolean;
    nameMatches: boolean;
    licenseNotExpired: boolean;
    ageVerified: boolean;
  };
  payment: {
    paymentComplete: boolean;
    depositCollected: boolean;
  };
  agreement: {
    agreementSigned: boolean;
  };
  walkaround: {
    inspectionComplete: boolean;
  };
  handover: {
    activated: boolean;
    smsSent: boolean;
  };
}

export interface BlockingIssue {
  type: "conflict" | "missing" | "rejected" | "overdue";
  message: string;
  stepId: OpsStepId;
  canOverride: boolean;
}

export function getStepStatus(
  stepId: OpsStepId,
  completion: StepCompletion,
  currentStepIndex: number
): { status: OpsStepStatus; reason?: string; missingCount?: number; isBlocked?: boolean } {
  const stepIndex = OPS_STEPS.findIndex(s => s.id === stepId);
  
  // Check for blocking issues first
  const blockingIssues = getBlockingIssues(stepId, completion);
  if (blockingIssues.length > 0) {
    return {
      status: "blocked",
      reason: blockingIssues[0].message,
      isBlocked: true,
    };
  }
  
  // Check if step is complete
  const isComplete = checkStepComplete(stepId, completion);
  if (isComplete) {
    return { status: "complete" };
  }
  
  // If previous step is not complete, this step is locked
  if (stepIndex > 0) {
    const prevStep = OPS_STEPS[stepIndex - 1];
    if (!checkStepComplete(prevStep.id, completion)) {
      return { 
        status: "locked", 
        reason: `Complete "${prevStep.title}" first` 
      };
    }
  }
  
  // Check for issues that need attention but don't block
  const missing = getMissingItems(stepId, completion);
  if (missing.length > 0) {
    return { 
      status: stepIndex === currentStepIndex ? "in_progress" : "needs_attention",
      missingCount: missing.length,
      reason: missing.join(", ")
    };
  }
  
  return { status: "ready" };
}

export function getBlockingIssues(stepId: OpsStepId, completion: StepCompletion): BlockingIssue[] {
  const issues: BlockingIssue[] = [];
  
  // No blocking issues in new simplified flow
  // All gating is done via step completion checks
  
  return issues;
}

export function checkStepComplete(stepId: OpsStepId, completion: StepCompletion): boolean {
  switch (stepId) {
    case "prep":
      return completion.prep.checklistComplete && completion.prep.photosComplete;
    case "checkin":
      // All check-in validations must pass
      return (
        completion.checkin.govIdVerified &&
        completion.checkin.licenseOnFile &&
        completion.checkin.nameMatches &&
        completion.checkin.licenseNotExpired &&
        completion.checkin.ageVerified
      );
    case "payment":
      return completion.payment.paymentComplete && completion.payment.depositCollected;
    case "agreement":
      return completion.agreement.agreementSigned;
    case "walkaround":
      // Staff-only - just inspection complete, no customer signature
      return completion.walkaround.inspectionComplete;
    case "handover":
      return completion.handover.activated;
    default:
      return false;
  }
}

export function getMissingItems(stepId: OpsStepId, completion: StepCompletion): string[] {
  const missing: string[] = [];
  
  switch (stepId) {
    case "prep":
      if (!completion.prep.checklistComplete) missing.push("Prep checklist");
      if (!completion.prep.photosComplete) missing.push("Pre-inspection photos");
      break;
    case "checkin":
      if (!completion.checkin.govIdVerified) missing.push("Government Photo ID");
      if (!completion.checkin.licenseOnFile) missing.push("Driver's License on file");
      if (!completion.checkin.nameMatches) missing.push("Name matches booking");
      if (!completion.checkin.licenseNotExpired) missing.push("License expiry date");
      if (!completion.checkin.ageVerified) missing.push("Age verification (21+)");
      break;
    case "payment":
      if (!completion.payment.paymentComplete) missing.push("Payment");
      if (!completion.payment.depositCollected) missing.push("Deposit (manual)");
      break;
    case "agreement":
      if (!completion.agreement.agreementSigned) missing.push("Agreement signed (manual)");
      break;
    case "walkaround":
      if (!completion.walkaround.inspectionComplete) missing.push("Staff inspection");
      break;
    case "handover":
      if (!completion.handover.activated) missing.push("Rental activation");
      break;
  }
  
  return missing;
}

export function getCurrentStepIndex(completion: StepCompletion): number {
  for (let i = 0; i < OPS_STEPS.length; i++) {
    if (!checkStepComplete(OPS_STEPS[i].id, completion)) {
      return i;
    }
  }
  return OPS_STEPS.length - 1;
}

// Standard action labels for consistency
export const ACTION_LABELS = {
  save: "Save Progress",
  upload: "Upload",
  verify: "Verify",
  collect: "Collect",
  view: "View",
  continue: "Continue to Next Step",
  activate: "Activate Rental",
  markSigned: "Mark as Signed",
  markComplete: "Mark Complete",
} as const;

// Status label standardization
export const STATUS_LABELS = {
  verified: "Verified",
  completed: "Completed",
  signed: "Signed",
  passed: "Passed",
  pending: "Pending",
  blocked: "Blocked",
  onFile: "On File",
  missing: "Missing",
} as const;
