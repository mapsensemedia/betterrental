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
    let priority = "normal"; // normal, high, urgent
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
          <p><a href="https://betterrental.lovable.app/admin/bookings" style="color: #2563eb;">View in Admin Panel →</a></p>
        `;
        break;

      case "license_uploaded":
        subject = `📋 License Uploaded - Verification Needed`;
        bodyContent = `
          <p>A customer has uploaded their driver's license and it needs verification.</p>
          <ul>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please review and verify the license in the admin panel.</p>
          <p><a href="https://betterrental.lovable.app/admin/verifications" style="color: #2563eb;">Review Verifications →</a></p>
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
          <p><a href="https://betterrental.lovable.app/admin/bookings" style="color: #2563eb;">View Booking →</a></p>
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
        priority = "high";
        subject = `⚠️ Issue Reported - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p><strong style="color: #dc2626;">A customer has reported an issue during their rental.</strong></p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please review this issue promptly.</p>
          <p><a href="https://betterrental.lovable.app/admin/alerts" style="color: #2563eb;">View Alerts →</a></p>
        `;
        break;

      case "ticket_created":
        subject = `🎫 New Support Ticket - ${bookingCode || customerName || "Customer"}`;
        bodyContent = `
          <p>A new support ticket has been submitted.</p>
          <ul>
            ${bookingCode ? `<li><strong>Booking:</strong> ${bookingRef}</li>` : ""}
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Subject:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please respond to this ticket in the admin panel.</p>
          <p><a href="https://betterrental.lovable.app/admin/tickets" style="color: #2563eb;">View Tickets →</a></p>
        `;
        break;

      case "damage_reported":
        priority = "urgent";
        subject = `🔴 DAMAGE REPORTED - ${bookingCode || vehicleName || "Vehicle"}`;
        bodyContent = `
          <p><strong style="color: #dc2626;">Vehicle damage has been reported. Immediate attention required.</strong></p>
          <ul>
            ${bookingCode ? `<li><strong>Booking:</strong> ${bookingRef}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Description:</strong> ${details}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/damages" style="color: #2563eb;">View Damage Reports →</a></p>
        `;
        break;

      case "late_return":
        priority = "high";
        subject = `⏰ Late Return Alert - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p><strong style="color: #f59e0b;">A vehicle return is late.</strong></p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please contact the customer or take appropriate action.</p>
          <p><a href="https://betterrental.lovable.app/admin/active-rentals" style="color: #2563eb;">View Active Rentals →</a></p>
        `;
        break;

      case "overdue":
        priority = "urgent";
        subject = `🚨 OVERDUE RENTAL - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p><strong style="color: #dc2626;">A rental is significantly overdue. Urgent action required.</strong></p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/active-rentals" style="color: #2563eb;">View Active Rentals →</a></p>
        `;
        break;

      case "rental_activated":
        subject = `✅ Rental Activated - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A rental has been successfully activated and is now in progress.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/active-rentals" style="color: #2563eb;">View Active Rentals →</a></p>
        `;
        break;

      case "return_completed":
        subject = `🏁 Rental Completed - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A rental has been completed and the vehicle returned.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${details ? `<li><strong>Notes:</strong> ${details}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/history" style="color: #2563eb;">View History →</a></p>
        `;
        break;

      case "verification_pending":
        subject = `📝 Verification Pending - ${customerName || "Customer"}`;
        bodyContent = `
          <p>A customer document is pending verification.</p>
          <ul>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${bookingCode ? `<li><strong>Booking:</strong> ${bookingRef}</li>` : ""}
            ${details ? `<li><strong>Document:</strong> ${details}</li>` : ""}
          </ul>
          <p>Please review and verify in the admin panel.</p>
          <p><a href="https://betterrental.lovable.app/admin/verifications" style="color: #2563eb;">View Verifications →</a></p>
        `;
        break;

      case "hold_expiring":
        subject = `⏳ Hold Expiring Soon - ${vehicleName || "Vehicle"}`;
        bodyContent = `
          <p>A reservation hold is about to expire.</p>
          <ul>
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${details ? `<li><strong>Details:</strong> ${details}</li>` : ""}
          </ul>
        `;
        break;

      case "return_due_soon":
        subject = `📅 Return Due Soon - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A rental is due for return soon.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${customerName ? `<li><strong>Customer:</strong> ${customerName}</li>` : ""}
            ${vehicleName ? `<li><strong>Vehicle:</strong> ${vehicleName}</li>` : ""}
            ${details ? `<li><strong>Return Time:</strong> ${details}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/returns" style="color: #2563eb;">View Returns →</a></p>
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

    // Build priority styling
    let headerBg = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
    let priorityBadge = "";
    
    if (priority === "urgent") {
      headerBg = "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)";
      priorityBadge = `<span style="background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-left: 12px;">URGENT</span>`;
    } else if (priority === "high") {
      headerBg = "linear-gradient(135deg, #92400e 0%, #f59e0b 100%)";
      priorityBadge = `<span style="background: #fffbeb; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-left: 12px;">HIGH PRIORITY</span>`;
    }

    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="background: ${headerBg}; padding: 20px 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: white; font-size: 20px; display: flex; align-items: center;">
            C2C Rental - Admin Alert ${priorityBadge}
          </h1>
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
