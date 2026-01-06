import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendAgreementNotificationRequest {
  bookingId: string;
  notificationType: "agreement_ready" | "license_verified" | "payment_received" | "pickup_ready";
}

async function sendWithResend(apiKey: string, to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "C2C Rental <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

async function sendSmsWithTwilio(
  sid: string,
  token: string,
  from: string,
  to: string,
  message: string
) {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const authHeader = btoa(`${sid}:${token}`);

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: message,
    }),
  });

  const data = await response.json();
  return { ok: response.ok, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { bookingId, notificationType }: SendAgreementNotificationRequest = await req.json();

    if (!bookingId || !notificationType) {
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
        id, booking_code, start_at, end_at, status, total_amount, user_id,
        locations!inner (name, address),
        vehicles!inner (make, model, year)
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

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone")
      .eq("id", booking.user_id)
      .single();

    let userEmail = profile?.email;
    let userName = profile?.full_name;
    let userPhone = profile?.phone;

    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      userEmail = authUser?.user?.email;
      userName = authUser?.user?.user_metadata?.full_name || userName;
      userPhone = userPhone || authUser?.user?.user_metadata?.phone;
    }

    const vehicleData = booking.vehicles as any;
    const locationData = booking.locations as any;
    const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
    const customerName = userName || "Valued Customer";

    // Build notification content based on type
    let emailSubject = "";
    let emailContent = "";
    let smsMessage = "";

    const headerStyle = `
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 30px;
      text-align: center;
      color: white;
    `;

    switch (notificationType) {
      case "agreement_ready":
        emailSubject = `Action Required: Sign Your Rental Agreement - ${booking.booking_code}`;
        emailContent = `
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">C2C Rental</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #18181b;">Your Rental Agreement is Ready!</h2>
              <p>Hello ${customerName},</p>
              <p>Your rental agreement for booking <strong>${booking.booking_code}</strong> is now ready for your digital signature.</p>
              
              <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #166534;"><strong>Vehicle:</strong> ${vehicleName}</p>
                <p style="margin: 5px 0 0; color: #166534;"><strong>Location:</strong> ${locationData?.name}</p>
              </div>
              
              <p><strong>Please sign digitally to skip paperwork at pickup:</strong></p>
              <p>Log into your C2C Rental account to review and sign your agreement electronically. This will save you time during vehicle pickup!</p>
              
              <p style="margin-top: 30px; color: #71717a; font-size: 12px;">Questions? Contact us anytime.</p>
            </div>
          </div>
        `;
        smsMessage = `C2C Rental: Your rental agreement for booking ${booking.booking_code} is ready! Please sign digitally to skip paperwork at pickup. Check your email for details.`;
        break;

      case "license_verified":
        emailSubject = `Driver's License Verified - ${booking.booking_code}`;
        emailContent = `
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">C2C Rental</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #18181b;">✓ Your License Has Been Verified!</h2>
              <p>Hello ${customerName},</p>
              <p>Great news! Your driver's license for booking <strong>${booking.booking_code}</strong> has been verified successfully.</p>
              <p>Your rental agreement is now being prepared. You'll receive another notification once it's ready for your digital signature.</p>
            </div>
          </div>
        `;
        smsMessage = `C2C Rental: Your driver's license has been verified for booking ${booking.booking_code}. Agreement coming soon!`;
        break;

      case "payment_received":
        emailSubject = `Payment Confirmed - ${booking.booking_code}`;
        emailContent = `
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">C2C Rental</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #18181b;">💳 Payment Received!</h2>
              <p>Hello ${customerName},</p>
              <p>We've received your payment for booking <strong>${booking.booking_code}</strong>.</p>
              <p><strong>Amount:</strong> $${booking.total_amount.toFixed(2)}</p>
              <p>Your vehicle will be ready for pickup as scheduled. Thank you!</p>
            </div>
          </div>
        `;
        smsMessage = `C2C Rental: Payment of $${booking.total_amount.toFixed(2)} received for booking ${booking.booking_code}. Thank you!`;
        break;

      case "pickup_ready":
        emailSubject = `Your Vehicle is Ready - ${booking.booking_code}`;
        emailContent = `
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <div style="${headerStyle}">
              <h1 style="margin: 0; font-size: 24px;">C2C Rental</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #18181b;">🚗 Your Vehicle is Ready!</h2>
              <p>Hello ${customerName},</p>
              <p>Your <strong>${vehicleName}</strong> is ready and waiting for you at <strong>${locationData?.name}</strong>!</p>
              <p>Just show your booking code at the counter: <strong style="font-size: 18px; color: #3b82f6;">${booking.booking_code}</strong></p>
              <p>Safe travels!</p>
            </div>
          </div>
        `;
        smsMessage = `C2C Rental: Your ${vehicleName} is ready at ${locationData?.name}! Show code ${booking.booking_code} at pickup. Safe travels!`;
        break;
    }

    const results = { email: null as any, sms: null as any };

    // Send email if configured
    if (resendApiKey && userEmail) {
      const emailResult = await sendWithResend(resendApiKey, userEmail, emailSubject, emailContent);
      results.email = emailResult;
      console.log("Email result:", emailResult);
    }

    // Send SMS if configured
    if (twilioSid && twilioToken && twilioFrom && userPhone) {
      const smsResult = await sendSmsWithTwilio(twilioSid, twilioToken, twilioFrom, userPhone, smsMessage);
      results.sms = smsResult;
      console.log("SMS result:", smsResult);
    }

    // Log notifications
    const logs = [];
    if (results.email) {
      logs.push({
        channel: "email",
        notification_type: notificationType,
        booking_id: bookingId,
        user_id: booking.user_id,
        idempotency_key: `email_${bookingId}_${notificationType}_${Date.now()}`,
        status: results.email.ok ? "sent" : "failed",
        provider_id: results.email.data?.id || null,
        error_message: results.email.ok ? null : JSON.stringify(results.email.data),
        sent_at: results.email.ok ? new Date().toISOString() : null,
      });
    }
    if (results.sms) {
      logs.push({
        channel: "sms",
        notification_type: notificationType,
        booking_id: bookingId,
        user_id: booking.user_id,
        idempotency_key: `sms_${bookingId}_${notificationType}_${Date.now()}`,
        status: results.sms.ok ? "sent" : "failed",
        provider_id: results.sms.data?.sid || null,
        error_message: results.sms.ok ? null : JSON.stringify(results.sms.data),
        sent_at: results.sms.ok ? new Date().toISOString() : null,
      });
    }

    if (logs.length > 0) {
      await supabase.from("notification_logs").insert(logs);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-agreement-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
