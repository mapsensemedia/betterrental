import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getDepositLifecycleState } from "@/lib/deposit-state";

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
  const { data: bookingDeposit, error: bookingError } = await supabase
    .from("bookings")
    .select("deposit_amount, deposit_status, wl_deposit_auth_status, wl_deposit_transaction_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error("Failed to load booking deposit state:", bookingError);
    return;
  }

  const depositState = getDepositLifecycleState({
    transactionId: bookingDeposit?.wl_deposit_transaction_id,
    depositStatus: bookingDeposit?.deposit_status,
    worldlineAuthStatus: bookingDeposit?.wl_deposit_auth_status,
  });

  if (depositState !== "authorized") {
    // No active hold to process
    return;
  }

  const depositAmount = Number(bookingDeposit?.deposit_amount) || 0;
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
      // No damages - release the active hold
      await autoReleaseDepositHold(bookingId, depositAmount, userId);
    } else if (totalDamageCost > 0) {
      // Has damages - create alert for manual review
      await createDepositReviewAlert(
        bookingId,
        depositAmount,
        totalDamageCost,
        "damage_review"
      );
    }
  } else if (newStatus === "cancelled") {
    // Cancelled booking with active hold - always requires manual review
    await createDepositReviewAlert(
      bookingId,
      depositAmount,
      0,
      "cancelled_with_deposit"
    );
  }
}

/**
 * Release an authorized deposit hold and record the action.
 */
async function autoReleaseDepositHold(
  bookingId: string,
  amount: number,
  userId: string | undefined
): Promise<void> {
  const { data, error } = await supabase.functions.invoke("wl-cancel-auth", {
    body: { bookingId },
  });

  if (error || data?.error) {
    console.error("Failed to release deposit hold:", error || data?.error);
    await createDepositReviewAlert(bookingId, amount, 0, "release_failed");
    return;
  }

  if (userId) {
    await supabase.from("audit_logs").insert({
      action: "deposit_auto_released",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: userId,
      new_data: {
        booking_id: bookingId,
        amount,
        reason: "auto_release_on_completion",
      },
    });
  }

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
  reason: "damage_review" | "cancelled_with_deposit" | "release_failed"
): Promise<void> {
  const alertTitle =
    reason === "cancelled_with_deposit"
      ? "Cancelled Booking: Deposit Requires Manual Review"
      : reason === "release_failed"
        ? "Completed Booking: Deposit Release Failed"
        : "Completed Booking: Deposit Requires Damage Review";

  const alertMessage =
    reason === "cancelled_with_deposit"
      ? `Booking was cancelled with $${depositAmount.toFixed(2)} deposit held. Manual review required to determine refund.`
      : reason === "release_failed"
        ? `Booking completed with a $${depositAmount.toFixed(2)} authorized deposit hold, but automatic release failed. Manual review required.`
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
