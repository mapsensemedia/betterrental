import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequestParams {
  bookingId: string;
  amount: number;
  channel: "email" | "sms" | "both";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

    const { bookingId, amount, channel }: PaymentRequestParams = await req.json();

    if (!bookingId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Generate a simple payment link (in production, this would link to a payment page)
    const paymentLink = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/checkout?booking=${booking.booking_code}&amount=${amount}`;

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
              <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Pay Now
                </a>
              </div>
              <p style="color: #71717a; font-size: 12px; text-align: center;">
                If you've already made this payment, please disregard this message.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

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
    }

    // Send SMS if requested
    if ((channel === "sms" || channel === "both") && twilioSid && twilioToken && twilioFrom && userPhone) {
      const idempotencyKey = `payment_request_sms_${bookingId}_${Date.now()}`;

      const smsMessage = `C2C Rental: Payment of $${amount.toFixed(2)} is due for booking ${booking.booking_code}. Pay now: ${paymentLink}`;

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
          new_data: { amount, channel, results },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
