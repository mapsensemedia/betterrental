/**
 * update-booking-status — Server-side booking status transitions
 *
 * Bypasses block_sensitive_booking_updates trigger using service_role.
 * Handles: status update, vehicle unit status, deposit automation,
 * points award/reversal, admin alerts, and notifications.
 */
import {
  getCorsHeaders,
  handleCorsPreflightRequest,
} from "../_shared/cors.ts";
import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  AuthError,
  authErrorResponse,
} from "../_shared/auth.ts";

// Return state validation (mirrored from client)
const STATE_ORDER = [
  "not_started",
  "initiated",
  "intake_done",
  "evidence_done",
  "issues_reviewed",
  "closeout_done",
  "deposit_processed",
];

function isStateAtLeast(current: string, required: string): boolean {
  return STATE_ORDER.indexOf(current) >= STATE_ORDER.indexOf(required);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflightRequest(req, corsHeaders);
  if (preflightResponse) return preflightResponse;

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId, ["admin", "staff"], corsHeaders);

    const { bookingId, newStatus, notes, bypassReason, reopen, skipNotifications, activationSource, activationReason, incompleteAtActivation } = await req.json();

    if (!bookingId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "bookingId and newStatus are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = getAdminClient();

    // Fetch current booking
    const { data: booking, error: fetchErr } = await admin
      .from("bookings")
      .select("booking_code, user_id, vehicle_id, assigned_unit_id, status, return_state")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentStatus = booking.status;
    const returnState = booking.return_state || "not_started";

    // Validate return workflow for active → completed
    if (currentStatus === "active" && newStatus === "completed") {
      if (!isStateAtLeast(returnState, "closeout_done")) {
        // Check for admin bypass
        if (bypassReason && typeof bypassReason === "string" && bypassReason.trim().length >= 50) {
          // Log bypass
          await admin.from("audit_logs").insert({
            action: "workflow_bypass",
            entity_type: "booking",
            entity_id: bookingId,
            user_id: user.userId,
            new_data: {
              from_status: currentStatus,
              to_status: newStatus,
              return_state: returnState,
              bypass_reason: bypassReason,
              warning: "ADMIN OVERRIDE: Return workflow bypassed",
            },
          });

          await admin.from("admin_alerts").insert({
            alert_type: "customer_issue",
            title: `⚠️ Workflow Bypassed - ${booking.booking_code}`,
            message: `Return workflow bypassed: ${bypassReason}`,
            booking_id: bookingId,
            status: "pending",
          });
        } else {
          return new Response(
            JSON.stringify({ error: "Complete return workflow first (intake, evidence, issues, closeout)" }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = { status: newStatus };
    const now = new Date().toISOString();
    if (newStatus === "completed" || newStatus === "cancelled") {
      updateData.actual_return_at = now;
    }
    // When activating, set handover/activation timestamps
    if (newStatus === "active" && !reopen) {
      updateData.handed_over_at = now;
      updateData.handed_over_by = user.userId;
      updateData.activated_at = now;
      updateData.activated_by = user.userId;
      updateData.activation_source = activationSource || "counter";
      if (activationReason) {
        updateData.activation_reason = activationReason;
      }
    }
    // Reopen: clear return workflow fields so the booking can be re-closed properly
    if (reopen && newStatus === "active") {
      updateData.actual_return_at = null;
      updateData.return_state = "not_started";
      updateData.return_started_at = null;
      updateData.return_intake_completed_at = null;
      updateData.return_intake_completed_by = null;
      updateData.return_evidence_completed_at = null;
      updateData.return_evidence_completed_by = null;
      updateData.return_issues_reviewed_at = null;
      updateData.return_issues_reviewed_by = null;
      updateData.return_is_exception = null;
      updateData.return_exception_reason = null;
    }
    if (notes) {
      updateData.notes = notes;
    }

    // Update booking status
    const { data: updated, error: updateErr } = await admin
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select()
      .single();

    if (updateErr) {
      console.error("Failed to update booking status:", updateErr);
      return new Response(
        JSON.stringify({ error: updateErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit log
    const auditNewData: Record<string, unknown> = { status: newStatus, notes, workflow_bypassed: !!bypassReason, reopened: !!reopen };
    if (activationSource) auditNewData.activation_source = activationSource;
    if (activationReason) auditNewData.activation_reason = activationReason;
    if (incompleteAtActivation && Array.isArray(incompleteAtActivation) && incompleteAtActivation.length > 0) {
      auditNewData.incomplete_at_activation = incompleteAtActivation;
    }
    await admin.from("audit_logs").insert({
      action: activationSource === "ops_manual" ? "manual_activation" : reopen ? "booking_reopened" : "booking_status_change",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: user.userId,
      old_data: { status: currentStatus },
      new_data: auditNewData,
    });

    // Update vehicle unit status
    if (booking.assigned_unit_id) {
      if (newStatus === "active") {
        await admin.from("vehicle_units").update({ status: "on_rent" }).eq("id", booking.assigned_unit_id);
      } else if (newStatus === "completed" || newStatus === "cancelled") {
        await admin.from("vehicle_units").update({ status: "available" }).eq("id", booking.assigned_unit_id);
      }
    }

    // Handle deposit on status change
    await handleDeposit(admin, bookingId, newStatus, user.userId);

    // Handle points
    await handlePoints(admin, bookingId, newStatus, booking.user_id);

    // Create admin alerts
    if (["active", "completed", "cancelled"].includes(newStatus)) {
      const alertType = newStatus === "active" ? "return_due_soon"
        : newStatus === "cancelled" ? "customer_issue"
        : "verification_pending";
      const statusLabel = newStatus === "active" ? "Activated"
        : newStatus === "cancelled" ? "Cancelled"
        : "Completed";

      await admin.from("admin_alerts").insert({
        alert_type: alertType,
        title: `Booking ${statusLabel} - ${booking.booking_code}`,
        message: `Booking ${booking.booking_code} status changed to ${newStatus}`,
        booking_id: bookingId,
        status: "new",
      });
    }

    // Send notifications (skip when explicitly suppressed, e.g. reopen or manual activation)
    const shouldSkipNotifications = skipNotifications || activationSource === "ops_manual";
    let notificationStage: string | null = null;
    if (newStatus === "active") notificationStage = "rental_activated";
    else if (newStatus === "completed") notificationStage = "return_completed";

    if (notificationStage && !shouldSkipNotifications) {
      try {
        // Fetch names for admin notification
        const { data: categoryData } = booking.vehicle_id
          ? await admin.from("vehicle_categories").select("name").eq("id", booking.vehicle_id).maybeSingle()
          : { data: null };
        const { data: profile } = await admin.from("profiles").select("full_name").eq("id", booking.user_id).maybeSingle();

        await admin.functions.invoke("send-booking-notification", {
          body: { bookingId, stage: notificationStage },
        });

        await admin.functions.invoke("notify-admin", {
          body: {
            eventType: notificationStage,
            bookingId,
            bookingCode: booking.booking_code,
            customerName: profile?.full_name || "",
            vehicleName: categoryData?.name || "Vehicle",
          },
        });
      } catch (e) {
        console.error("Failed to send status notification:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, booking: updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return authErrorResponse(err, corsHeaders);
    }
    console.error("update-booking-status error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ---- Deposit handling (server-side mirror of deposit-automation.ts) ----

async function handleDeposit(admin: any, bookingId: string, newStatus: string, userId: string) {
  try {
    const { data: bookingDeposit } = await admin
      .from("bookings")
      .select("deposit_amount, deposit_status, wl_deposit_auth_status, wl_deposit_transaction_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (!bookingDeposit) return;

    // Determine deposit lifecycle state
    const txnId = bookingDeposit.wl_deposit_transaction_id;
    const depositStatus = bookingDeposit.deposit_status;
    const wlAuthStatus = bookingDeposit.wl_deposit_auth_status;

    // Simple authorized check (mirrors getDepositLifecycleState)
    const isAuthorized = txnId && (depositStatus === "authorized" || wlAuthStatus === "PENDING_CAPTURE");
    if (!isAuthorized) return;

    const depositAmount = Number(bookingDeposit.deposit_amount) || 0;

    if (newStatus === "completed") {
      const { data: damages } = await admin
        .from("damage_reports")
        .select("id, status, estimated_cost")
        .eq("booking_id", bookingId)
        .neq("status", "closed");

      const hasOpenDamages = damages && damages.length > 0;
      const totalDamageCost = damages?.reduce((s: number, d: any) => s + (d.estimated_cost || 0), 0) || 0;

      if (!hasOpenDamages) {
        // Auto-release
        const { error: releaseErr } = await admin.functions.invoke("wl-cancel-auth", {
          body: { bookingId },
        });
        if (releaseErr) {
          console.error("Failed to release deposit hold:", releaseErr);
        }
        await admin.from("audit_logs").insert({
          action: "deposit_auto_released",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: userId,
          new_data: { booking_id: bookingId, amount: depositAmount, reason: "auto_release_on_completion" },
        });
      } else if (totalDamageCost > 0) {
        await createDepositAlert(admin, bookingId, depositAmount, totalDamageCost, "damage_review");
      }
    } else if (newStatus === "cancelled") {
      await createDepositAlert(admin, bookingId, depositAmount, 0, "cancelled_with_deposit");
    }
  } catch (e) {
    console.error("Deposit handling error:", e);
  }
}

async function createDepositAlert(
  admin: any, bookingId: string, depositAmount: number, damageCost: number,
  reason: "damage_review" | "cancelled_with_deposit"
) {
  const title = reason === "cancelled_with_deposit"
    ? "Cancelled Booking: Deposit Requires Manual Review"
    : "Completed Booking: Deposit Requires Damage Review";
  const message = reason === "cancelled_with_deposit"
    ? `Booking was cancelled with $${depositAmount.toFixed(2)} deposit held. Manual review required.`
    : `Booking completed with $${damageCost.toFixed(2)} in damage costs. Deposit of $${depositAmount.toFixed(2)} requires review.`;

  await admin.from("admin_alerts").insert({
    booking_id: bookingId,
    alert_type: "payment_pending",
    title,
    message,
    status: "pending",
  });
}

// ---- Points handling ----

async function handlePoints(admin: any, bookingId: string, newStatus: string, bookingUserId: string) {
  try {
    if (newStatus === "completed") {
      const { data: fullBooking } = await admin
        .from("bookings")
        .select("total_amount, tax_amount, user_id")
        .eq("id", bookingId)
        .single();
      if (!fullBooking) return;

      const { data: addOnsData } = await admin
        .from("booking_add_ons")
        .select("price")
        .eq("booking_id", bookingId);
      const addOnsTotal = (addOnsData || []).reduce((s: number, a: any) => s + (a.price || 0), 0);

      const { data: settingsData } = await admin
        .from("points_settings")
        .select("setting_key, setting_value");

      const settings = parsePointsSettings(settingsData);
      const pointsToEarn = calculatePointsToEarn(
        fullBooking.total_amount || 0,
        fullBooking.tax_amount || 0,
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

        await admin.rpc("update_points_balance", {
          p_user_id: fullBooking.user_id,
          p_points: pointsToEarn,
          p_booking_id: bookingId,
          p_transaction_type: "earn",
          p_money_value: fullBooking.total_amount,
          p_notes: "Points earned from booking completion",
          p_expires_at: expiresAt,
        });
      }
    } else if (newStatus === "cancelled") {
      const { data: earnEntry } = await admin
        .from("points_ledger")
        .select("points, user_id")
        .eq("booking_id", bookingId)
        .eq("transaction_type", "earn")
        .maybeSingle();

      if (earnEntry) {
        const { data: existingReverse } = await admin
          .from("points_ledger")
          .select("id")
          .eq("booking_id", bookingId)
          .eq("transaction_type", "reverse")
          .maybeSingle();

        if (!existingReverse) {
          await admin.rpc("update_points_balance", {
            p_user_id: earnEntry.user_id,
            p_points: -earnEntry.points,
            p_booking_id: bookingId,
            p_transaction_type: "reverse",
            p_notes: "Points reversed due to booking cancellation",
          });
        }
      }
    }
  } catch (e) {
    console.error("Points handling error:", e);
  }
}

// ---- Points calculation (mirrored from client) ----

interface PointsSettings {
  earning: { pointsPerDollar: number; excludeTax: boolean; excludeAddons: boolean };
  expiration: { enabled: boolean; months: number };
}

function parsePointsSettings(data: any[] | null): PointsSettings {
  const map = new Map((data || []).map((s: any) => [s.setting_key, s.setting_value]));
  return {
    earning: {
      pointsPerDollar: Number(map.get("points_per_dollar")) || 1,
      excludeTax: map.get("exclude_tax") === "true",
      excludeAddons: map.get("exclude_addons") === "true",
    },
    expiration: {
      enabled: map.get("points_expiration_enabled") === "true",
      months: Number(map.get("points_expiration_months")) || 12,
    },
  };
}

function calculatePointsToEarn(
  totalAmount: number, taxAmount: number, addOnsTotal: number, settings: PointsSettings
): number {
  let base = totalAmount;
  if (settings.earning.excludeTax) base -= taxAmount;
  if (settings.earning.excludeAddons) base -= addOnsTotal;
  return Math.max(0, Math.floor(base * settings.earning.pointsPerDollar));
}
