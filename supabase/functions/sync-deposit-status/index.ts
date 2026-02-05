import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Sync Deposit Status
 * 
 * Syncs the deposit/authorization status from Stripe PaymentIntent to the database.
 * Used when webhooks fail or to manually refresh status.
 */

interface SyncDepositRequest {
  bookingId: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { bookingId }: SyncDepositRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking with current deposit info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_code,
        user_id,
        deposit_status,
        deposit_amount,
        stripe_deposit_pi_id,
        stripe_deposit_pm_id,
        card_last_four,
        card_type
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.stripe_deposit_pi_id) {
      return new Response(
        JSON.stringify({ 
          error: "No PaymentIntent found", 
          message: "This booking has no associated Stripe PaymentIntent to sync." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retrieve PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_deposit_pi_id);
    
    console.log(`Syncing PI ${paymentIntent.id} for booking ${bookingId}`);
    console.log(`PI Status: ${paymentIntent.status}, Amount Capturable: ${paymentIntent.amount_capturable}`);

    // Determine the correct status based on PaymentIntent state
    let newStatus: string;
    const updateData: Record<string, unknown> = {};

    switch (paymentIntent.status) {
      case "requires_payment_method":
        newStatus = "requires_payment";
        break;
      case "requires_confirmation":
        newStatus = "requires_payment";
        break;
      case "requires_action":
        newStatus = "authorizing";
        break;
      case "processing":
        newStatus = "authorizing";
        break;
      case "requires_capture":
        // This means funds are authorized and held
        newStatus = "authorized";
        updateData.deposit_authorized_at = updateData.deposit_authorized_at || new Date().toISOString();
        updateData.deposit_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "succeeded":
        // Payment was captured
        newStatus = "captured";
        updateData.deposit_captured_at = new Date().toISOString();
        break;
      case "canceled":
        newStatus = paymentIntent.cancellation_reason === "automatic" ? "expired" : "canceled";
        updateData.deposit_released_at = new Date().toISOString();
        break;
      default:
        newStatus = booking.deposit_status || "none";
    }

    // Get card details from payment method if we have one
    if (paymentIntent.payment_method && typeof paymentIntent.payment_method === "string") {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
        if (pm.card) {
          updateData.card_last_four = pm.card.last4;
          updateData.card_type = pm.card.brand;
          updateData.stripe_deposit_pm_id = pm.id;
        }
      } catch (e) {
        console.warn("Could not fetch payment method:", e);
      }
    }

    // Get charge ID if there's a successful charge
    if (paymentIntent.latest_charge) {
      const chargeId = typeof paymentIntent.latest_charge === "string" 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge.id;
      updateData.stripe_deposit_charge_id = chargeId;
    }

    // Update booking
    updateData.deposit_status = newStatus;
    
    const { error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      throw new Error("Failed to update booking status");
    }

    // Log the sync action
    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      action: "status_sync",
      amount: paymentIntent.amount_capturable ? paymentIntent.amount_capturable / 100 : 0,
      created_by: booking.user_id,
      reason: `Manual sync from Stripe - Status: ${paymentIntent.status} → ${newStatus}`,
      stripe_pi_id: paymentIntent.id,
    });

    console.log(`Synced booking ${bookingId}: ${booking.deposit_status} → ${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        previousStatus: booking.deposit_status,
        newStatus,
        stripeStatus: paymentIntent.status,
        amountCapturable: paymentIntent.amount_capturable ? paymentIntent.amount_capturable / 100 : 0,
        cardLast4: updateData.card_last_four || booking.card_last_four,
        cardBrand: updateData.card_type || booking.card_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing deposit status:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
