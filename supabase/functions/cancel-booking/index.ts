/**
 * cancel-booking — customer-initiated cancellation of their own booking.
 *
 * The browser cannot change booking status directly (blocked by
 * block_sensitive_booking_updates), so the customer's Cancel button routes
 * here. Only the booking's own renter may cancel, and only while the booking
 * is still upcoming (pending / confirmed). Staff use void-booking instead.
 *
 * Sends exactly one cancellation text for this cancellation. Nothing is ever
 * resent or backfilled for previously cancelled bookings.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUserOrThrow, getAdminClient, authErrorResponse } from "../_shared/auth.ts";

const CANCELLABLE = ["pending", "confirmed"];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { userId } = await getUserOrThrow(req, corsHeaders);
    const { bookingId, reason } = await req.json();

    if (!bookingId) return json({ error: "bookingId is required" }, 400);

    const admin = getAdminClient();

    const { data: booking, error: fetchErr } = await admin
      .from("bookings")
      .select("id, booking_code, status, user_id, assigned_unit_id, notes")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr || !booking) return json({ error: "Booking not found" }, 404);

    if (booking.user_id !== userId) {
      return json({ error: "Not your booking" }, 403);
    }

    if (!CANCELLABLE.includes(booking.status)) {
      return json(
        {
          error: `This booking can no longer be cancelled online (status: ${booking.status}). Please call us.`,
          errorCode: "INVALID_STATE_TRANSITION",
          currentStatus: booking.status,
        },
        409,
      );
    }

    const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
    const note = cleanReason
      ? `Cancelled by customer: ${cleanReason}`
      : "Cancelled by customer";

    const { error: updateErr } = await admin
      .from("bookings")
      .update({
        status: "cancelled",
        notes: note,
        actual_return_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

    // Release any reserved unit back to the pool
    if (booking.assigned_unit_id) {
      await admin
        .from("vehicle_units")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", booking.assigned_unit_id);
    }

    await admin.from("audit_logs").insert([{
      user_id: userId,
      action: "booking_cancelled",
      entity_type: "booking",
      entity_id: bookingId,
      old_data: { status: booking.status },
      new_data: { status: "cancelled", reason: cleanReason || null, panel_source: "customer" },
    }]);

    // One cancellation text for this cancellation. Failures are logged inside
    // send-booking-notification; they must never block the cancellation.
    try {
      const { error: notifyErr } = await admin.functions.invoke("send-booking-notification", {
        body: { bookingId, stage: "booking_cancelled" },
      });
      if (notifyErr) {
        console.error(`[cancel-booking] cancellation notice failed for ${booking.booking_code}`, notifyErr);
      }
    } catch (err) {
      console.error(`[cancel-booking] cancellation notice threw for ${booking.booking_code}`, err);
    }

    return json({ success: true });
  } catch (err) {
    try {
      return authErrorResponse(err, corsHeaders);
    } catch {
      // not an auth error
    }
    console.error("[cancel-booking] unexpected error", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
