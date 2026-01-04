import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfirmationParams {
  bookingId: string;
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

    const { bookingId }: PaymentConfirmationParams = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, total_amount, deposit_amount, start_at, user_id,
        locations!inner (name, address),
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

    // Fetch total paid and deposit held
    const { data: payments } = await supabase
      .from("payments")
      .select("amount, payment_type, status")
      .eq("booking_id", bookingId)
      .eq("status", "completed");

    const totalPaid = (payments || [])
      .filter(p => p.payment_type === "rental")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const depositHeld = (payments || [])
      .filter(p => p.payment_type === "deposit")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone, full_name")
      .eq("id", booking.user_id)
      .maybeSingle();

    let userEmail = profile?.email;
    let userPhone = profile?.phone;
    let userName = profile?.full_name || "Customer";

    // Fallback to auth.users
    if (!userEmail || !userPhone) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      if (authUser?.user) {
        userEmail = userEmail || authUser.user.email;
        userPhone = userPhone || authUser.user.user_metadata?.phone;
        userName = userName || authUser.user.user_metadata?.full_name || "Customer";
      }
    }

    const vehicleData = booking.vehicles as any;
    const locationData = booking.locations as any;
    const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
    const locationName = locationData?.name || "our location";

    const startDate = new Date(booking.start_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const results: { email?: boolean; sms?: boolean } = {};

    // Send email confirmation
    if (resendApiKey && userEmail) {
      const idempotencyKey = `payment_confirmation_email_${bookingId}_${new Date().toISOString().slice(0, 10)}`;

      // Check if already sent today
      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (!existing) {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 28px;">Payment Confirmed!</h1>
                <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Thank you for your payment</p>
              </div>
              <div style="padding: 40px 30px;">
                <p style="color: #52525b; line-height: 1.6;">Hello ${userName},</p>
                <p style="color: #52525b; line-height: 1.6;">
                  Great news! Your payment has been received and your booking is all set.
                </p>
                <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Booking Code</td>
                      <td style="padding: 8px 0; color: #18181b; font-weight: 600; text-align: right;">${booking.booking_code}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Vehicle</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${vehicleName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Pickup</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${startDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Location</td>
                      <td style="padding: 8px 0; color: #18181b; text-align: right;">${locationName}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e4e4e7;">
                      <td style="padding: 12px 0 8px; color: #18181b; font-weight: 600;">Total Paid</td>
                      <td style="padding: 12px 0 8px; color: #22c55e; font-weight: 700; text-align: right; font-size: 18px;">$${totalPaid.toFixed(2)}</td>
                    </tr>
                    ${depositHeld > 0 ? `
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Deposit Held</td>
                      <td style="padding: 8px 0; color: #3b82f6; font-weight: 600; text-align: right;">$${depositHeld.toFixed(2)}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                <p style="color: #52525b; line-height: 1.6;">
                  Please bring your driver's license when you arrive for pickup. We look forward to seeing you!
                </p>
              </div>
              <div style="background-color: #18181b; padding: 30px; text-align: center;">
                <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© 2024 LuxeRide. All rights reserved.</p>
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
            from: "LuxeRide <onboarding@resend.dev>",
            to: [userEmail],
            subject: `Payment Confirmed - ${booking.booking_code}`,
            html: emailHtml,
          }),
        });

        const emailData = await emailRes.json();

        await supabase.from("notification_logs").insert({
          channel: "email",
          notification_type: "payment_confirmation",
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
    }

    // Send SMS confirmation
    if (twilioSid && twilioToken && twilioFrom && userPhone) {
      const idempotencyKey = `payment_confirmation_sms_${bookingId}_${new Date().toISOString().slice(0, 10)}`;

      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (!existing) {
        const smsMessage = `LuxeRide: Payment of $${totalPaid.toFixed(2)} confirmed for booking ${booking.booking_code}. ${depositHeld > 0 ? `Deposit: $${depositHeld.toFixed(2)} held. ` : ''}Pickup: ${startDate} at ${locationName}. See you soon!`;

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
          notification_type: "payment_confirmation",
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
    }

    console.log("Payment confirmation sent:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-payment-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
