import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  bookingId: string;
  templateType: "confirmation" | "update" | "cancellation" | "reminder";
  forceResend?: boolean;
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
      console.error("Resend API key not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { bookingId, templateType, forceResend }: SendEmailRequest = await req.json();

    if (!bookingId || !templateType) {
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
        daily_rate, total_days, subtotal, tax_amount, deposit_amount,
        locations!inner (name, address, phone, email),
        vehicles!inner (make, model, year, image_url)
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

    // If no profile email, try to get email from auth.users
    let userEmail = profile?.email;
    let userName = profile?.full_name;
    
    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      userEmail = authUser?.user?.email;
      userName = authUser?.user?.user_metadata?.full_name || userName;
      console.log("Fetched email from auth.users:", userEmail);
    }

    if (!userEmail) {
      console.log("No email for user:", booking.user_id);
      return new Response(
        JSON.stringify({ error: "No email on file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create idempotency key (include hour for resend within same day)
    const idempotencyKey = forceResend 
      ? `email_${bookingId}_${templateType}_resend_${Date.now()}`
      : `email_${bookingId}_${templateType}_${new Date().toISOString().slice(0, 10)}`;

    // Check for existing notification (skip if forceResend)
    if (!forceResend) {
      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .single();

      if (existing) {
        console.log("Email already sent for this booking and template type today");
        return new Response(
          JSON.stringify({ message: "Email already sent", duplicate: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Format dates
    const startDate = new Date(booking.start_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const endDate = new Date(booking.end_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    // Access related data
    const vehicleData = booking.vehicles as any;
    const locationData = booking.locations as any;

    const vehicleName = `${vehicleData?.year} ${vehicleData?.make} ${vehicleData?.model}`;
    const locationName = locationData?.name || "our location";
    const locationAddress = locationData?.address || "";
    const customerName = userName || "Valued Customer";

    // Build email based on template
    let subject = "";
    let htmlContent = "";

    const headerStyle = `
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    `;

    const baseTemplate = (title: string, content: string, qrCodeUrl?: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="${headerStyle}">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">C2C Rental</h1>
            <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Premium Car Rentals</p>
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px;">${title}</h2>
            <p style="color: #52525b; line-height: 1.6; margin-bottom: 30px;">Hello ${customerName},</p>
            ${content}
            ${qrCodeUrl ? `
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f4f4f5; border-radius: 8px;">
              <h3 style="margin: 0 0 15px; color: #18181b; font-size: 16px;">Your Booking QR Code</h3>
              <img src="${qrCodeUrl}" alt="Booking QR Code" style="width: 150px; height: 150px; margin-bottom: 10px;" />
              <p style="margin: 0; font-size: 12px; color: #71717a;">Show this at pickup for faster check-in</p>
            </div>
            ` : ''}
            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="margin: 0 0 15px; color: #18181b; font-size: 16px;">Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Booking Code</td>
                  <td style="padding: 8px 0; color: #18181b; font-weight: 600; text-align: right;">${booking.booking_code}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Vehicle</td>
                  <td style="padding: 8px 0; color: #18181b; font-weight: 600; text-align: right;">${vehicleName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Pickup</td>
                  <td style="padding: 8px 0; color: #18181b; text-align: right; font-size: 13px;">${startDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Return</td>
                  <td style="padding: 8px 0; color: #18181b; text-align: right; font-size: 13px;">${endDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Location</td>
                  <td style="padding: 8px 0; color: #18181b; text-align: right; font-size: 13px;">${locationName}<br/><span style="color: #71717a;">${locationAddress}</span></td>
                </tr>
                <tr style="border-top: 1px solid #e4e4e7;">
                  <td style="padding: 12px 0 8px; color: #18181b; font-weight: 600;">Total</td>
                  <td style="padding: 12px 0 8px; color: #3b82f6; font-weight: 700; text-align: right; font-size: 18px;">$${booking.total_amount.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>
          <div style="background-color: #18181b; padding: 30px; text-align: center;">
            <p style="margin: 0 0 10px; color: white; font-size: 14px;">Questions? Contact us anytime</p>
            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">© 2024 C2C Rental. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate QR code URL using a public QR code service
    const qrData = encodeURIComponent(JSON.stringify({
      bookingCode: booking.booking_code,
      bookingId: booking.id,
    }));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

    switch (templateType) {
      case "confirmation":
        subject = `Booking Confirmed - ${booking.booking_code}`;
        htmlContent = baseTemplate(
          "Your Booking is Confirmed!",
          `<p style="color: #52525b; line-height: 1.6;">Great news! Your reservation has been confirmed. We're excited to have you drive with us.</p>
           
           <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
             <h4 style="margin: 0 0 10px; color: #92400e; font-size: 14px;">⚠️ Action Required: Upload Your Driver's License</h4>
             <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
               To expedite your pickup, please upload clear photos of the front and back of your driver's license. 
               You can do this by logging into your account or replying to this email with the images attached.
             </p>
           </div>
           
           <p style="color: #52525b; line-height: 1.6;">Please bring a valid driver's license and the credit card used for booking when you arrive for pickup.</p>`,
          qrCodeUrl
        );
        break;
      case "update":
        subject = `Booking Updated - ${booking.booking_code}`;
        htmlContent = baseTemplate(
          "Your Booking Has Been Updated",
          `<p style="color: #52525b; line-height: 1.6;">Your booking details have been updated. Please review the changes below.</p>`,
          qrCodeUrl
        );
        break;
      case "cancellation":
        subject = `Booking Cancelled - ${booking.booking_code}`;
        htmlContent = baseTemplate(
          "Booking Cancelled",
          `<p style="color: #52525b; line-height: 1.6;">Your booking has been cancelled. If you didn't request this cancellation, please contact us immediately.</p>
           <p style="color: #52525b; line-height: 1.6;">We hope to see you again soon!</p>`
        );
        break;
      case "reminder":
        subject = `Pickup Tomorrow - ${booking.booking_code}`;
        htmlContent = baseTemplate(
          "Your Pickup is Tomorrow!",
          `<p style="color: #52525b; line-height: 1.6;">Just a friendly reminder that your vehicle pickup is scheduled for tomorrow.</p>
           <p style="color: #52525b; line-height: 1.6;">Don't forget to bring your driver's license and the credit card used for booking.</p>`,
          qrCodeUrl
        );
        break;
    }

    // Send email via Resend
    const emailResponse = await sendWithResend(resendApiKey, userEmail, subject, htmlContent);

    console.log("Resend response:", emailResponse);

    // Log the notification
    await supabase.from("notification_logs").insert({
      channel: "email",
      notification_type: templateType,
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
      // Return success with warning so booking flow continues
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email delivery failed", details: emailResponse.data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-booking-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
