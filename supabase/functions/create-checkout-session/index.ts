/**
 * create-checkout-session - Create Stripe Checkout Session for payment
 * 
 * Supports both authenticated users and guest checkout.
 * For guests, we pass userId in the request body since they don't have a session.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface CreateCheckoutSessionRequest {
  bookingId: string;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  userId?: string; // For guest checkout - passed from frontend
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("Stripe secret key not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      bookingId, 
      amount, 
      currency = "cad", 
      successUrl, 
      cancelUrl,
      userId: guestUserId,
    }: CreateCheckoutSessionRequest = await req.json();

    if (!bookingId || !amount || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to get authenticated user if auth header present
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }
    
    // For guest checkout, use the passed userId
    if (!userId && guestUserId) {
      userId = guestUserId;
      // Fetch guest user's email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", guestUserId)
        .single();
      if (profile) {
        userEmail = profile.email;
      }
    }

    // Verify booking exists and get details
    const bookingQuery = supabase
      .from("bookings")
      .select(`
        id, 
        user_id, 
        booking_code, 
        total_amount,
        total_days,
        start_at,
        end_at,
        vehicle_id,
        status
      `)
      .eq("id", bookingId);
    
    // If we have a user ID, verify ownership
    if (userId) {
      bookingQuery.eq("user_id", userId);
    }

    const { data: booking, error: bookingError } = await bookingQuery.single();

    if (bookingError || !booking) {
      console.error("Booking lookup error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate driver's license expiry against rental return date
    if (userId) {
      const { data: profileForLicense } = await supabase
        .from("profiles")
        .select("driver_license_expiry")
        .eq("id", userId)
        .single();
      
      if (profileForLicense?.driver_license_expiry) {
        const licenseExpiry = new Date(profileForLicense.driver_license_expiry);
        const rentalEnd = new Date(booking.end_at);
        if (licenseExpiry < rentalEnd) {
          return new Response(
            JSON.stringify({ 
              error: "license_expired",
              message: "Driver's license expires before the rental return date. Please update your license before proceeding."
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Use booking's user_id if we don't have one
    if (!userId) {
      userId = booking.user_id;
    }
    
    // Fetch user email if we still don't have it
    if (!userEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();
      if (profile) {
        userEmail = profile.email;
      }
    }

    // Fetch category info separately
    let vehicleDescription = "Vehicle Rental";
    if (booking.vehicle_id) {
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("name")
        .eq("id", booking.vehicle_id)
        .single();
      if (category) {
        vehicleDescription = category.name;
      }
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Check if user has a Stripe customer ID or create one
    let customerId: string | undefined;
    
    if (userEmail) {
      // Search for existing customer
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        // Fetch profile for name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();
        
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          name: profile?.full_name || undefined,
          metadata: {
            supabase_user_id: userId,
          },
        });
        customerId = customer.id;
      }
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Car Rental - ${vehicleDescription}`,
              description: `Booking ${booking.booking_code} | ${booking.total_days} day(s)`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        user_id: userId,
      },
      payment_intent_data: {
        metadata: {
          booking_id: bookingId,
          booking_code: booking.booking_code,
          user_id: userId,
        },
      },
    });

    console.log("Created checkout session:", session.id, "for booking:", bookingId);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-checkout-session:", message, error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (message.includes("not found") || message.includes("No such")) {
      statusCode = 404;
    } else if (message.includes("Invalid") || message.includes("Missing")) {
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
