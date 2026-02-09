import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

/**
 * Handles deposit actions when booking status changes
 * - Completed: Auto-release deposit if no damages
 * - Cancelled: Create admin alert for manual review
 */
export async function handleDepositOnStatusChange(
  bookingId: string,
  newStatus: BookingStatus
): Promise<void> {
  // Get deposit payment info
  const { data: depositPayment } = await supabase
    .from("payments")
    .select("id, amount, status")
    .eq("booking_id", bookingId)
    .eq("payment_type", "deposit")
    .eq("status", "completed")
    .maybeSingle();

  if (!depositPayment) {
    // No deposit held, nothing to do
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  if (newStatus === "completed") {
    // Check for any open damage reports
    const { data: damages } = await supabase
      .from("damage_reports")
      .select("id, status, estimated_cost")
      .eq("booking_id", bookingId)
      .neq("status", "closed");

    const hasOpenDamages = damages && damages.length > 0;
    const totalDamageCost = damages?.reduce(
      (sum, d) => sum + (d.estimated_cost || 0),
      0
    ) || 0;

    if (!hasOpenDamages) {
      // No damages - auto-release full deposit
      await autoReleaseDeposit(bookingId, depositPayment.id, depositPayment.amount, userId);
    } else if (totalDamageCost > 0) {
      // Has damages - create alert for manual review
      await createDepositReviewAlert(
        bookingId,
        depositPayment.amount,
        totalDamageCost,
        "damage_review"
      );
    }
  } else if (newStatus === "cancelled") {
    // Cancelled booking with deposit - always requires manual review
    await createDepositReviewAlert(
      bookingId,
      depositPayment.amount,
      0,
      "cancelled_with_deposit"
    );
  }
}

/**
 * Auto-release deposit and record in ledger
 */
async function autoReleaseDeposit(
  bookingId: string,
  paymentId: string,
  amount: number,
  userId: string | undefined
): Promise<void> {
  // Mark payment as refunded
  const { error: updateError } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("id", paymentId);

  if (updateError) {
    console.error("Failed to update deposit payment status:", updateError);
    return;
  }

  // Add ledger entry
  if (userId) {
    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      payment_id: paymentId,
      action: "release",
      amount,
      reason: "Auto-released on rental completion (no damages)",
      created_by: userId,
    });

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "deposit_auto_released",
      entity_type: "payment",
      entity_id: paymentId,
      user_id: userId,
      new_data: {
        booking_id: bookingId,
        amount,
        reason: "auto_release_on_completion",
      },
    });
  }

  // Send notification to customer via general booking notification
  try {
    await supabase.functions.invoke("send-booking-notification", {
      body: {
        bookingId,
        stage: "deposit_released",
      },
    });
  } catch (e) {
    console.error("Failed to send deposit notification:", e);
  }
}

/**
 * Create admin alert for deposit review
 */
async function createDepositReviewAlert(
  bookingId: string,
  depositAmount: number,
  damageCost: number,
  reason: "damage_review" | "cancelled_with_deposit"
): Promise<void> {
  const alertTitle =
    reason === "cancelled_with_deposit"
      ? "Cancelled Booking: Deposit Requires Manual Review"
      : "Completed Booking: Deposit Requires Damage Review";

  const alertMessage =
    reason === "cancelled_with_deposit"
      ? `Booking was cancelled with $${depositAmount.toFixed(2)} deposit held. Manual review required to determine refund.`
      : `Booking completed with $${damageCost.toFixed(2)} in damage costs. Deposit of $${depositAmount.toFixed(2)} requires review before release.`;

  // Check if alert already exists
  const { data: existingAlert } = await supabase
    .from("admin_alerts")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("alert_type", "payment_pending")
    .eq("status", "pending")
    .maybeSingle();

  if (existingAlert) {
    // Update existing alert
    await supabase
      .from("admin_alerts")
      .update({
        title: alertTitle,
        message: alertMessage,
      })
      .eq("id", existingAlert.id);
  } else {
    // Create new alert
    await supabase.from("admin_alerts").insert({
      booking_id: bookingId,
      alert_type: "payment_pending",
      title: alertTitle,
      message: alertMessage,
      status: "pending",
    });
  }
}
