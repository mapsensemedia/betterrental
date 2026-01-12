import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  bookingId: string;
  action: "released" | "withheld";
  amount: number;
  reason?: string;
  withheldAmount?: number;
  releasedAmount?: number;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("Resend API key not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email service not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { 
      bookingId, 
      action, 
      amount, 
      reason,
      withheldAmount = 0,
      releasedAmount = 0,
    }: DepositNotificationRequest = await req.json();

    if (!bookingId || !action) {
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
        id, booking_code, deposit_amount, user_id,
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
      .select("email, full_name")
      .eq("id", booking.user_id)
      .single();

    let userEmail = profile?.email;
    let userName = profile?.full_name;
    
    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      userEmail = authUser?.user?.email;
      userName = authUser?.user?.user_metadata?.full_name || userName;
    }

    if (!userEmail) {
      console.log("No email for user:", booking.user_id);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No email on file" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vehicleData = booking.vehicles as any;
    const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
    const customerName = userName || "Valued Customer";
    const depositAmount = Number(booking.deposit_amount) || 0;

    // Build email content
    const isFullRelease = action === "released" && withheldAmount === 0;
    const isPartialRelease = withheldAmount > 0 && releasedAmount > 0;
    const isFullWithhold = action === "withheld" && releasedAmount === 0;

    let subject = "";
    let statusMessage = "";
    let detailsHtml = "";
    let statusColor = "";
    let statusIcon = "";

    if (isFullRelease) {
      subject = `Deposit Released - ${booking.booking_code}`;
      statusMessage = "Your security deposit has been fully released";
      statusColor = "#10b981";
      statusIcon = "✓";
      detailsHtml = `
        <tr>
          <td style="padding: 12px 0; color: #71717a; font-size: 14px;">Deposit Released</td>
          <td style="padding: 12px 0; color: #10b981; font-weight: 700; text-align: right; font-size: 18px;">$${releasedAmount.toFixed(2)}</td>
        </tr>
      `;
    } else if (isPartialRelease) {
      subject = `Deposit Processed - ${booking.booking_code}`;
      statusMessage = "Your security deposit has been processed";
      statusColor = "#f59e0b";
      statusIcon = "!";
      detailsHtml = `
        <tr>
          <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Amount Withheld</td>
          <td style="padding: 8px 0; color: #ef4444; font-weight: 600; text-align: right;">-$${withheldAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Amount Released</td>
          <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">$${releasedAmount.toFixed(2)}</td>
        </tr>
        ${reason ? `
        <tr>
          <td colspan="2" style="padding: 12px 0; font-size: 13px; color: #71717a; border-top: 1px solid #e4e4e7;">
            <strong>Reason for deduction:</strong> ${reason}
          </td>
        </tr>
        ` : ""}
      `;
    } else {
      subject = `Deposit Withheld - ${booking.booking_code}`;
      statusMessage = "Your security deposit has been withheld";
      statusColor = "#ef4444";
      statusIcon = "✕";
      detailsHtml = `
        <tr>
          <td style="padding: 12px 0; color: #71717a; font-size: 14px;">Amount Withheld</td>
          <td style="padding: 12px 0; color: #ef4444; font-weight: 700; text-align: right; font-size: 18px;">$${withheldAmount.toFixed(2)}</td>
        </tr>
        ${reason ? `
        <tr>
          <td colspan="2" style="padding: 12px 0; font-size: 13px; color: #71717a; border-top: 1px solid #e4e4e7;">
            <strong>Reason:</strong> ${reason}
          </td>
        </tr>
        ` : ""}
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">C2C Rental</h1>
            <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Premium Car Rentals</p>
          </div>
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; border-radius: 50%; background-color: ${statusColor}; color: white; font-size: 28px; font-weight: bold; line-height: 60px; margin: 0 auto 15px;">
                ${statusIcon}
              </div>
              <h2 style="margin: 0 0 10px; color: #18181b; font-size: 24px;">${statusMessage}</h2>
            </div>
            
            <p style="color: #52525b; line-height: 1.6; margin-bottom: 30px;">Hello ${customerName},</p>
            
            <p style="color: #52525b; line-height: 1.6;">
              We've processed the security deposit for your rental of the <strong>${vehicleName}</strong>.
            </p>

            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="margin: 0 0 15px; color: #18181b; font-size: 16px;">Deposit Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Booking Code</td>
                  <td style="padding: 8px 0; color: #18181b; font-weight: 600; text-align: right;">${booking.booking_code}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Original Deposit</td>
                  <td style="padding: 8px 0; color: #18181b; text-align: right;">$${depositAmount.toFixed(2)}</td>
                </tr>
                ${detailsHtml}
              </table>
            </div>

            ${isPartialRelease || isFullWithhold ? `
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                <strong>Questions about this deduction?</strong><br/>
                If you have questions or would like to dispute this charge, please contact us within 14 days and we'll be happy to review the details with you.
              </p>
            </div>
            ` : ""}

            <p style="color: #52525b; line-height: 1.6;">
              Thank you for choosing C2C Rental. We hope to see you again soon!
            </p>
          </div>
          <div style="background-color: #18181b; padding: 30px; text-align: center;">
            <p style="margin: 0 0 10px; color: white; font-size: 14px;">Questions? Contact us anytime</p>
            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© 2024 C2C Rental. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create idempotency key
    const idempotencyKey = `deposit_${bookingId}_${action}_${Date.now()}`;

    // Send email
    const emailResponse = await sendWithResend(resendApiKey, userEmail, subject, htmlContent);

    console.log("Deposit notification sent:", emailResponse);

    // Log the notification
    await supabase.from("notification_logs").insert({
      channel: "email",
      notification_type: `deposit_${action}`,
      booking_id: bookingId,
      user_id: booking.user_id,
      idempotency_key: idempotencyKey,
      status: emailResponse.ok ? "sent" : "failed",
      provider_id: emailResponse.data?.id || null,
      error_message: emailResponse.ok ? null : JSON.stringify(emailResponse.data),
      sent_at: emailResponse.ok ? new Date().toISOString() : null,
    });

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResponse.data);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email delivery failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-deposit-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
