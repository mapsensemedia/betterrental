/**
 * create-checkout-session - Create Stripe Checkout Session for payment
 * 
 * SECURITY (PR8):
 * - Auth user: booking.user_id must match
 * - Guest: must provide valid accessToken (minted via OTP flow)
 * - Amount from DB only
 * - pay-now → total_amount; hold/deposit → deposit_amount
 */
import Stripe from "npm:stripe@14.21.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bookingId, accessToken, successUrl, cancelUrl } = await req.json();

    if (!bookingId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Determine auth identity
    const auth = await validateAuth(req);
    const authUserId = auth.authenticated ? auth.userId ?? null : null;

    // SECURITY: Verify ownership via auth OR access token
    const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);

    const supabase = getAdminClient();
    const userId = booking.user_id;

    // Use server-side amount from booking (never from client)
    const amount = booking.total_amount;

    // Validate driver's license expiry against rental return date
    if (authUserId) {
      const { data: profileForLicense } = await supabase
        .from("profiles")
        .select("driver_license_expiry")
        .eq("id", authUserId)
        .single();
      
      const { data: bookingDates } = await supabase
        .from("bookings")
        .select("end_at")
        .eq("id", bookingId)
        .single();

      if (profileForLicense?.driver_license_expiry && bookingDates) {
        const licenseExpiry = new Date(profileForLicense.driver_license_expiry);
        const rentalEnd = new Date(bookingDates.end_at);
        if (licenseExpiry < rentalEnd) {
          return new Response(
            JSON.stringify({ 
              error: "license_expired",
              message: "Driver's license expires before the rental return date."
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fetch user email for Stripe customer
    let userEmail: string | null = null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();
    
    if (profile) {
      userEmail = profile.email;
    }

    // Fetch booking details for description
    const { data: bookingFull } = await supabase
      .from("bookings")
      .select("vehicle_id, booking_code, total_days, location_id")
      .eq("id", bookingId)
      .single();

    let vehicleDescription = "Vehicle Rental";
    if (bookingFull?.vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("make, model, year")
        .eq("id", bookingFull.vehicle_id)
        .single();
      if (vehicle) {
        vehicleDescription = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      }
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get or create Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: profile?.full_name || undefined,
          metadata: { supabase_user_id: userId },
        });
        customerId = customer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "cad",
          product_data: {
            name: `Car Rental - ${vehicleDescription}`,
            description: `Booking ${booking.booking_code} | ${bookingFull?.total_days || 1} day(s)`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        user_id: userId,
        payment_type: "rental",
        location_id: bookingFull?.location_id || "",
      },
      payment_intent_data: {
        metadata: {
          booking_id: bookingId,
          booking_code: booking.booking_code,
          user_id: userId,
          payment_type: "rental",
          location_id: bookingFull?.location_id || "",
        },
      },
    });

    console.log("Created checkout session:", session.id, "for booking:", bookingId, "amount:", amount);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-checkout-session:", message, error);
    
    let statusCode = 500;
    if (message.includes("not found")) statusCode = 404;
    else if (message.includes("Invalid") || message.includes("Missing")) statusCode = 400;
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
