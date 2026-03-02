/**
 * wl-webhook — Handle Worldline/Bambora webhook callbacks
 * 
 * Receives payment status updates and updates booking/payment records.
 * Uses idempotency checks to prevent duplicate processing.
 */

import { getCorsHeaders } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";
import { hasEventBeenProcessed, markEventProcessed } from "../_shared/idempotency.ts";
import { createLogger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true); // webhook = true

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const log = createLogger("wl-webhook");

  try {
    const body = await req.json();
    const eventId = body.transaction_id || body.id || crypto.randomUUID();
    const eventType = body.event_type || body.type || "unknown";

    log.info("Webhook received", { event_id: eventId, event_type: eventType });

    // Idempotency check
    const alreadyProcessed = await hasEventBeenProcessed("wl_webhook", String(eventId));
    if (alreadyProcessed) {
      log.info("Duplicate webhook, skipping", { event_id: eventId });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getAdminClient();
    const transactionId = String(body.transaction_id || body.id);

    // Find booking by transaction ID
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, deposit_status, wl_auth_status")
      .eq("wl_transaction_id", transactionId)
      .maybeSingle();

    if (!booking) {
      log.warn("No booking found for transaction", { transaction_id: transactionId });
      await markEventProcessed("wl_webhook", String(eventId));
      return new Response(JSON.stringify({ received: true, matched: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.setBooking(booking.id);

    // Handle event types
    const paymentStatus = body.approved;
    const paymentType = body.type; // "P" = purchase, "PA" = pre-auth, "PAC" = capture, "VP" = void

    if (paymentType === "P" && paymentStatus === 1) {
      // Purchase completed
      await supabase.from("bookings").update({
        wl_auth_status: "completed",
        status: "confirmed",
      }).eq("id", booking.id);
    } else if (paymentType === "VP") {
      // Void processed
      await supabase.from("bookings").update({
        wl_auth_status: "voided",
        deposit_status: "released",
        deposit_released_at: new Date().toISOString(),
      }).eq("id", booking.id);
    }

    await markEventProcessed("wl_webhook", String(eventId), {
      bookingId: booking.id,
    });

    log.info("Webhook processed", { event_type: paymentType, approved: paymentStatus });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Webhook processing failed", error);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
