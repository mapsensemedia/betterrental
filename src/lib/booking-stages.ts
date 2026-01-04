/**
 * Booking Operational Stages
 * Defines the workflow backbone for rental operations
 */

export type BookingStage = 
  | "intake"        // Initial booking created
  | "license"       // Customer uploads driver's license
  | "verification"  // License verification by ops
  | "prep"          // Vehicle preparation
  | "vehicle_ready" // Vehicle ready for handover
  | "check_in"      // Customer arrival
  | "payment"       // Payment/deposit collection
  | "agreement"     // Contract signing
  | "walkaround"    // Pre-rental inspection (ops uploads photos)
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
    id: "license",
    label: "License",
    description: "Customer uploads driver's license (front & back)",
    requiredFor: ["pending", "confirmed", "active", "completed"],
  },
  {
    id: "verification",
    label: "Verification",
    description: "Ops team verifies driver's license",
    requiredFor: ["confirmed", "active", "completed"],
  },
  {
    id: "prep",
    label: "Preparation",
    description: "Vehicle cleaning, prep checklist, and pre-inspection photos",
    requiredFor: ["confirmed", "active", "completed"],
  },
  {
    id: "vehicle_ready",
    label: "Vehicle Ready",
    description: "Vehicle fully prepared for customer handover",
    requiredFor: ["confirmed", "active", "completed"],
  },
  {
    id: "check_in",
    label: "Check-in",
    description: "Customer arrival at location",
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
    description: "Joint vehicle inspection with customer",
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
  hasLicense: boolean,
  hasVerification: boolean,
  hasVehicleReady: boolean,
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
    if (hasPayment && hasVerification && hasVehicleReady) return "walkaround";
    if (hasPayment && hasVerification) return "agreement";
    if (hasVerification && hasVehicleReady) return "payment";
    if (hasVerification) return "vehicle_ready";
    if (hasLicense) return "verification";
    return "prep";
  }
  
  // Pending status
  if (hasLicense) return "license";
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
