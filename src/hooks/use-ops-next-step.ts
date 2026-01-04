import { useMemo } from "react";
import type { NextStep } from "@/components/admin/ops/NextStepCard";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface StepDeps {
  status: BookingStatus;
  // Vehicle
  vehicleAssigned: boolean;
  // Prep
  prepComplete: boolean;
  prepCount: { done: number; total: number };
  // Photos
  photosComplete: boolean;
  photosCount: { done: number; total: number };
  // Check-in
  checkedIn: boolean;
  // Payment
  paymentComplete: boolean;
  depositCollected: boolean;
  // Agreement
  agreementSigned: boolean;
  // Walkaround
  walkaroundComplete: boolean;
  walkaroundAcknowledged: boolean;
  // Callbacks
  onActivate: () => void;
  scrollTo: (section: string) => void;
}

export function useOpsNextStep(deps: StepDeps): { step: NextStep | null; isComplete: boolean } {
  return useMemo(() => {
    const {
      status,
      vehicleAssigned,
      prepComplete,
      prepCount,
      photosComplete,
      photosCount,
      checkedIn,
      paymentComplete,
      depositCollected,
      agreementSigned,
      walkaroundComplete,
      walkaroundAcknowledged,
      onActivate,
      scrollTo,
    } = deps;

    // Already active or beyond
    if (status === "active" || status === "completed" || status === "cancelled") {
      return { step: null, isComplete: status === "active" || status === "completed" };
    }

    // Pending: need to confirm booking
    if (status === "pending") {
      return {
        step: {
          id: "confirm",
          title: "Confirm Booking",
          description: "Review booking details and confirm to proceed with preparation",
          action: "Confirm",
          variant: "default",
          onAction: () => scrollTo("status"),
        },
        isComplete: false,
      };
    }

    // Confirmed: work through steps
    if (status === "confirmed") {
      // 1. Vehicle assignment
      if (!vehicleAssigned) {
        return {
          step: {
            id: "vehicle",
            title: "Assign Vehicle",
            description: "Select and assign a vehicle to this booking",
            action: "Assign",
            variant: "warning",
            onAction: () => scrollTo("vehicle"),
          },
          isComplete: false,
        };
      }

      // 2. Vehicle prep
      if (!prepComplete) {
        return {
          step: {
            id: "prep",
            title: "Complete Vehicle Prep",
            description: `Checklist: ${prepCount.done}/${prepCount.total} items complete`,
            action: "View",
            variant: "default",
            missingCount: prepCount.total - prepCount.done,
            onAction: () => scrollTo("prep"),
          },
          isComplete: false,
        };
      }

      // 3. Pre-inspection photos
      if (!photosComplete) {
        return {
          step: {
            id: "photos",
            title: "Upload Pre-Inspection Photos",
            description: `Photos: ${photosCount.done}/${photosCount.total} captured`,
            action: "Upload",
            variant: "default",
            missingCount: photosCount.total - photosCount.done,
            onAction: () => scrollTo("photos"),
          },
          isComplete: false,
        };
      }

      // 4. Customer check-in
      if (!checkedIn) {
        return {
          step: {
            id: "checkin",
            title: "Complete Check-In",
            description: "Verify customer identity, license, and age",
            action: "Check-In",
            variant: "default",
            onAction: () => scrollTo("checkin"),
          },
          isComplete: false,
        };
      }

      // 5. Payment & deposit
      if (!paymentComplete || !depositCollected) {
        const missing = [];
        if (!paymentComplete) missing.push("payment");
        if (!depositCollected) missing.push("deposit");
        return {
          step: {
            id: "payment",
            title: "Collect Payment & Deposit",
            description: `Missing: ${missing.join(", ")}`,
            action: "Collect",
            variant: "warning",
            onAction: () => scrollTo("payment"),
          },
          isComplete: false,
        };
      }

      // 6. Agreement
      if (!agreementSigned) {
        return {
          step: {
            id: "agreement",
            title: "Get Agreement Signed",
            description: "Customer must review and sign rental agreement",
            action: "View",
            variant: "default",
            onAction: () => scrollTo("agreement"),
          },
          isComplete: false,
        };
      }

      // 7. Walkaround
      if (!walkaroundComplete || !walkaroundAcknowledged) {
        return {
          step: {
            id: "walkaround",
            title: "Complete Walkaround Inspection",
            description: "Joint inspection with customer acknowledgement",
            action: "Inspect",
            variant: "default",
            onAction: () => scrollTo("walkaround"),
          },
          isComplete: false,
        };
      }

      // All done - ready to activate
      return {
        step: {
          id: "activate",
          title: "Activate Rental",
          description: "All pre-handover steps complete. Ready to hand over keys.",
          action: "Activate",
          variant: "success",
          onAction: onActivate,
        },
        isComplete: false,
      };
    }

    return { step: null, isComplete: false };
  }, [deps]);
}
