/**
 * Booking Domain - Mutation Functions
 * All mutations write to audit_logs with panel_source
 */

import { supabase } from "@/integrations/supabase/client";
import type { BookingStatus, UpdateBookingStatusInput, VoidBookingInput, AssignVehicleInput } from "./types";
import { handleDepositOnStatusChange } from "@/lib/deposit-automation";
import { parsePointsSettings, calculatePointsToEarn } from "@/hooks/use-points";

/**
 * Create audit log entry with panel source
 */
async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  panelSource: "admin" | "ops" = "admin"
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert([{
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData as any,
    new_data: { ...newData, panel_source: panelSource } as any,
  }]);
}

/**
 * Update booking status with all side effects
 */
export async function updateBookingStatus(input: UpdateBookingStatusInput): Promise<void> {
  const { bookingId, newStatus, notes, panelSource = "admin" } = input;

  // Get current booking state
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("status, booking_code, user_id, vehicle_id, total_amount, tax_amount")
    .eq("id", bookingId)
    .single();

  if (fetchError) throw fetchError;

  const oldStatus = booking.status;
  
  // Build update payload
  const updateData: Record<string, unknown> = { status: newStatus };
  
  if (newStatus === "completed" || newStatus === "cancelled") {
    updateData.actual_return_at = new Date().toISOString();
  }
  
  if (notes) {
    updateData.notes = notes;
  }

  // Update booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId);

  if (updateError) throw updateError;

  // Create audit log
  await createAuditLog(
    "booking_status_change",
    "booking",
    bookingId,
    { status: oldStatus },
    { status: newStatus, notes, reason: notes },
    panelSource
  );

  // Handle deposit automation
  await handleDepositOnStatusChange(bookingId, newStatus);

  // Handle points for completion/cancellation
  if (newStatus === "completed") {
    await awardPointsForCompletion(bookingId, booking.user_id, booking.total_amount, booking.tax_amount);
  } else if (newStatus === "cancelled") {
    await reversePointsForCancellation(bookingId);
  }

  // Create alert for significant status changes
  if (["active", "completed", "cancelled"].includes(newStatus)) {
    const alertType = newStatus === "active" ? "return_due_soon" : 
                     newStatus === "cancelled" ? "customer_issue" : "verification_pending";
    await supabase.from("admin_alerts").insert([{
      alert_type: alertType,
      title: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} - ${booking.booking_code}`,
      message: `Booking ${booking.booking_code} status changed to ${newStatus}`,
      booking_id: bookingId,
      status: "pending" as const,
    }]);
  }

  // Send notifications
  await sendStatusNotification(bookingId, newStatus, booking);
}

/**
 * Void a booking (admin-only via edge function)
 */
export async function voidBooking(input: VoidBookingInput): Promise<void> {
  const { bookingId, reason, refundAmount, panelSource } = input;

  // Call edge function for secure void operation
  const { error } = await supabase.functions.invoke("void-booking", {
    body: {
      bookingId,
      reason,
      refundAmount,
      panelSource,
    },
  });

  if (error) throw error;
}

/**
 * Assign vehicle unit to booking
 */
export async function assignVehicleToBooking(input: AssignVehicleInput): Promise<string> {
  const { bookingId, categoryId, locationId } = input;

  const { data, error } = await supabase.rpc("assign_vin_to_booking", {
    p_category_id: categoryId,
    p_booking_id: bookingId,
    p_location_id: locationId,
  });

  if (error) throw error;

  await createAuditLog(
    "vehicle_assigned",
    "booking",
    bookingId,
    null,
    { assigned_unit_id: data, category_id: categoryId },
    "ops"
  );

  return data as string;
}

/**
 * Release vehicle from booking
 */
export async function releaseVehicleFromBooking(
  bookingId: string,
  newStatus: string = "available",
  panelSource: "admin" | "ops" = "ops"
): Promise<void> {
  // Get current assignment
  const { data: booking } = await supabase
    .from("bookings")
    .select("assigned_unit_id")
    .eq("id", bookingId)
    .single();

  const { error } = await supabase.rpc("release_vin_from_booking", {
    p_booking_id: bookingId,
    p_new_status: newStatus,
  });

  if (error) throw error;

  await createAuditLog(
    "vehicle_released",
    "booking",
    bookingId,
    { assigned_unit_id: booking?.assigned_unit_id },
    { new_unit_status: newStatus },
    panelSource
  );
}

// ========== Helper Functions ==========

async function awardPointsForCompletion(
  bookingId: string,
  userId: string,
  totalAmount: number,
  taxAmount: number | null
) {
  try {
    // Fetch add-ons total
    const { data: addOnsData } = await supabase
      .from("booking_add_ons")
      .select("price")
      .eq("booking_id", bookingId);

    const addOnsTotal = (addOnsData || []).reduce((sum, a) => sum + (a.price || 0), 0);

    // Fetch points settings
    const { data: settingsData } = await supabase
      .from("points_settings")
      .select("setting_key, setting_value");

    const settings = parsePointsSettings(settingsData);

    const pointsToEarn = calculatePointsToEarn(
      totalAmount || 0,
      taxAmount || 0,
      addOnsTotal,
      settings
    );

    if (pointsToEarn > 0) {
      let expiresAt: string | null = null;
      if (settings.expiration.enabled) {
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + settings.expiration.months);
        expiresAt = expDate.toISOString();
      }

      await supabase.rpc("update_points_balance", {
        p_user_id: userId,
        p_points: pointsToEarn,
        p_booking_id: bookingId,
        p_transaction_type: "earn",
        p_money_value: totalAmount,
        p_notes: "Points earned from booking completion",
        p_expires_at: expiresAt,
      });
    }
  } catch (e) {
    console.error("Failed to award points:", e);
  }
}

async function reversePointsForCancellation(bookingId: string) {
  try {
    const { data: earnEntry } = await supabase
      .from("points_ledger")
      .select("points, user_id")
      .eq("booking_id", bookingId)
      .eq("transaction_type", "earn")
      .maybeSingle();

    if (earnEntry) {
      const { data: existingReverse } = await supabase
        .from("points_ledger")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("transaction_type", "reverse")
        .maybeSingle();

      if (!existingReverse) {
        await supabase.rpc("update_points_balance", {
          p_user_id: earnEntry.user_id,
          p_points: -earnEntry.points,
          p_booking_id: bookingId,
          p_transaction_type: "reverse",
          p_notes: "Points reversed due to booking cancellation",
        });
      }
    }
  } catch (e) {
    console.error("Failed to reverse points:", e);
  }
}

async function sendStatusNotification(
  bookingId: string,
  newStatus: BookingStatus,
  booking: { booking_code: string; user_id: string; vehicle_id: string }
) {
  let notificationStage: string | null = null;
  
  if (newStatus === "active") {
    notificationStage = "rental_activated";
  } else if (newStatus === "completed") {
    notificationStage = "return_completed";
  }

  if (!notificationStage) return;

  try {
    await supabase.functions.invoke("send-booking-notification", {
      body: { bookingId, stage: notificationStage },
    });

    // Get vehicle and profile names for admin notification
    const [{ data: category }, { data: profile }] = await Promise.all([
      supabase.from("vehicle_categories").select("name").eq("id", booking.vehicle_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", booking.user_id).maybeSingle(),
    ]);

    await supabase.functions.invoke("notify-admin", {
      body: {
        eventType: notificationStage,
        bookingId,
        bookingCode: booking.booking_code,
        customerName: profile?.full_name || "",
        vehicleName: category?.name || "Vehicle",
      },
    });
  } catch (e) {
    console.error("Failed to send status notification:", e);
  }
}
