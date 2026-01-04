import { useMemo } from "react";

export interface IntakeItem {
  id: string;
  label: string;
  description: string;
  status: "complete" | "incomplete" | "pending";
  required: boolean;
}

export interface IntakeStatus {
  items: IntakeItem[];
  isComplete: boolean;
  completedCount: number;
  totalRequired: number;
  missingRequired: IntakeItem[];
}

interface BookingData {
  status: string;
  vehicle_id?: string;
  vehicles?: {
    id: string;
    make: string;
    model: string;
    is_available?: boolean;
  } | null;
  profiles?: {
    is_verified?: boolean;
  } | null;
  verifications?: Array<{ status: string }>;
  payments?: Array<{ status: string; amount: number }>;
  total_amount?: number;
  deposit_amount?: number;
}

/**
 * Calculate intake checklist status for a booking
 */
export function useIntakeStatus(booking: BookingData | null | undefined): IntakeStatus {
  return useMemo(() => {
    if (!booking) {
      return {
        items: [],
        isComplete: false,
        completedCount: 0,
        totalRequired: 0,
        missingRequired: [],
      };
    }

    const items: IntakeItem[] = [];

    // 1. Vehicle Assigned
    const hasVehicle = !!booking.vehicle_id && !!booking.vehicles;
    items.push({
      id: "vehicle_assigned",
      label: "Vehicle Assigned",
      description: hasVehicle 
        ? `${booking.vehicles?.make} ${booking.vehicles?.model}` 
        : "No vehicle assigned to booking",
      status: hasVehicle ? "complete" : "incomplete",
      required: true,
    });

    // 2. ID Verification
    const hasVerification = booking.verifications && booking.verifications.length > 0;
    const verificationApproved = booking.verifications?.some(v => v.status === "verified");
    const verificationPending = booking.verifications?.some(v => v.status === "pending");
    
    items.push({
      id: "id_verification",
      label: "ID Verification",
      description: verificationApproved 
        ? "Customer ID verified" 
        : verificationPending 
          ? "Verification pending review"
          : "Customer has not submitted ID",
      status: verificationApproved ? "complete" : verificationPending ? "pending" : "incomplete",
      required: true,
    });

    // 3. Payment Method / Initial Payment
    const payments = booking.payments || [];
    const completedPayments = payments.filter(p => p.status === "completed");
    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(booking.total_amount) || 0;
    const hasPayment = totalPaid > 0;
    const fullyPaid = totalPaid >= totalAmount;

    items.push({
      id: "payment_status",
      label: "Payment Status",
      description: fullyPaid 
        ? `Fully paid ($${totalPaid.toFixed(2)})` 
        : hasPayment 
          ? `Partial payment ($${totalPaid.toFixed(2)} of $${totalAmount.toFixed(2)})`
          : "No payment received",
      status: fullyPaid ? "complete" : hasPayment ? "pending" : "incomplete",
      required: true,
    });

    // 4. Deposit Policy
    const depositRequired = Number(booking.deposit_amount) || 0;
    const depositPaid = depositRequired > 0 ? totalPaid >= depositRequired : true;
    
    items.push({
      id: "deposit_policy",
      label: "Deposit Collected",
      description: depositRequired > 0 
        ? depositPaid 
          ? `Deposit of $${depositRequired.toFixed(2)} collected`
          : `Deposit of $${depositRequired.toFixed(2)} required`
        : "No deposit required",
      status: depositPaid ? "complete" : "incomplete",
      required: depositRequired > 0,
    });

    // Calculate totals
    const requiredItems = items.filter(i => i.required);
    const completedRequired = requiredItems.filter(i => i.status === "complete");
    const missingRequired = requiredItems.filter(i => i.status !== "complete");

    return {
      items,
      isComplete: missingRequired.length === 0,
      completedCount: completedRequired.length,
      totalRequired: requiredItems.length,
      missingRequired,
    };
  }, [booking]);
}

/**
 * Get alert messages for missing intake items
 */
export function getIntakeAlerts(intakeStatus: IntakeStatus, bookingCode: string): Array<{
  alertType: "verification_pending" | "payment_pending";
  title: string;
  message: string;
}> {
  const alerts: Array<{
    alertType: "verification_pending" | "payment_pending";
    title: string;
    message: string;
  }> = [];

  intakeStatus.missingRequired.forEach(item => {
    if (item.id === "id_verification" && item.status !== "complete") {
      alerts.push({
        alertType: "verification_pending",
        title: `Verification required for ${bookingCode}`,
        message: item.description,
      });
    }
    if (item.id === "payment_status" && item.status === "incomplete") {
      alerts.push({
        alertType: "payment_pending",
        title: `Payment pending for ${bookingCode}`,
        message: item.description,
      });
    }
  });

  return alerts;
}
