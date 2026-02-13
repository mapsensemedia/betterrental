/**
 * void-booking - Admin-only secure booking void operation
 * Requires admin role, writes to audit_logs with panel_source
 * Enforces lifecycle: cannot void completed or already-cancelled bookings
 */

import { getCorsHeaders } from "../_shared/cors.ts";
import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  authErrorResponse,
} from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth + role gate (shared helpers)
    const { userId } = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(userId, ["admin"], corsHeaders);

    const supabase = getAdminClient();

    const { bookingId, reason, refundAmount, panelSource } = await req.json();

    if (!bookingId || !reason) {
      return new Response(JSON.stringify({ error: "Missing bookingId or reason" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get booking current state
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Lifecycle guard: block voiding terminal states ──
    const terminalStatuses = ["cancelled", "completed"];
    if (terminalStatuses.includes(booking.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot void a ${booking.status} booking`,
          errorCode: "INVALID_STATE_TRANSITION",
          currentStatus: booking.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Void the booking
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        notes: `VOIDED: ${reason}`,
        actual_return_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    // Release assigned unit if any
    if (booking.assigned_unit_id) {
      await supabase
        .from("vehicle_units")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", booking.assigned_unit_id);
    }

    // Create audit log with panel source
    await supabase.from("audit_logs").insert([{
      user_id: userId,
      action: "booking_voided",
      entity_type: "booking",
      entity_id: bookingId,
      old_data: { status: booking.status, total_amount: booking.total_amount },
      new_data: {
        status: "cancelled",
        void_reason: reason,
        refund_amount: refundAmount || 0,
        panel_source: panelSource || "admin",
        voided_by: userId,
      },
    }]);

    // Create admin alert
    await supabase.from("admin_alerts").insert([{
      alert_type: "customer_issue",
      title: `Booking Voided - ${booking.booking_code}`,
      message: `Voided by admin: ${reason}`,
      booking_id: bookingId,
      status: "pending",
    }]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Handle AuthError from shared helpers
    try {
      return authErrorResponse(err, corsHeaders);
    } catch {
      // Not an auth error — generic handler
    }
    console.error("Void booking error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
