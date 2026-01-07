// Operational steps definition for full-screen wizard

export type OpsStepId = 
  | "intake" 
  | "prep" 
  | "checkin" 
  | "payment" 
  | "agreement" 
  | "walkaround" 
  | "handover";

export type OpsStepStatus = "locked" | "ready" | "in_progress" | "complete" | "blocked";

export interface OpsStep {
  id: OpsStepId;
  number: number;
  title: string;
  description: string;
  icon: string;
}

export const OPS_STEPS: OpsStep[] = [
  {
    id: "intake",
    number: 1,
    title: "Booking Intake",
    description: "Verify customer ID, license, and assign vehicle",
    icon: "clipboard-check",
  },
  {
    id: "prep",
    number: 2,
    title: "Pre-Arrival Preparation",
    description: "Complete vehicle prep checklist and capture photos",
    icon: "wrench",
  },
  {
    id: "checkin",
    number: 3,
    title: "Customer Check-In",
    description: "Verify customer identity and confirm arrival",
    icon: "user-check",
  },
  {
    id: "payment",
    number: 4,
    title: "Payment & Deposit",
    description: "Collect payment and security deposit",
    icon: "credit-card",
  },
  {
    id: "agreement",
    number: 5,
    title: "Rental Agreement",
    description: "Generate and obtain customer signature",
    icon: "file-text",
  },
  {
    id: "walkaround",
    number: 6,
    title: "Vehicle Walkaround",
    description: "Joint inspection with customer acknowledgement",
    icon: "eye",
  },
  {
    id: "handover",
    number: 7,
    title: "Handover & Activation",
    description: "Complete key handoff and activate rental",
    icon: "key",
  },
];

export interface StepCompletion {
  intake: {
    vehicleAssigned: boolean;
    licenseUploaded: boolean;
    licenseApproved: boolean;
  };
  prep: {
    checklistComplete: boolean;
    photosComplete: boolean;
  };
  checkin: {
    identityVerified: boolean;
    timingConfirmed: boolean;
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
    customerAcknowledged: boolean;
  };
  handover: {
    activated: boolean;
  };
}

export function getStepStatus(
  stepId: OpsStepId,
  completion: StepCompletion,
  currentStepIndex: number
): { status: OpsStepStatus; reason?: string; missingCount?: number } {
  const stepIndex = OPS_STEPS.findIndex(s => s.id === stepId);
  
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
  
  // Step is ready or in progress
  const missing = getMissingItems(stepId, completion);
  if (missing.length > 0) {
    return { 
      status: stepIndex === currentStepIndex ? "in_progress" : "ready",
      missingCount: missing.length,
      reason: missing.join(", ")
    };
  }
  
  return { status: "ready" };
}

export function checkStepComplete(stepId: OpsStepId, completion: StepCompletion): boolean {
  switch (stepId) {
    case "intake":
      return completion.intake.vehicleAssigned && completion.intake.licenseApproved;
    case "prep":
      return completion.prep.checklistComplete && completion.prep.photosComplete;
    case "checkin":
      return completion.checkin.identityVerified;
    case "payment":
      return completion.payment.paymentComplete && completion.payment.depositCollected;
    case "agreement":
      return completion.agreement.agreementSigned;
    case "walkaround":
      // Only inspection is required - customer acknowledgement is optional (admin can override)
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
    case "intake":
      if (!completion.intake.vehicleAssigned) missing.push("Vehicle assignment");
      if (!completion.intake.licenseUploaded) missing.push("Driver's license upload");
      if (completion.intake.licenseUploaded && !completion.intake.licenseApproved) missing.push("License approval");
      break;
    case "prep":
      if (!completion.prep.checklistComplete) missing.push("Prep checklist");
      if (!completion.prep.photosComplete) missing.push("Pre-inspection photos");
      break;
    case "checkin":
      if (!completion.checkin.identityVerified) missing.push("Identity verification");
      break;
    case "payment":
      if (!completion.payment.paymentComplete) missing.push("Payment");
      if (!completion.payment.depositCollected) missing.push("Deposit");
      break;
    case "agreement":
      if (!completion.agreement.agreementSigned) missing.push("Customer signature");
      break;
    case "walkaround":
      if (!completion.walkaround.inspectionComplete) missing.push("Inspection");
      // Customer acknowledgement is optional - admin can override
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
