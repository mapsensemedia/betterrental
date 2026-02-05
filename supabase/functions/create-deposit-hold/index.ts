import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Create Deposit Hold
 * 
 * Creates a Stripe PaymentIntent with capture_method: manual
 * This authorizes funds on the customer's card without charging
 * The hold can later be captured (charged) or released (cancelled)
 */

interface CreateDepositHoldRequest {
  bookingId: string;
  amount?: number; // Optional - uses booking.deposit_amount if not provided
  customerId?: string; // Stripe customer ID if available
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

    const { bookingId, amount, customerId }: CreateDepositHoldRequest = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
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
        deposit_expires_at,
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

    // Idempotency check - if already authorized, return existing PaymentIntent
    if (booking.deposit_status === "authorized" && booking.stripe_deposit_pi_id) {
      console.log(`Deposit already authorized for booking ${bookingId}`);
      
      // Retrieve existing PaymentIntent to return client secret
      const existingPI = await stripe.paymentIntents.retrieve(booking.stripe_deposit_pi_id);
      
      return new Response(
        JSON.stringify({
          success: true,
          alreadyAuthorized: true,
          paymentIntentId: existingPI.id,
          clientSecret: existingPI.client_secret,
          amount: existingPI.amount / 100,
          expiresAt: booking.deposit_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate deposit amount
    const depositAmount = amount || booking.deposit_amount || 350; // Default $350
    const depositAmountCents = Math.round(depositAmount * 100);

    // Get user profile for customer details
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name, last_name, phone")
      .eq("id", booking.user_id)
      .single();

    // Get or create Stripe customer
    let stripeCustomerId = customerId;
    
    if (!stripeCustomerId && profile?.email) {
      // Search for existing customer
      const existingCustomers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        // Create new customer
        const newCustomer = await stripe.customers.create({
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined,
          phone: profile.phone || undefined,
          metadata: {
            user_id: booking.user_id,
            source: "c2c_rental",
          },
        });
        stripeCustomerId = newCustomer.id;
      }
    }

    // Update booking to "authorizing" state
    await supabase
      .from("bookings")
      .update({ deposit_status: "authorizing" })
      .eq("id", bookingId);

    // Create PaymentIntent with manual capture (authorization hold)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: depositAmountCents,
      currency: "cad",
      capture_method: "manual", // THIS IS THE KEY - creates auth hold
      customer: stripeCustomerId || undefined,
      metadata: {
        type: "deposit_hold",
        booking_id: bookingId,
        booking_code: booking.booking_code,
        user_id: booking.user_id,
      },
      description: `Security Deposit - Booking ${booking.booking_code}`,
      statement_descriptor_suffix: `DEP ${booking.booking_code}`.substring(0, 22),
    });

    // Calculate expiration (7 days from now - Stripe's auth hold limit)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Update booking with PaymentIntent details
    await supabase
      .from("bookings")
      .update({
        deposit_status: "requires_payment",
        stripe_deposit_pi_id: paymentIntent.id,
        stripe_deposit_client_secret: paymentIntent.client_secret,
        deposit_amount: depositAmount,
        deposit_expires_at: expiresAt,
      })
      .eq("id", bookingId);

    // Add ledger entry
    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      action: "stripe_hold",
      amount: depositAmount,
      created_by: booking.user_id,
      reason: "Deposit authorization hold initiated",
      stripe_pi_id: paymentIntent.id,
    });

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "deposit_hold_created",
      entity_type: "booking",
      entity_id: bookingId,
      new_data: {
        payment_intent_id: paymentIntent.id,
        amount: depositAmount,
        expires_at: expiresAt,
      },
    });

    console.log(`Created deposit hold ${paymentIntent.id} for booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: depositAmount,
        expiresAt,
        customerId: stripeCustomerId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating deposit hold:", error);
    
    // Update booking status to failed if we have the bookingId
    try {
      const { bookingId } = await req.clone().json();
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ deposit_status: "failed" })
          .eq("id", bookingId);
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
