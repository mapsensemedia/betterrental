import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Create Checkout Deposit Hold
 * 
 * Creates a UNIFIED authorization hold covering BOTH the rental total and deposit.
 * Uses PaymentIntent with manual capture for the combined amount.
 * 
 * At closeout:
 * - Rental amount is captured
 * - Deposit portion is either captured (for damages) or released
 */

interface CreateCheckoutHoldRequest {
  bookingId: string;
  depositAmount: number;
  rentalAmount: number;
  customerId?: string;
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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const { 
      bookingId, 
      depositAmount,
      rentalAmount,
    }: CreateCheckoutHoldRequest = await req.json();

    if (!bookingId || depositAmount === undefined || rentalAmount === undefined) {
      return new Response(
        JSON.stringify({ error: "bookingId, depositAmount, and rentalAmount are required" }),
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
        deposit_status,
        stripe_deposit_pi_id,
        total_amount
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check - if already has a deposit PI, return it
    if (booking.stripe_deposit_pi_id && booking.deposit_status !== "failed") {
      console.log(`Deposit PI already exists for booking ${bookingId}`);
      
      const existingPI = await stripe.paymentIntents.retrieve(booking.stripe_deposit_pi_id);
      
      return new Response(
        JSON.stringify({
          success: true,
          alreadyExists: true,
          paymentIntentId: existingPI.id,
          clientSecret: existingPI.client_secret,
          totalHoldAmount: existingPI.amount / 100,
          depositAmount: depositAmount,
          rentalAmount: rentalAmount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for customer details
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name, phone")
      .eq("id", booking.user_id)
      .single();

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    
    if (profile?.email) {
      const existingCustomers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined,
          phone: profile.phone || undefined,
          metadata: {
            user_id: booking.user_id,
            source: "c2c_rental_checkout",
          },
        });
        stripeCustomerId = newCustomer.id;
      }
    }

    // UNIFIED HOLD: Rental + Deposit combined
    const totalHoldAmount = rentalAmount + depositAmount;
    const totalHoldAmountCents = Math.round(totalHoldAmount * 100);
    const depositAmountCents = Math.round(depositAmount * 100);
    const rentalAmountCents = Math.round(rentalAmount * 100);
    
    // Calculate expiration (7 days from now - Stripe's auth hold limit)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create PaymentIntent with manual capture for the COMBINED amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalHoldAmountCents,
      currency: "cad",
      capture_method: "manual", // Authorization hold - not charged yet
      customer: stripeCustomerId || undefined,
      metadata: {
        type: "unified_rental_hold",
        booking_id: bookingId,
        booking_code: booking.booking_code,
        user_id: booking.user_id,
        rental_amount_cents: rentalAmountCents.toString(),
        deposit_amount_cents: depositAmountCents.toString(),
      },
      description: `Rental + Deposit - Booking ${booking.booking_code}`,
      statement_descriptor_suffix: `C2C ${booking.booking_code}`.substring(0, 22),
      // Payment method types that support manual capture
      payment_method_types: ["card"],
    });

    // Update booking with PaymentIntent details
    await supabase
      .from("bookings")
      .update({
        deposit_status: "requires_payment",
        stripe_deposit_pi_id: paymentIntent.id,
        stripe_deposit_client_secret: paymentIntent.client_secret,
        deposit_amount: depositAmount,
        deposit_expires_at: expiresAt,
        total_amount: rentalAmount, // Ensure total_amount is set correctly
      })
      .eq("id", bookingId);

    // Add ledger entry
    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      action: "unified_hold_created",
      amount: totalHoldAmount,
      created_by: booking.user_id,
      reason: `Unified authorization created at checkout (Rental: $${rentalAmount.toFixed(2)} + Deposit: $${depositAmount.toFixed(2)})`,
      stripe_pi_id: paymentIntent.id,
    });

    console.log(`Created unified checkout hold ${paymentIntent.id} for booking ${bookingId}: $${totalHoldAmount} (Rental: $${rentalAmount}, Deposit: $${depositAmount})`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        totalHoldAmount,
        depositAmount,
        rentalAmount,
        expiresAt,
        customerId: stripeCustomerId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
