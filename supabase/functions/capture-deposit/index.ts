import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

/**
 * Capture Deposit
 * 
 * Captures an authorized deposit hold (charges the customer's card)
 * Supports full or partial capture
 * Remaining authorization is automatically released by Stripe
 */

interface CaptureDepositRequest {
  bookingId: string;
  amount?: number; // Optional - captures full amount if not specified
  reason: string; // Required - why are we capturing?
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

    const { bookingId, amount, reason }: CaptureDepositRequest = await req.json();

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
        stripe_deposit_pi_id
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify deposit is in authorized state
    if (booking.deposit_status !== "authorized") {
      return new Response(
        JSON.stringify({ 
          error: `Cannot capture - deposit status is '${booking.deposit_status}', must be 'authorized'` 
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

    // Update status to capturing
    await supabase
      .from("bookings")
      .update({ deposit_status: "capturing" })
      .eq("id", bookingId);

    // Get PaymentIntent to check authorized amount
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_deposit_pi_id);
    
    if (paymentIntent.status !== "requires_capture") {
      await supabase
        .from("bookings")
        .update({ deposit_status: booking.deposit_status }) // Revert
        .eq("id", bookingId);
        
      return new Response(
        JSON.stringify({ 
          error: `PaymentIntent is not capturable - status is '${paymentIntent.status}'` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authorizedAmount = paymentIntent.amount;
    const captureAmountCents = amount 
      ? Math.round(amount * 100) 
      : authorizedAmount;

    // Validate capture amount
    if (captureAmountCents > authorizedAmount) {
      await supabase
        .from("bookings")
        .update({ deposit_status: "authorized" }) // Revert
        .eq("id", bookingId);
        
      return new Response(
        JSON.stringify({ 
          error: `Cannot capture more than authorized amount ($${authorizedAmount / 100})` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture the PaymentIntent
    const capturedIntent = await stripe.paymentIntents.capture(
      booking.stripe_deposit_pi_id,
      {
        amount_to_capture: captureAmountCents,
      }
    );

    const capturedAmount = captureAmountCents / 100;
    const releasedAmount = (authorizedAmount - captureAmountCents) / 100;
    const chargeId = capturedIntent.latest_charge as string;

    // Update booking with capture details
    await supabase
      .from("bookings")
      .update({
        deposit_status: "captured",
        deposit_captured_at: new Date().toISOString(),
        deposit_captured_amount: captureAmountCents,
        deposit_capture_reason: reason,
        stripe_deposit_charge_id: chargeId,
      })
      .eq("id", bookingId);

    // Add ledger entries
    const ledgerEntries = [
      {
        booking_id: bookingId,
        action: captureAmountCents < authorizedAmount ? "partial_capture" : "capture",
        amount: capturedAmount,
        created_by: authResult.userId!,
        reason: reason,
        stripe_pi_id: booking.stripe_deposit_pi_id,
        stripe_charge_id: chargeId,
      },
    ];

    // If partial capture, also record the released portion
    if (releasedAmount > 0) {
      ledgerEntries.push({
        booking_id: bookingId,
        action: "stripe_release",
        amount: releasedAmount,
        created_by: authResult.userId!,
        reason: "Remaining authorization released after partial capture",
        stripe_pi_id: booking.stripe_deposit_pi_id,
        stripe_charge_id: null as any,
      });
    }

    await supabase.from("deposit_ledger").insert(ledgerEntries);

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "deposit_captured",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: authResult.userId,
      new_data: {
        payment_intent_id: booking.stripe_deposit_pi_id,
        charge_id: chargeId,
        captured_amount: capturedAmount,
        released_amount: releasedAmount,
        reason: reason,
      },
    });

    // Send notification to customer
    try {
      await supabase.functions.invoke("send-deposit-notification", {
        body: { 
          bookingId, 
          type: "captured",
          amount: capturedAmount,
        },
      });
    } catch (notifyErr) {
      console.warn("Failed to send deposit capture notification:", notifyErr);
    }

    console.log(`Captured $${capturedAmount} from deposit for booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        chargeId,
        capturedAmount,
        releasedAmount,
        paymentIntentId: booking.stripe_deposit_pi_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error capturing deposit:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
