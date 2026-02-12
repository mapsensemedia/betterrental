import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

/**
 * Create Payment Intent
 * 
 * Creates a standard Stripe PaymentIntent for authenticated users.
 * Amount is server-derived: booking.total_amount − sum of successful payments.
 * Staff/admin may pass overrideAmount, capped to amountDue.
 */

const NON_PAYABLE_STATUSES = ["cancelled", "completed"];

interface CreatePaymentIntentRequest {
  bookingId: string;
  overrideAmount?: number; // staff only, capped to amountDue
}

const jsonResp = (body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("Stripe secret key not configured");
      return jsonResp({ error: "Payment service not configured" }, 500, corsHeaders);
    }

    // --- Auth ---
    const auth = await validateAuth(req);
    if (!auth.authenticated || !auth.userId) {
      return jsonResp({ error: "Unauthorized", errorCode: "UNAUTHORIZED" }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId, overrideAmount }: CreatePaymentIntentRequest = await req.json();

    if (!bookingId) {
      return jsonResp({ error: "Missing bookingId" }, 400, corsHeaders);
    }

    // --- Fetch booking (no user_id filter yet — staff may act on others' bookings) ---
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, booking_code, total_amount, status, vehicle_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return jsonResp({ error: "Booking not found" }, 404, corsHeaders);
    }

    // --- Ownership or staff check ---
    const isStaff = await isAdminOrStaff(auth.userId);
    if (booking.user_id !== auth.userId && !isStaff) {
      return jsonResp({ error: "Unauthorized", errorCode: "UNAUTHORIZED" }, 403, corsHeaders);
    }

    // --- Block non-payable statuses ---
    if (NON_PAYABLE_STATUSES.includes(booking.status)) {
      return jsonResp(
        { error: `Booking is ${booking.status} and cannot accept payments`, errorCode: "BOOKING_NOT_PAYABLE" },
        409, corsHeaders,
      );
    }

    // --- Compute amountDue in integer cents to eliminate float drift ---
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("booking_id", bookingId)
      .eq("status", "completed")
      .eq("payment_type", "rental");

    const paidTotalCents = (payments || []).reduce((sum, p) => sum + Math.round((p.amount || 0) * 100), 0);
    const bookingTotalCents = Math.round(booking.total_amount * 100);
    const amountDueCents = bookingTotalCents - paidTotalCents;

    if (amountDueCents <= 0) {
      return jsonResp(
        { error: "No amount due on this booking", errorCode: "AMOUNT_DUE_ZERO", amountDue: 0 },
        409, corsHeaders,
      );
    }

    // --- Determine PI amount in cents (staff may override, capped) ---
    let piAmountCents = amountDueCents;
    if (overrideAmount !== undefined && isStaff) {
      const overrideCents = Math.round(overrideAmount * 100);
      piAmountCents = Math.min(Math.max(overrideCents, 50), amountDueCents); // min 50¢ Stripe floor
    }

    // --- Stripe customer upsert ---
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.user_id)
      .single();

    const customerEmail = profile?.email || auth.email;
    let customerId: string | undefined;

    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: booking.user_id },
      });
      customerId = customer.id;
    }

    // --- Create payment intent ---
    const paymentIntent = await stripe.paymentIntents.create({
      amount: piAmountCents,
      currency: "cad",
      customer: customerId,
      metadata: {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        user_id: booking.user_id,
      },
      automatic_payment_methods: { enabled: true },
    });

    const amountDueDollars = amountDueCents / 100;
    const amountChargedDollars = piAmountCents / 100;

    console.log(`[create-payment-intent] PI ${paymentIntent.id} for booking ${bookingId}: $${amountChargedDollars} of $${amountDueDollars} due`);

    return jsonResp({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountDue: amountDueDollars,
      amountCharged: amountChargedDollars,
    }, 200, corsHeaders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-payment-intent:", message);
    return jsonResp({ error: message }, 500, corsHeaders);
  }
});
