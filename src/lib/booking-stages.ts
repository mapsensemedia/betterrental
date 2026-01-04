/**
 * Booking Operational Stages
 * Defines the workflow backbone for rental operations
 */

export type BookingStage = 
  | "intake"        // Initial booking created
  | "prep"          // Vehicle preparation
  | "check_in"      // Customer arrival/verification
  | "payment"       // Payment/deposit collection
  | "agreement"     // Contract signing
  | "walkaround"    // Pre-rental inspection
  | "handover"      // Keys given, rental active
  | "active"        // Rental in progress
  | "monitoring"    // Tracking during rental
  | "return"        // Vehicle returned
  | "closeout"      // Final inspection & charges
  | "wrap_up";      // Completed, archived

export interface StageInfo {
  id: BookingStage;
  label: string;
  description: string;
  requiredFor: ("pending" | "confirmed" | "active" | "completed" | "cancelled")[];
}

export const BOOKING_STAGES: StageInfo[] = [
  {
    id: "intake",
    label: "Intake",
    description: "Booking received and pending confirmation",
    requiredFor: ["pending", "confirmed", "active", "completed"],
  },
  {
    id: "prep",
    label: "Preparation",
    description: "Vehicle cleaning and preparation",
    requiredFor: ["confirmed", "active", "completed"],
  },
  {
    id: "check_in",
    label: "Check-in",
    description: "Customer verification and identity check",
    requiredFor: ["confirmed", "active", "completed"],
  },
  {
    id: "payment",
    label: "Payment",
    description: "Deposit and payment collection",
    requiredFor: ["confirmed", "active", "completed"],
  },
  {
    id: "agreement",
    label: "Agreement",
    description: "Rental agreement signing",
    requiredFor: ["active", "completed"],
  },
  {
    id: "walkaround",
    label: "Walkaround",
    description: "Pre-rental vehicle inspection",
    requiredFor: ["active", "completed"],
  },
  {
    id: "handover",
    label: "Handover",
    description: "Keys handed over, rental begins",
    requiredFor: ["active", "completed"],
  },
  {
    id: "active",
    label: "Active",
    description: "Rental in progress",
    requiredFor: ["active", "completed"],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Tracking rental status",
    requiredFor: ["active", "completed"],
  },
  {
    id: "return",
    label: "Return",
    description: "Vehicle returned by customer",
    requiredFor: ["completed"],
  },
  {
    id: "closeout",
    label: "Closeout",
    description: "Final inspection and charges",
    requiredFor: ["completed"],
  },
  {
    id: "wrap_up",
    label: "Wrap-up",
    description: "Booking archived and completed",
    requiredFor: ["completed"],
  },
];

/**
 * Get current stage based on booking status and completion data
 */
export function getCurrentStage(
  status: string,
  hasVerification: boolean,
  hasPayment: boolean,
  hasPickupPhotos: boolean,
  hasReturnPhotos: boolean
): BookingStage {
  if (status === "cancelled") return "intake";
  if (status === "completed") return "wrap_up";
  
  if (status === "active") {
    if (hasReturnPhotos) return "closeout";
    return "active";
  }
  
  if (status === "confirmed") {
    if (hasPickupPhotos) return "handover";
    if (hasPayment && hasVerification) return "walkaround";
    if (hasPayment) return "agreement";
    if (hasVerification) return "payment";
    return "check_in";
  }
  
  return "intake";
}

/**
 * Get stage progress percentage
 */
export function getStageProgress(currentStage: BookingStage): number {
  const index = BOOKING_STAGES.findIndex(s => s.id === currentStage);
  if (index === -1) return 0;
  return Math.round(((index + 1) / BOOKING_STAGES.length) * 100);
}
