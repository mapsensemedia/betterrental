// Return operational steps definition for full-screen return wizard

export type ReturnStepId = 
  | "intake"
  | "evidence"
  | "flags"
  | "fees"
  | "closeout"
  | "deposit";

export interface ReturnStep {
  id: ReturnStepId;
  number: number;
  title: string;
  description: string;
  icon: string;
}

export const RETURN_STEPS: ReturnStep[] = [
  {
    id: "intake",
    number: 1,
    title: "Return Intake",
    description: "Record return time, odometer, and fuel level",
    icon: "clipboard-check",
  },
  {
    id: "evidence",
    number: 2,
    title: "Evidence Capture",
    description: "Capture return condition photos",
    icon: "camera",
  },
  {
    id: "flags",
    number: 3,
    title: "Flags & Issues",
    description: "Review any flagged issues or late returns",
    icon: "flag",
  },
  {
    id: "fees",
    number: 4,
    title: "Fees & Damages",
    description: "Add additional fees or damage charges",
    icon: "dollar-sign",
  },
  {
    id: "closeout",
    number: 5,
    title: "Closeout",
    description: "Complete the return and update booking status",
    icon: "check-circle",
  },
  {
    id: "deposit",
    number: 6,
    title: "Deposit Release",
    description: "Release or withhold security deposit",
    icon: "wallet",
  },
];

export interface ReturnCompletion {
  intake: {
    timeRecorded: boolean;
    odometerRecorded: boolean;
    fuelRecorded: boolean;
  };
  evidence: {
    photosComplete: boolean;
  };
  flags: {
    reviewed: boolean;
  };
  fees: {
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

export function checkReturnStepComplete(stepId: ReturnStepId, completion: ReturnCompletion): boolean {
  switch (stepId) {
    case "intake":
      return completion.intake.timeRecorded || completion.intake.odometerRecorded || completion.intake.fuelRecorded;
    case "evidence":
      return completion.evidence.photosComplete;
    case "flags":
      return completion.flags.reviewed;
    case "fees":
      return completion.fees.reviewed;
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
    case "flags":
      if (!completion.flags.reviewed) missing.push("Issue review");
      break;
    case "fees":
      if (!completion.fees.reviewed) missing.push("Fees review");
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

export function getCurrentReturnStepIndex(completion: ReturnCompletion): number {
  for (let i = 0; i < RETURN_STEPS.length; i++) {
    if (!checkReturnStepComplete(RETURN_STEPS[i].id, completion)) {
      return i;
    }
  }
  return RETURN_STEPS.length - 1;
}
