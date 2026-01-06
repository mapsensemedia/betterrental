import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "it@cartok.ca";

interface NotifyAdminRequest {
  eventType: string;
  bookingId?: string;
  bookingCode?: string;
  customerName?: string;
  vehicleName?: string;
  details?: string;
}

async function sendWithResend(apiKey: string, subject: string, html: string) {
  console.log(`Sending admin notification to ${ADMIN_EMAIL}: ${subject}`);
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "C2C Rental System <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject,
      html,
    }),
  });

  const data = await response.json();
  console.log("Resend response:", data);
  return { ok: response.ok, data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { eventType, bookingId, bookingCode, customerName, vehicleName, details }: NotifyAdminRequest = await req.json();

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: "Missing eventType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin notification triggered: ${eventType}`, { bookingId, bookingCode, customerName });

    // Build email content based on event type
    let subject = "";
    let bodyContent = "";
    const timestamp = new Date().toLocaleString("en-US", { 
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short"
    });

    const bookingRef = bookingCode ? `<strong>${bookingCode}</strong>` : (bookingId ? `ID: ${bookingId.slice(0, 8)}...` : "N/A");

    switch (eventType) {
      case "new_booking":
        subject = `🚗 New Booking Created - ${bookingCode || "New"}`;
        bodyContent = `
          <p>A new booking has been created and requires attention.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
          </ul>
        `;
        break;

      case "license_uploaded":
        subject = `📋 License Uploaded - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A customer has uploaded their driver's license and it needs verification.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
          </ul>
          <p>Please review and verify the license in the admin panel.</p>
        `;
        break;

      case "agreement_signed":
        subject = `✍️ Agreement Signed - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A customer has signed their rental agreement.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
          </ul>
          <p>The agreement is ready for staff confirmation.</p>
        `;
        break;

      case "payment_received":
        subject = `💳 Payment Received - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A payment has been successfully processed.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Amount:</strong> ${details}</li>` : ""}
          </ul>
        `;
        break;

      case "issue_reported":
        subject = `⚠️ Issue Reported - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p><strong>A customer has reported an issue during their rental.</strong></p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please review this issue promptly.</p>
        `;
        break;

      case "ticket_created":
        subject = `🎫 New Support Ticket - ${bookingCode || "Customer"}`;
        bodyContent = `
          <p>A new support ticket has been submitted.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Subject:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please respond to this ticket in the admin panel.</p>
        `;
        break;

      case "damage_reported":
        subject = `🔴 Damage Reported - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p><strong>Vehicle damage has been reported.</strong></p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Description:</strong> ${details}</li>` : ""}
          </ul>
          <p>Immediate attention required.</p>
        `;
        break;

      default:
        subject = `📣 Admin Alert - ${eventType}`;
        bodyContent = `
          <p>An event occurred that requires admin attention.</p>
          <ul>
            <li><strong>Event:</strong> ${eventType}</li>
            ${bookingCode ? `<li><strong>Booking:</strong> ${bookingRef}</li>` : ""}
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
        `;
    }

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 20px 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: white; font-size: 20px;">C2C Rental - Admin Alert</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          ${bodyContent}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            Timestamp: ${timestamp}<br/>
            This is an automated notification from the C2C Rental system.
          </p>
        </div>
      </div>
    `;

    const result = await sendWithResend(resendApiKey, subject, html);

    // Log to notification_logs
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("notification_logs").insert({
      channel: "email",
      notification_type: `admin_${eventType}`,
      booking_id: bookingId || null,
      idempotency_key: `admin_${eventType}_${bookingId || "system"}_${Date.now()}`,
      status: result.ok ? "sent" : "failed",
      provider_id: result.data?.id || null,
      error_message: result.ok ? null : JSON.stringify(result.data),
      sent_at: result.ok ? new Date().toISOString() : null,
    });

    return new Response(
      JSON.stringify({ success: result.ok, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in notify-admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
