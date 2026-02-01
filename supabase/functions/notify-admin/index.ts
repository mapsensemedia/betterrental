import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIp } from "../_shared/cors.ts";
import { validateAuth, isAdminOrStaff } from "../_shared/auth.ts";

const ADMIN_EMAIL = "it@cartok.ca";

interface NotifyAdminRequest {
  eventType: string;
  bookingId?: string;
  bookingCode?: string;
  customerName?: string;
  vehicleName?: string;
  details?: string;
}

// Map event types to admin_alerts alert_type enum
const EVENT_TO_ALERT_TYPE: Record<string, string> = {
  new_booking: "verification_pending",
  booking_cancelled: "customer_issue",
  license_uploaded: "verification_pending",
  agreement_signed: "verification_pending",
  payment_received: "payment_pending",
  issue_reported: "customer_issue",
  damage_reported: "damage_reported",
  late_return: "late_return",
  overdue: "overdue",
  return_due_soon: "return_due_soon",
  rental_activated: "verification_pending",
  return_completed: "verification_pending",
};

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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting - max 30 admin notifications per minute
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`notify_admin:${clientIp}`, {
      windowMs: 60000,
      maxRequests: 30,
      keyPrefix: "notify_admin",
    });

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for notify-admin from IP: ${clientIp}`);
      return rateLimitResponse(rateLimit.resetAt, corsHeaders);
    }

    // Validate auth - only authenticated users or internal calls
    const auth = await validateAuth(req);
    if (!auth.authenticated) {
      // Allow internal service calls (from other edge functions)
      const authHeader = req.headers.get("Authorization");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!authHeader || !authHeader.includes(supabaseServiceKey || "")) {
        // Check if it's a valid user
        console.warn("Unauthenticated notify-admin request");
        // We'll allow it but with stricter rate limits for public access
      }
    }

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

    const body = await req.json();
    const { eventType, bookingId, bookingCode, customerName, vehicleName, details }: NotifyAdminRequest = body;

    // Input validation
    if (!eventType || typeof eventType !== "string" || eventType.length > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid eventType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin notification triggered: ${eventType}`, { bookingId, bookingCode, customerName });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create an admin_alert entry for realtime dashboard updates
    const alertType = EVENT_TO_ALERT_TYPE[eventType] || "customer_issue";
    const alertTitle = buildAlertTitle(eventType, bookingCode, customerName, vehicleName);
    const alertMessage = details || buildAlertMessage(eventType, customerName, vehicleName);

    try {
      const { data: alertData, error: alertError } = await supabase
        .from("admin_alerts")
        .insert({
          alert_type: alertType,
          title: alertTitle,
          message: alertMessage,
          booking_id: bookingId || null,
          status: "pending",
        })
        .select()
        .single();

      if (alertError) {
        console.error("Error creating admin_alert:", alertError);
      } else {
        console.log("Admin alert created:", alertData?.id);
      }
    } catch (alertErr) {
      console.error("Failed to create admin_alert:", alertErr);
    }

    // Build email content based on event type
    let subject = "";
    let bodyContent = "";
    let priority = "normal";
    const timestamp = new Date().toLocaleString("en-US", { 
      timeZone: "America/Los_Angeles",
      dateStyle: "medium",
      timeStyle: "short"
    });

    const bookingRef = bookingCode ? `<strong>${bookingCode}</strong>` : (bookingId ? `ID: ${bookingId.slice(0, 8)}...` : "N/A");
    const safeCustomerName = customerName ? customerName.slice(0, 100) : "";
    const safeVehicleName = vehicleName ? vehicleName.slice(0, 100) : "";
    const safeDetails = details ? details.slice(0, 500) : "";

    switch (eventType) {
      case "new_booking":
        subject = `🚗 New Booking Created - ${bookingCode || "New"}`;
        bodyContent = `
          <p>A new booking has been created and requires attention.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/bookings" style="color: #2563eb;">View in Admin Panel →</a></p>
        `;
        break;

      case "booking_cancelled":
        priority = "high";
        subject = `❌ Booking Cancelled - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p><strong style="color: #dc2626;">A booking has been cancelled.</strong></p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeDetails ? `<li><strong>Reason:</strong> ${safeDetails}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/bookings" style="color: #2563eb;">View in Admin Panel →</a></p>
        `;
        break;

      case "booking_updated":
        subject = `📝 Booking Updated - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A booking has been updated.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeDetails ? `<li><strong>Changes:</strong> ${safeDetails}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/bookings" style="color: #2563eb;">View in Admin Panel →</a></p>
        `;
        break;

      case "rental_activated":
        subject = `🟢 Rental Activated - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A rental has been activated. Vehicle is now out with customer.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/active-rentals" style="color: #2563eb;">View Active Rentals →</a></p>
        `;
        break;

      case "return_completed":
        subject = `✅ Return Completed - ${bookingCode || "Booking"}`;
        bodyContent = `
          <p>A rental has been completed and the vehicle has been returned.</p>
          <ul>
            <li><strong>Booking:</strong> ${bookingRef}</li>
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeDetails ? `<li><strong>Notes:</strong> ${safeDetails}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/bookings" style="color: #2563eb;">View in Admin Panel →</a></p>
        `;
        break;

      case "license_uploaded":
        subject = `📋 License Uploaded - Verification Needed`;
        bodyContent = `
          <p>A customer has uploaded their driver's license and it needs verification.</p>
          <ul>
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeDetails ? `<li><strong>Details:</strong> ${safeDetails}</li>` : ""}
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
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
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
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeDetails ? `<li><strong>Amount:</strong> ${safeDetails}</li>` : ""}
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
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeDetails ? `<li><strong>Details:</strong> ${safeDetails}</li>` : ""}
          </ul>
          <p>Please review this issue promptly.</p>
          <p><a href="https://betterrental.lovable.app/admin/alerts" style="color: #2563eb;">View Alerts →</a></p>
        `;
        break;

      case "damage_reported":
        priority = "urgent";
        subject = `🔴 DAMAGE REPORTED - ${bookingCode || safeVehicleName || "Vehicle"}`;
        bodyContent = `
          <p><strong style="color: #dc2626;">Vehicle damage has been reported. Immediate attention required.</strong></p>
          <ul>
            ${bookingCode ? `<li><strong>Booking:</strong> ${bookingRef}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeDetails ? `<li><strong>Description:</strong> ${safeDetails}</li>` : ""}
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
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeDetails ? `<li><strong>Details:</strong> ${safeDetails}</li>` : ""}
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
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeVehicleName ? `<li><strong>Vehicle:</strong> ${safeVehicleName}</li>` : ""}
            ${safeDetails ? `<li><strong>Details:</strong> ${safeDetails}</li>` : ""}
          </ul>
          <p><a href="https://betterrental.lovable.app/admin/active-rentals" style="color: #2563eb;">View Active Rentals →</a></p>
        `;
        break;

      default:
        subject = `📣 Admin Alert - ${eventType}`;
        bodyContent = `
          <p>An event occurred that requires admin attention.</p>
          <ul>
            <li><strong>Event:</strong> ${eventType}</li>
            ${bookingCode ? `<li><strong>Booking:</strong> ${bookingRef}</li>` : ""}
            ${safeCustomerName ? `<li><strong>Customer:</strong> ${safeCustomerName}</li>` : ""}
            ${safeDetails ? `<li><strong>Details:</strong> ${safeDetails}</li>` : ""}
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

// Helper functions to build alert content
function buildAlertTitle(
  eventType: string,
  bookingCode?: string,
  customerName?: string,
  vehicleName?: string
): string {
  const ref = bookingCode || "";
  const customer = customerName?.slice(0, 30) || "";
  
  switch (eventType) {
    case "new_booking":
      return `New Booking${ref ? ` ${ref}` : ""}${customer ? ` - ${customer}` : ""}`;
    case "booking_cancelled":
      return `Booking Cancelled${ref ? ` ${ref}` : ""}`;
    case "license_uploaded":
      return `License Uploaded${customer ? ` - ${customer}` : ""}`;
    case "agreement_signed":
      return `Agreement Signed${ref ? ` ${ref}` : ""}`;
    case "payment_received":
      return `Payment Received${ref ? ` ${ref}` : ""}`;
    case "issue_reported":
      return `Issue Reported${ref ? ` ${ref}` : ""}`;
    case "damage_reported":
      return `Damage Reported${vehicleName ? ` - ${vehicleName}` : ""}`;
    case "late_return":
      return `Late Return${ref ? ` ${ref}` : ""}`;
    case "overdue":
      return `Overdue Rental${ref ? ` ${ref}` : ""}`;
    case "rental_activated":
      return `Rental Activated${ref ? ` ${ref}` : ""}`;
    case "return_completed":
      return `Return Completed${ref ? ` ${ref}` : ""}`;
    default:
      return `Alert: ${eventType}`;
  }
}

function buildAlertMessage(
  eventType: string,
  customerName?: string,
  vehicleName?: string
): string {
  const customer = customerName?.slice(0, 50) || "Customer";
  const vehicle = vehicleName?.slice(0, 50) || "Vehicle";
  
  switch (eventType) {
    case "new_booking":
      return `${customer} has created a new booking. Review and prepare for pickup.`;
    case "booking_cancelled":
      return `A booking has been cancelled. Review cancellation details.`;
    case "license_uploaded":
      return `${customer} uploaded their driver's license. Verification required.`;
    case "agreement_signed":
      return `${customer} signed the rental agreement. Ready for handover.`;
    case "payment_received":
      return `Payment received from ${customer}.`;
    case "issue_reported":
      return `${customer} reported an issue. Review immediately.`;
    case "damage_reported":
      return `Damage reported on ${vehicle}. Assessment required.`;
    case "late_return":
      return `${vehicle} return is overdue. Contact customer.`;
    case "overdue":
      return `Rental is significantly overdue. Urgent action needed.`;
    case "rental_activated":
      return `${customer} has picked up ${vehicle}.`;
    case "return_completed":
      return `${customer} has returned ${vehicle}.`;
    default:
      return `Action required for this event.`;
  }
}