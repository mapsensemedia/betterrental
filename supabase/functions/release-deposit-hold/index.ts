import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

/**
 * Release Deposit Hold
 * 
 * Cancels a Stripe authorization hold without charging the customer
 * Business rule: Only allowed when booking status is 'completed' or 'voided'
 */

interface ReleaseDepositHoldRequest {
  bookingId: string;
  reason: string; // Required - why are we releasing?
  bypassStatusCheck?: boolean; // For admin override (e.g., voided bookings)
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin/staff
    const hasAccess = await isAdminOrStaff(authResult.userId!);
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin/Staff only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { bookingId, reason, bypassStatusCheck }: ReleaseDepositHoldRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reason) {
      return new Response(
        JSON.stringify({ error: "reason is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id, 
        booking_code, 
        user_id, 
        deposit_amount, 
        deposit_status,
        stripe_deposit_pi_id,
        status
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Business rule: Only release if booking is completed or voided (unless bypassed)
    const allowedStatuses = ["completed", "voided"];
    if (!bypassStatusCheck && !allowedStatuses.includes(booking.status)) {
      return new Response(
        JSON.stringify({ 
          error: `Cannot release deposit - booking status is '${booking.status}'. ` +
                 `Must be 'completed' or 'voided' before releasing deposit hold.`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify deposit is in authorized state
    if (booking.deposit_status !== "authorized") {
      // If already released, return success (idempotent)
      if (booking.deposit_status === "released") {
        return new Response(
          JSON.stringify({ 
            success: true, 
            alreadyReleased: true,
            paymentIntentId: booking.stripe_deposit_pi_id,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Cannot release - deposit status is '${booking.deposit_status}', must be 'authorized'` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.stripe_deposit_pi_id) {
      return new Response(
        JSON.stringify({ error: "No Stripe PaymentIntent found for this deposit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to releasing
    await supabase
      .from("bookings")
      .update({ deposit_status: "releasing" })
      .eq("id", bookingId);

    // Cancel the PaymentIntent (releases the authorization)
    let canceledIntent: Stripe.PaymentIntent;
    try {
      canceledIntent = await stripe.paymentIntents.cancel(
        booking.stripe_deposit_pi_id,
        {
          cancellation_reason: "requested_by_customer",
        }
      );
    } catch (stripeError: any) {
      // Check if already canceled
      if (stripeError.code === "payment_intent_unexpected_state") {
        const pi = await stripe.paymentIntents.retrieve(booking.stripe_deposit_pi_id);
        if (pi.status === "canceled") {
          // Already canceled - update our records
          await supabase
            .from("bookings")
            .update({
              deposit_status: "released",
              deposit_released_at: new Date().toISOString(),
            })
            .eq("id", bookingId);
            
          return new Response(
            JSON.stringify({ 
              success: true, 
              alreadyCanceled: true,
              paymentIntentId: booking.stripe_deposit_pi_id,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      throw stripeError;
    }

    const releasedAmount = booking.deposit_amount || canceledIntent.amount / 100;

    // Update booking with release details
    await supabase
      .from("bookings")
      .update({
        deposit_status: "released",
        deposit_released_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // Add ledger entry
    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      action: "stripe_release",
      amount: releasedAmount,
      created_by: authResult.userId!,
      reason: reason,
      stripe_pi_id: booking.stripe_deposit_pi_id,
    });

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "deposit_released",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: authResult.userId,
      new_data: {
        payment_intent_id: booking.stripe_deposit_pi_id,
        released_amount: releasedAmount,
        reason: reason,
        booking_status: booking.status,
      },
    });

    // Send notification to customer
    try {
      await supabase.functions.invoke("send-deposit-notification", {
        body: { 
          bookingId, 
          type: "released",
          amount: releasedAmount,
        },
      });
    } catch (notifyErr) {
      console.warn("Failed to send deposit release notification:", notifyErr);
    }

    console.log(`Released deposit hold ($${releasedAmount}) for booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        canceled: true,
        paymentIntentId: booking.stripe_deposit_pi_id,
        releasedAmount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error releasing deposit hold:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
