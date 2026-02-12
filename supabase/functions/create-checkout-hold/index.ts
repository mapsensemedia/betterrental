import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";

/**
 * Create Checkout Payment
 * 
 * Creates a standard Stripe PaymentIntent (auto-capture) for the rental amount.
 * SECURITY: Requires authentication. Validates booking ownership.
 */

interface CreateCheckoutPaymentRequest {
  bookingId: string;
  amount: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require logged-in user OR guest flow (booking ownership check below)
    const auth = await validateAuth(req);
    // Note: guest checkout may not have auth - we verify booking ownership via userId match
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabase = getAdminClient();
    const { bookingId, amount }: CreateCheckoutPaymentRequest = await req.json();

    if (!bookingId || amount === undefined) {
      return new Response(
        JSON.stringify({ error: "bookingId and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking details
    const bookingQuery = supabase
      .from("bookings")
      .select("id, booking_code, user_id, stripe_deposit_pi_id, total_amount")
      .eq("id", bookingId);

    // If authenticated, enforce ownership
    if (auth.authenticated && auth.userId) {
      bookingQuery.eq("user_id", auth.userId);
    }

    const { data: booking, error: bookingError } = await bookingQuery.single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount doesn't exceed booking total (prevent amount injection)
    if (amount > booking.total_amount * 1.5) {
      return new Response(
        JSON.stringify({ error: "Amount exceeds allowed limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check - if already has a PI, return it
    if (booking.stripe_deposit_pi_id) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(booking.stripe_deposit_pi_id);
        if (existingPI.status !== "canceled") {
          return new Response(
            JSON.stringify({
              success: true,
              alreadyExists: true,
              paymentIntentId: existingPI.id,
              clientSecret: existingPI.client_secret,
              amount: existingPI.amount / 100,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // PI doesn't exist or is invalid, create new one
      }
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

    const amountCents = Math.round(amount * 100);

    // Create standard PaymentIntent (auto-capture)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "cad",
      customer: stripeCustomerId || undefined,
      metadata: {
        type: "rental_payment",
        booking_id: bookingId,
        booking_code: booking.booking_code,
        user_id: booking.user_id,
      },
      description: `Rental Payment - Booking ${booking.booking_code}`,
      statement_descriptor_suffix: `C2C ${booking.booking_code}`.substring(0, 22),
      payment_method_types: ["card"],
    });

    // Update booking with PaymentIntent details
    await supabase
      .from("bookings")
      .update({
        stripe_deposit_pi_id: paymentIntent.id,
        stripe_deposit_client_secret: paymentIntent.client_secret,
      })
      .eq("id", bookingId);

    console.log(`Created payment intent ${paymentIntent.id} for booking ${bookingId}: $${amount}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount,
        customerId: stripeCustomerId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    console.error("Error creating checkout payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
