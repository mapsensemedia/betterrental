// Operational steps definition for full-screen wizard
// UPDATED: Simplified workflow with delivery-specific support

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
  deliveryTitle?: string; // Alternative title for delivery bookings
  deliveryDescription?: string; // Alternative description for delivery bookings
}

// Standard pickup flow (6 steps)
export const OPS_STEPS: OpsStep[] = [
  {
    id: "prep",
    number: 1,
    title: "Pre-Arrival Preparation",
    description: "Complete prep checklist and capture pre-inspection photos",
    icon: "wrench",
    deliveryTitle: "Dispatch Preparation",
    deliveryDescription: "Assign driver, complete prep checklist, and capture photos",
  },
  {
    id: "checkin",
    number: 2,
    title: "Customer Check-In",
    description: "Verify Gov ID, driver's license on file, age, and expiry",
    icon: "user-check",
    deliveryTitle: "En Route / Arrival",
    deliveryDescription: "Track driver en route, verify customer at delivery address",
  },
  {
    id: "payment",
    number: 3,
    title: "Payment & Deposit",
    description: "Payment auto-syncs if online; deposit is manual/offline",
    icon: "credit-card",
    deliveryTitle: "Payment & Deposit",
    deliveryDescription: "Verify payment; collect deposit on delivery if needed",
  },
  {
    id: "agreement",
    number: 4,
    title: "Rental Agreement",
    description: "Manual in-person agreement signing",
    icon: "file-text",
    deliveryTitle: "On-Site Agreement",
    deliveryDescription: "Agreement signing at delivery location",
  },
  {
    id: "walkaround",
    number: 5,
    title: "Vehicle Walkaround",
    description: "Staff-only inspection checklist (no customer signature)",
    icon: "eye",
    deliveryTitle: "On-Site Walkaround",
    deliveryDescription: "Driver performs inspection at delivery address",
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
  prep: {
    checklistComplete: boolean;
    photosComplete: boolean;
    driverAssigned?: boolean; // Required for delivery bookings only
  };
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

export function getStepStatus(
  stepId: OpsStepId,
  completion: StepCompletion,
  currentStepIndex: number,
  isDelivery: boolean = false
): { status: OpsStepStatus; reason?: string; missingCount?: number; isBlocked?: boolean } {
  const stepIndex = OPS_STEPS.findIndex(s => s.id === stepId);
  
  // Check for blocking issues first
  const blockingIssues = getBlockingIssues(stepId, completion, isDelivery);
  if (blockingIssues.length > 0) {
    return {
      status: "blocked",
      reason: blockingIssues[0].message,
      isBlocked: true,
    };
  }
  
  // Check if step is complete
  const isComplete = checkStepComplete(stepId, completion, isDelivery);
  if (isComplete) {
    return { status: "complete" };
  }
  
  // If previous step is not complete, this step is locked
  if (stepIndex > 0) {
    const prevStep = OPS_STEPS[stepIndex - 1];
    if (!checkStepComplete(prevStep.id, completion, isDelivery)) {
      return { 
        status: "locked", 
        reason: `Complete "${isDelivery && prevStep.deliveryTitle ? prevStep.deliveryTitle : prevStep.title}" first` 
      };
    }
  }
  
  // Check for issues that need attention but don't block
  const missing = getMissingItems(stepId, completion, isDelivery);
  if (missing.length > 0) {
    return { 
      status: stepIndex === currentStepIndex ? "in_progress" : "needs_attention",
      missingCount: missing.length,
      reason: missing.join(", ")
    };
  }
  
  return { status: "ready" };
}

export function getBlockingIssues(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): BlockingIssue[] {
  const issues: BlockingIssue[] = [];
  
  // For delivery bookings, driver assignment is required before completing prep
  if (isDelivery && stepId === "prep" && !completion.prep.driverAssigned) {
    issues.push({
      type: "driver_required",
      message: "Assign a driver before dispatching the vehicle",
      stepId: "prep",
      canOverride: false,
    });
  }
  
  return issues;
}

export function checkStepComplete(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): boolean {
  switch (stepId) {
    case "prep":
      const prepBaseComplete = completion.prep.checklistComplete && completion.prep.photosComplete;
      // For delivery, driver must also be assigned
      if (isDelivery) {
        return prepBaseComplete && (completion.prep.driverAssigned ?? false);
      }
      return prepBaseComplete;
    case "checkin":
      // For delivery, check-in is based on driver arrival, not customer walk-in
      if (isDelivery) {
        // If using delivery en-route tracking
        if (completion.checkin.driverArrived !== undefined) {
          return completion.checkin.driverArrived;
        }
      }
      // Standard check-in validations
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
    case "handover":
      return completion.handover.activated;
    default:
      return false;
  }
}

export function getMissingItems(stepId: OpsStepId, completion: StepCompletion, isDelivery: boolean = false): string[] {
  const missing: string[] = [];
  
  switch (stepId) {
    case "prep":
      if (!completion.prep.checklistComplete) missing.push("Prep checklist");
      if (!completion.prep.photosComplete) missing.push("Pre-inspection photos");
      if (isDelivery && !completion.prep.driverAssigned) missing.push("Driver assignment");
      break;
    case "checkin":
      if (isDelivery) {
        // Delivery-specific items
        if (completion.checkin.driverEnRoute !== undefined && !completion.checkin.driverEnRoute) {
          missing.push("Driver en route");
        }
        if (completion.checkin.driverArrived !== undefined && !completion.checkin.driverArrived) {
          missing.push("Driver arrived");
        }
      }
      // Standard check-in items (also apply to delivery for on-site verification)
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
