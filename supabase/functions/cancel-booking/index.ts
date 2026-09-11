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
import { writeNotificationLog, failureKey } from "../_shared/notify-log.ts";

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

    console.log(`[cancel-booking] request user=${userId} booking=${bookingId}`);

    const admin = getAdminClient();

    const { data: booking, error: fetchErr } = await admin
      .from("bookings")
      .select("id, booking_code, status, user_id, assigned_unit_id, notes")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr || !booking) {
      console.error(`[cancel-booking] lookup failed for ${bookingId}`, fetchErr);
      return json({ error: "Booking not found" }, 404);
    }

    if (booking.user_id !== userId) {
      console.warn(`[cancel-booking] ownership mismatch on ${booking.booking_code}`);
      return json({ error: "Not your booking" }, 403);
    }

    // Repeat press (or a retry after a dropped response): the work is already
    // done. Report success and send nothing again.
    if (booking.status === "cancelled") {
      console.log(`[cancel-booking] ${booking.booking_code} already cancelled — no-op`);
      return json({ success: true, alreadyCancelled: true });
    }

    if (!CANCELLABLE.includes(booking.status)) {
      console.log(`[cancel-booking] ${booking.booking_code} not cancellable (status=${booking.status})`);
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

    if (updateErr) {
      console.error(`[cancel-booking] status update failed for ${booking.booking_code}`, updateErr);
      throw updateErr;
    }

    // Release any reserved unit back to the pool
    if (booking.assigned_unit_id) {
      const { error: unitErr } = await admin
        .from("vehicle_units")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", booking.assigned_unit_id);
      if (unitErr) {
        console.error(`[cancel-booking] unit release failed for ${booking.booking_code}`, unitErr);
      }
    }

    await admin.from("audit_logs").insert([{
      user_id: userId,
      action: "booking_cancelled",
      entity_type: "booking",
      entity_id: bookingId,
      old_data: { status: booking.status },
      new_data: { status: "cancelled", reason: cleanReason || null, panel_source: "customer" },
    }]);

    console.log(`[cancel-booking] ${booking.booking_code} cancelled by customer`);

    // One cancellation notice for this cancellation, dispatched AFTER the
    // browser has its answer so a slow or failing notifier can never make the
    // cancel button look broken. Nothing is ever resent for older bookings.
    const notify = (async () => {
      try {
        const { error: notifyErr } = await admin.functions.invoke("send-booking-notification", {
          body: { bookingId, stage: "booking_cancelled" },
        });
        if (notifyErr) {
          console.error(`[cancel-booking] cancellation notice failed for ${booking.booking_code}`, notifyErr);
          await writeNotificationLog(admin, {
            channel: "sms",
            notificationType: "booking_cancelled",
            bookingId,
            userId,
            idempotencyKey: failureKey(`booking_cancelled:${bookingId}:dispatch`),
            status: "failed",
            errorMessage: notifyErr.message || String(notifyErr),
          });
        }
      } catch (err) {
        console.error(`[cancel-booking] cancellation notice threw for ${booking.booking_code}`, err);
        await writeNotificationLog(admin, {
          channel: "sms",
          notificationType: "booking_cancelled",
          bookingId,
          userId,
          idempotencyKey: failureKey(`booking_cancelled:${bookingId}:dispatch`),
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    // Keep the worker alive for the background send without delaying the reply.
    const waitUntil = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
      .EdgeRuntime?.waitUntil;
    if (typeof waitUntil === "function") {
      waitUntil(notify);
    } else {
      await notify;
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
