import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow, AuthError, authErrorResponse } from "../_shared/auth.ts";

interface PaymentRequestParams {
  bookingId: string;
  amount: number;
  channel: "email" | "sms" | "both";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Only admin/staff can send payment requests
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId, ["admin", "staff"], corsHeaders);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
    throw err;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    const { bookingId, amount, channel }: PaymentRequestParams = await req.json();

    if (!bookingId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, total_amount, user_id,
        locations!inner (name),
        vehicles!inner (make, model, year)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone, full_name")
      .eq("id", booking.user_id)
      .maybeSingle();

    let userEmail = profile?.email;
    let userPhone = profile?.phone;
    let userName = profile?.full_name || "Customer";

    // Fallback to auth.users if needed
    if (!userEmail || !userPhone) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      if (authUser?.user) {
        userEmail = userEmail || authUser.user.email;
        userPhone = userPhone || authUser.user.user_metadata?.phone;
        userName = userName || authUser.user.user_metadata?.full_name || "Customer";
      }
    }

    const vehicleData = booking.vehicles as any;
    const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
    const locationData = booking.locations as any;

    // Create Stripe Checkout Session for payment request
    console.log("Creating Stripe Checkout Session for payment request...");

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: userEmail,
          name: userName,
          phone: userPhone || undefined,
          metadata: { booking_id: bookingId, booking_code: booking.booking_code },
        });
        customerId = newCustomer.id;
      }
    }

    // Determine success and cancel URLs
    const baseUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Payment Request - ${booking.booking_code}`,
              description: `${vehicleName} rental at ${locationData?.name || "our location"}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/my-booking/${booking.booking_code}?payment=success`,
      cancel_url: `${baseUrl}/my-booking/${booking.booking_code}?payment=cancelled`,
      metadata: {
        booking_id: bookingId,
        booking_code: booking.booking_code,
        payment_type: "payment_request",
        requested_amount: amount.toString(),
      },
    });

    const paymentLink = session.url;
    console.log("Stripe Checkout Session created:", session.id);

    const results: { email?: boolean; sms?: boolean } = {};

    // Send email if requested
    if ((channel === "email" || channel === "both") && resendApiKey && userEmail) {
      const idempotencyKey = `payment_request_email_${bookingId}_${Date.now()}`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">Payment Request</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #52525b; line-height: 1.6;">Hello ${userName},</p>
              <p style="color: #52525b; line-height: 1.6;">
                We have a payment request for your booking <strong>${booking.booking_code}</strong>.
              </p>
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">Amount Due</p>
                <p style="margin: 0; color: #18181b; font-size: 32px; font-weight: 700;">$${amount.toFixed(2)}</p>
              </div>
              <p style="color: #52525b; line-height: 1.6;">
                <strong>Vehicle:</strong> ${vehicleName}
              </p>
              <p style="color: #52525b; line-height: 1.6;">
                <strong>Location:</strong> ${locationData?.name || "Our rental center"}
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Pay Now Securely
                </a>
              </div>
              <p style="color: #71717a; font-size: 12px; text-align: center;">
                This is a secure payment powered by Stripe. If you've already made this payment, please disregard this message.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "C2C Rental <onboarding@resend.dev>",
            to: [userEmail],
            subject: `Payment Request - $${amount.toFixed(2)} - ${booking.booking_code}`,
            html: emailHtml,
          }),
        });

        const emailData = await emailRes.json();

        await supabase.from("notification_logs").insert({
          channel: "email",
          notification_type: "payment_request",
          booking_id: bookingId,
          user_id: booking.user_id,
          idempotency_key: idempotencyKey,
          status: emailRes.ok ? "sent" : "failed",
          provider_id: emailData?.id || null,
          error_message: emailRes.ok ? null : JSON.stringify(emailData),
          sent_at: emailRes.ok ? new Date().toISOString() : null,
        });

        results.email = emailRes.ok;
        console.log("Email sent:", emailRes.ok);
      } catch (emailError) {
        console.error("Email error:", emailError);
        results.email = false;
      }
    }

    // Send SMS if requested
    if ((channel === "sms" || channel === "both") && twilioSid && twilioToken && twilioFrom && userPhone) {
      const idempotencyKey = `payment_request_sms_${bookingId}_${Date.now()}`;

      const smsMessage = `C2C Rental: Payment of $${amount.toFixed(2)} is due for booking ${booking.booking_code}. Pay securely: ${paymentLink}`;

      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const authHeader = btoa(`${twilioSid}:${twilioToken}`);

        const smsRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: userPhone,
            From: twilioFrom,
            Body: smsMessage,
          }),
        });

        const smsData = await smsRes.json();

        await supabase.from("notification_logs").insert({
          channel: "sms",
          notification_type: "payment_request",
          booking_id: bookingId,
          user_id: booking.user_id,
          idempotency_key: idempotencyKey,
          status: smsRes.ok ? "sent" : "failed",
          provider_id: smsData?.sid || null,
          error_message: smsRes.ok ? null : JSON.stringify(smsData),
          sent_at: smsRes.ok ? new Date().toISOString() : null,
        });

        results.sms = smsRes.ok;
        console.log("SMS sent:", smsRes.ok);
      } catch (smsError) {
        console.error("SMS error:", smsError);
        results.sms = false;
      }
    }

    // Log to audit
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) {
        await supabase.from("audit_logs").insert({
          action: "payment_request_sent",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: user.id,
          new_data: { amount, channel, results, stripe_session_id: session.id },
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results, 
        paymentLink,
        sessionId: session.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-payment-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});