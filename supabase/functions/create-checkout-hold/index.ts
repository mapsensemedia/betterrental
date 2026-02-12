import Stripe from "npm:stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { requireBookingOwnerOrOtp } from "../_shared/booking-core.ts";

/**
 * Create Checkout Payment (Hold/PaymentIntent)
 * 
 * SECURITY (PR7):
 * - Auth user: booking.user_id must match
 * - Guest: must provide valid otpCode (not booking_code)
 * - Amount from DB only — never from client
 */

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe not configured");
    }

    const { bookingId, otpCode } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Determine auth identity
    const auth = await validateAuth(req);
    const authUserId = auth.authenticated ? auth.userId ?? null : null;

    // SECURITY: Verify ownership via auth OR OTP (not booking_code)
    const booking = await requireBookingOwnerOrOtp(bookingId, authUserId, otpCode);

    // Use server-side amount — NEVER from client
    const amount = booking.total_amount;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const supabase = getAdminClient();

    // Idempotency check
    const { data: bookingFull } = await supabase
      .from("bookings")
      .select("booking_code, user_id, stripe_deposit_pi_id")
      .eq("id", bookingId)
      .single();

    if (bookingFull?.stripe_deposit_pi_id) {
      try {
        const existingPI = await stripe.paymentIntents.retrieve(bookingFull.stripe_deposit_pi_id);
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
      const existingCustomers = await stripe.customers.list({ email: profile.email, limit: 1 });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: profile.email,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined,
          phone: profile.phone || undefined,
          metadata: { user_id: booking.user_id, source: "c2c_rental_checkout" },
        });
        stripeCustomerId = newCustomer.id;
      }
    }

    const amountCents = Math.round(amount * 100);

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
