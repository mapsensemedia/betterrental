// Operational steps definition for full-screen wizard
// UPDATED: Simplified workflow - removed locks, staff can freely navigate
// Photos moved to end as "handover photos"

export type OpsStepId = 
  | "checkin" 
  | "payment" 
  | "agreement" 
  | "walkaround" 
  | "photos"
  | "handover";

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

// Updated pickup flow (6 steps) - No prep/checklist, photos at end
export const OPS_STEPS: OpsStep[] = [
  {
    id: "checkin",
    number: 1,
    title: "Customer Check-In",
    description: "Verify ID, license, contact details, and customer information",
    icon: "user-check",
    deliveryTitle: "Customer Verification",
    deliveryDescription: "Verify customer at delivery address",
  },
  {
    id: "payment",
    number: 2,
    title: "Payment & Deposit",
    description: "Payment auto-syncs if online; deposit is manual/offline",
    icon: "credit-card",
    deliveryTitle: "Payment & Deposit",
    deliveryDescription: "Verify payment; collect deposit on delivery if needed",
  },
  {
    id: "agreement",
    number: 3,
    title: "Rental Agreement",
    description: "Manual in-person agreement signing",
    icon: "file-text",
    deliveryTitle: "On-Site Agreement",
    deliveryDescription: "Agreement signing at delivery location",
  },
  {
    id: "walkaround",
    number: 4,
    title: "Vehicle Walkaround",
    description: "Staff-only inspection checklist (no customer signature)",
    icon: "eye",
    deliveryTitle: "On-Site Walkaround",
    deliveryDescription: "Driver performs inspection at delivery address",
  },
  {
    id: "photos",
    number: 5,
    title: "Handover Photos",
    description: "Capture vehicle photos before handover",
    icon: "camera",
    deliveryTitle: "Delivery Photos",
    deliveryDescription: "Capture vehicle photos at delivery location",
  },
  {
    id: "handover",
    number: 6,
    title: "Handover & Activation",
    description: "Complete handover, send SMS, move to Active Rentals",
    icon: "key",
    deliveryTitle: "Handover & Activation",
    deliveryDescription: "Driver hands keys at delivery address, activate rental",
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
  agreement: {
    agreementSigned: boolean;
  };
  walkaround: {
    inspectionComplete: boolean;
  };
  photos: {
    photosComplete: boolean;
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
  return [];
}

export function checkStepComplete(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): boolean {
  switch (stepId) {
    case "checkin":
      // For delivery, check-in is based on driver arrival
      if (isDelivery) {
        if (completion.checkin.driverArrived !== undefined) {
          return completion.checkin.driverArrived;
        }
      }
      // Standard check-in - simplified
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
      return completion.walkaround.inspectionComplete;
    case "photos":
      return completion.photos.photosComplete;
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
      if (isDelivery) {
        if (completion.checkin.driverEnRoute !== undefined && !completion.checkin.driverEnRoute) {
          missing.push("Driver en route");
        }
        if (completion.checkin.driverArrived !== undefined && !completion.checkin.driverArrived) {
          missing.push("Driver arrived");
        }
      }
      if (!completion.checkin.govIdVerified) missing.push("Government Photo ID");
      if (!completion.checkin.licenseOnFile) missing.push("Driver's License on file");
      if (!completion.checkin.nameMatches) missing.push("Name matches booking");
      if (!completion.checkin.licenseNotExpired) missing.push("License expiry date");
      if (!completion.checkin.ageVerified) missing.push("Age verification (21+)");
      break;
    case "payment":
      if (!completion.payment.paymentComplete) missing.push("Payment");
      if (!completion.payment.depositCollected) missing.push(isDelivery ? "Deposit (collect on delivery)" : "Deposit (manual)");
      break;
    case "agreement":
      if (!completion.agreement.agreementSigned) missing.push(isDelivery ? "Agreement signed (on-site)" : "Agreement signed (manual)");
      break;
    case "walkaround":
      if (!completion.walkaround.inspectionComplete) missing.push(isDelivery ? "On-site inspection" : "Staff inspection");
      break;
    case "photos":
      if (!completion.photos.photosComplete) missing.push("Handover photos");
      break;
    case "handover":
      if (!completion.handover.activated) missing.push("Rental activation");
      break;
  }
  
  return missing;
}

export function getCurrentStepIndex(completion: StepCompletion, isDelivery: boolean = false): number {
  for (let i = 0; i < OPS_STEPS.length; i++) {
    if (!checkStepComplete(OPS_STEPS[i].id, completion, isDelivery)) {
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
