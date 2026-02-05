/**
 * Dispatch Readiness Validation
 * 
 * Ensures delivery bookings cannot be dispatched without proper prerequisites:
 * - Payment hold authorized
 * - Vehicle unit (VIN) assigned
 * - Vehicle prep completed (condition photos taken)
 */

export interface DispatchReadinessCheck {
  isReady: boolean;
  requirements: {
    paymentHoldAuthorized: boolean;
    unitAssigned: boolean;
    prepPhotosComplete: boolean;
  };
  missingRequirements: string[];
}

export interface BookingForDispatchCheck {
  id: string;
  depositStatus?: string | null;
  assignedUnitId?: string | null;
  stripeDepositPiId?: string | null;
}

export interface PrepPhotoCount {
  bookingId: string;
  count: number;
}

/**
 * Minimum number of prep photos required before dispatch
 */
export const MINIMUM_PREP_PHOTOS = 4;

/**
 * Deposit statuses that indicate payment is authorized
 */
export const AUTHORIZED_DEPOSIT_STATUSES = [
  'authorized',
  'hold_created',
  'captured',
  'partially_captured',
];

/**
 * Check if a booking is ready for dispatch
 */
export function checkDispatchReadiness(
  booking: BookingForDispatchCheck,
  prepPhotoCount: number = 0
): DispatchReadinessCheck {
  const requirements = {
    paymentHoldAuthorized: 
      AUTHORIZED_DEPOSIT_STATUSES.includes(booking.depositStatus || '') ||
      !!booking.stripeDepositPiId,
    unitAssigned: !!booking.assignedUnitId,
    prepPhotosComplete: prepPhotoCount >= MINIMUM_PREP_PHOTOS,
  };

  const missingRequirements: string[] = [];
  
  if (!requirements.paymentHoldAuthorized) {
    missingRequirements.push("Payment hold must be authorized before dispatch");
  }
  
  if (!requirements.unitAssigned) {
    missingRequirements.push("Vehicle unit (VIN) must be assigned before dispatch");
  }
  
  if (!requirements.prepPhotosComplete) {
    missingRequirements.push(`At least ${MINIMUM_PREP_PHOTOS} pre-delivery photos required (${prepPhotoCount} taken)`);
  }

  return {
    isReady: missingRequirements.length === 0,
    requirements,
    missingRequirements,
  };
}

/**
 * Get human-readable dispatch blocker message
 */
export function getDispatchBlockerMessage(check: DispatchReadinessCheck): string {
  if (check.isReady) {
    return "Ready for dispatch";
  }
  
  return check.missingRequirements.join(". ");
}
