/**
 * process-deposit-refund - Process deposit refunds via Stripe
 * Handles full or partial refunds for security deposits
 */
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, amount, reason, paymentIntentId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking and deposit payment details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, booking_code, deposit_amount, user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the deposit payment with Stripe transaction ID
    const { data: depositPayment, error: paymentError } = await supabase
      .from("payments")
      .select("id, transaction_id, amount, status")
      .eq("booking_id", bookingId)
      .eq("payment_type", "deposit")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !depositPayment) {
      return new Response(
        JSON.stringify({ error: "No completed deposit payment found for this booking" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentIntent = paymentIntentId || depositPayment.transaction_id;
    if (!paymentIntent) {
      return new Response(
        JSON.stringify({ error: "No Stripe payment intent ID found for deposit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine refund amount
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(depositPayment.amount * 100);
    const isPartialRefund = amount && amount < depositPayment.amount;

    console.log(`Processing ${isPartialRefund ? 'partial' : 'full'} refund of $${(refundAmount / 100).toFixed(2)} for booking ${booking.booking_code}`);

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      amount: refundAmount,
      reason: "requested_by_customer",
      metadata: {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        refund_reason: reason || "Deposit refund - rental completed",
        type: "deposit_refund",
      },
    });

    console.log(`Stripe refund created: ${refund.id}, status: ${refund.status}`);

    // Update payment status
    await supabase
      .from("payments")
      .update({
        status: isPartialRefund ? "partial_refunded" : "refunded",
      })
      .eq("id", depositPayment.id);

    // Add to deposit ledger
    const { data: user } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    );

    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      action: "stripe_refund",
      amount: refundAmount / 100,
      reason: reason || `Stripe refund processed (${refund.id})`,
      created_by: user?.user?.id || "system",
      payment_id: depositPayment.id,
    });

    // Create audit log
    await supabase.from("audit_logs").insert({
      action: "deposit_refunded",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: user?.user?.id || null,
      new_data: {
        refund_id: refund.id,
        amount: refundAmount / 100,
        status: refund.status,
        reason: reason,
        is_partial: isPartialRefund,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refundAmount / 100,
        currency: refund.currency,
        isPartialRefund,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing deposit refund:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to process refund";
    const isStripeError = error instanceof Stripe.errors.StripeError;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: isStripeError ? (error as any).code : undefined,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
