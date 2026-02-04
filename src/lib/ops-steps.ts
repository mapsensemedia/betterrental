// Operational steps definition for full-screen wizard
// UPDATED: Simplified workflow - removed locks, staff can freely navigate
// Photos moved to end as "handover photos"
// Delivery bookings split into pre-dispatch (Ops) and on-site (Delivery Portal) steps

export type OpsStepId = 
  | "checkin" 
  | "payment" 
  | "prep"
  | "agreement" 
  | "walkaround" 
  | "photos"
  | "handover"
  | "dispatch"; // For delivery bookings only

// Enhanced status types - simplified without locked state
export type OpsStepStatus = "ready" | "in_progress" | "complete" | "needs_attention";

export interface OpsStep {
  id: OpsStepId;
  number: number;
  title: string;
  description: string;
  icon: string;
  deliveryTitle?: string; // Alternative title for delivery bookings
  deliveryDescription?: string; // Alternative description for delivery bookings
}

// Standard pickup flow (6 steps) - No prep/checklist, photos at end
export const OPS_STEPS: OpsStep[] = [
  {
    id: "checkin",
    number: 1,
    title: "Customer Check-In",
    description: "Verify ID, license, contact details, and customer information",
    icon: "user-check",
  },
  {
    id: "payment",
    number: 2,
    title: "Payment & Deposit",
    description: "Payment auto-syncs if online; deposit is manual/offline",
    icon: "credit-card",
  },
  {
    id: "agreement",
    number: 3,
    title: "Rental Agreement",
    description: "Manual in-person agreement signing",
    icon: "file-text",
  },
  {
    id: "walkaround",
    number: 4,
    title: "Vehicle Walkaround",
    description: "Staff-only inspection checklist (no customer signature)",
    icon: "eye",
  },
  {
    id: "photos",
    number: 5,
    title: "Handover Photos",
    description: "Capture vehicle photos before handover",
    icon: "camera",
  },
  {
    id: "handover",
    number: 6,
    title: "Handover & Activation",
    description: "Complete handover, send SMS, move to Active Rentals",
    icon: "key",
  },
];

// DELIVERY PRE-DISPATCH STEPS (Ops Panel)
// These steps are done at the office before vehicle leaves
export const OPS_STEPS_DELIVERY_PRE: OpsStep[] = [
  {
    id: "checkin",
    number: 1,
    title: "Customer Verification",
    description: "Verify ID, license, and contact details remotely",
    icon: "user-check",
  },
  {
    id: "payment",
    number: 2,
    title: "Payment & Deposit",
    description: "Collect full payment before vehicle leaves depot",
    icon: "credit-card",
  },
  {
    id: "prep",
    number: 3,
    title: "Vehicle Assignment",
    description: "Assign specific VIN and prepare vehicle for dispatch",
    icon: "car",
  },
  {
    id: "photos",
    number: 4,
    title: "Pre-Delivery Photos",
    description: "Capture vehicle condition before dispatch",
    icon: "camera",
  },
  {
    id: "dispatch",
    number: 5,
    title: "Dispatch to Driver",
    description: "Assign driver and dispatch vehicle for delivery",
    icon: "truck",
  },
];

// DELIVERY ON-SITE STEPS (Delivery Portal)
// These steps are done by driver at customer location
export const DELIVERY_PORTAL_STEPS: OpsStep[] = [
  {
    id: "agreement",
    number: 1,
    title: "Rental Agreement",
    description: "Customer signs agreement at delivery location",
    icon: "file-text",
  },
  {
    id: "walkaround",
    number: 2,
    title: "Vehicle Walkaround",
    description: "Complete vehicle inspection with customer",
    icon: "eye",
  },
  {
    id: "photos",
    number: 3,
    title: "Handover Photos",
    description: "Capture final photos at delivery location",
    icon: "camera",
  },
  {
    id: "handover",
    number: 4,
    title: "Complete Delivery",
    description: "Hand over keys and activate rental",
    icon: "key",
  },
];

// Helper to get step with delivery-aware titles
export function getStepForDisplay(step: OpsStep, isDelivery: boolean): { title: string; description: string } {
  if (isDelivery && step.deliveryTitle) {
    return {
      title: step.deliveryTitle,
      description: step.deliveryDescription || step.description,
    };
  }
  return {
    title: step.title,
    description: step.description,
  };
}

export interface StepCompletion {
  checkin: {
    govIdVerified: boolean;
    licenseOnFile: boolean;
    nameMatches: boolean;
    licenseNotExpired: boolean;
    ageVerified: boolean;
    // Delivery-specific
    driverEnRoute?: boolean;
    driverArrived?: boolean;
  };
  payment: {
    paymentComplete: boolean;
    depositCollected: boolean;
  };
  prep?: {
    unitAssigned: boolean;
    vehiclePrepared: boolean;
  };
  agreement: {
    agreementSigned: boolean;
  };
  walkaround: {
    inspectionComplete: boolean;
  };
  photos: {
    photosComplete: boolean;
  };
  dispatch?: {
    driverAssigned: boolean;
    dispatched: boolean;
  };
  handover: {
    activated: boolean;
    smsSent: boolean;
  };
}

export interface BlockingIssue {
  type: "conflict" | "missing" | "rejected" | "overdue" | "driver_required";
  message: string;
  stepId: OpsStepId;
  canOverride: boolean;
}

// Get steps based on booking type
export function getOpsSteps(isDelivery: boolean): OpsStep[] {
  return isDelivery ? OPS_STEPS_DELIVERY_PRE : OPS_STEPS;
}

// SIMPLIFIED: No locks - staff can navigate freely
export function getStepStatus(
  stepId: OpsStepId,
  completion: StepCompletion,
  currentStepIndex: number,
  isDelivery: boolean = false
): { status: OpsStepStatus; reason?: string; missingCount?: number; isBlocked?: boolean } {
  const isComplete = checkStepComplete(stepId, completion, isDelivery);
  if (isComplete) {
    return { status: "complete" };
  }
  
  // Check for issues that need attention but don't block
  const missing = getMissingItems(stepId, completion, isDelivery);
  if (missing.length > 0) {
    return { 
      status: "needs_attention",
      missingCount: missing.length,
      reason: missing.join(", ")
    };
  }
  
  return { status: "ready" };
}

// No blocking issues for regular steps - staff has full access
export function getBlockingIssues(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): BlockingIssue[] {
  // Only block handover if critical items missing
  if (stepId === "handover") {
    const issues: BlockingIssue[] = [];
    if (!completion.payment.paymentComplete) {
      issues.push({
        type: "missing",
        message: "Payment must be collected before activation",
        stepId: "handover",
        canOverride: false,
      });
    }
    return issues;
  }
  
  // Block dispatch if driver not assigned
  if (stepId === "dispatch" && isDelivery) {
    const issues: BlockingIssue[] = [];
    if (!completion.dispatch?.driverAssigned) {
      issues.push({
        type: "driver_required",
        message: "Driver must be assigned before dispatch",
        stepId: "dispatch",
        canOverride: false,
      });
    }
    return issues;
  }
  
  return [];
}

export function checkStepComplete(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): boolean {
  switch (stepId) {
    case "checkin":
      // For delivery, check-in is based on driver arrival (for on-site steps)
      // For pre-dispatch, standard verification
      return (
        completion.checkin.govIdVerified &&
        completion.checkin.licenseOnFile &&
        completion.checkin.nameMatches &&
        completion.checkin.licenseNotExpired &&
        completion.checkin.ageVerified
      );
    case "payment":
      return completion.payment.paymentComplete && completion.payment.depositCollected;
    case "prep":
      return completion.prep?.unitAssigned && completion.prep?.vehiclePrepared || false;
    case "agreement":
      return completion.agreement.agreementSigned;
    case "walkaround":
      return completion.walkaround.inspectionComplete;
    case "photos":
      return completion.photos.photosComplete;
    case "dispatch":
      return completion.dispatch?.driverAssigned && completion.dispatch?.dispatched || false;
    case "handover":
      return completion.handover.activated;
    default:
      return false;
  }
}

export function getMissingItems(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): string[] {
  const missing: string[] = [];
  
  switch (stepId) {
    case "checkin":
      if (!completion.checkin.govIdVerified) missing.push("Government Photo ID");
      if (!completion.checkin.licenseOnFile) missing.push("Driver's License on file");
      if (!completion.checkin.nameMatches) missing.push("Name matches booking");
      if (!completion.checkin.licenseNotExpired) missing.push("License expiry date");
      if (!completion.checkin.ageVerified) missing.push("Age verification (21+)");
      break;
    case "payment":
      if (!completion.payment.paymentComplete) missing.push("Payment");
      if (!completion.payment.depositCollected) missing.push("Deposit");
      break;
    case "prep":
      if (!completion.prep?.unitAssigned) missing.push("Unit assignment");
      if (!completion.prep?.vehiclePrepared) missing.push("Vehicle preparation");
      break;
    case "agreement":
      if (!completion.agreement.agreementSigned) missing.push("Agreement signed");
      break;
    case "walkaround":
      if (!completion.walkaround.inspectionComplete) missing.push("Staff inspection");
      break;
    case "photos":
      if (!completion.photos.photosComplete) missing.push("Handover photos");
      break;
    case "dispatch":
      if (!completion.dispatch?.driverAssigned) missing.push("Driver assignment");
      if (!completion.dispatch?.dispatched) missing.push("Vehicle dispatched");
      break;
    case "handover":
      if (!completion.handover.activated) missing.push("Rental activation");
      break;
  }
  
  return missing;
}

export function getCurrentStepIndex(completion: StepCompletion, isDelivery: boolean = false): number {
  const steps = getOpsSteps(isDelivery);
  for (let i = 0; i < steps.length; i++) {
    if (!checkStepComplete(steps[i].id, completion, isDelivery)) {
      return i;
    }
  }
  return steps.length - 1;
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
  assignDriver: "Assign Driver",
  dispatch: "Dispatch Vehicle",
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
  enRoute: "En Route",
  arrived: "Arrived",
  dispatched: "Dispatched",
} as const;

// Delivery status mapping for ops display
export const DELIVERY_STATUS_MAP: Record<string, { label: string; color: string }> = {
  unassigned: { label: "Unassigned", color: "bg-muted text-muted-foreground" },
  assigned: { label: "Driver Assigned", color: "bg-blue-500/10 text-blue-600" },
  picked_up: { label: "Picked Up", color: "bg-amber-500/10 text-amber-600" },
  en_route: { label: "En Route", color: "bg-purple-500/10 text-purple-600" },
  delivered: { label: "Delivered", color: "bg-emerald-500/10 text-emerald-600" },
  issue: { label: "Issue", color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
};
