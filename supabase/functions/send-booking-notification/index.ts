import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Stage =
  | "payment_received"
  | "license_approved"
  | "license_rejected"
  | "vehicle_assigned"
  | "agreement_generated"
  | "agreement_signed"
  | "checkin_complete"
  | "prep_complete"
  | "walkaround_complete"
  | "rental_activated"
  | "return_initiated"
  | "rental_completed"
  | "deposit_released";

interface NotificationRequest {
  bookingId: string;
  stage: Stage;
  customMessage?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return `$${Number(n).toFixed(2)}`;
}

function locationStr(loc: { name?: string; address?: string; city?: string } | null): string {
  if (!loc) return "our location";
  return [loc.name, loc.address, loc.city].filter(Boolean).join(", ");
}

// ── Booking summary block reused in every email ─────────────────────
function bookingSummaryHtml(b: Record<string, any>, vehicleName: string, pickupLoc: string, returnLoc: string): string {
  return `
    <table width="100%" cellpadding="8" cellspacing="0" style="background:#f3f4f6;border-radius:6px;margin:20px 0;font-size:14px;">
      <tr><td style="color:#666;width:40%">Booking Code</td><td style="font-weight:bold">${b.booking_code}</td></tr>
      <tr><td style="color:#666">Vehicle</td><td style="font-weight:bold">${vehicleName}</td></tr>
      <tr><td style="color:#666">Pickup</td><td>${fmtDateTime(b.start_at)}</td></tr>
      <tr><td style="color:#666">Return</td><td>${fmtDateTime(b.end_at)}</td></tr>
      <tr><td style="color:#666">Duration</td><td>${b.total_days} day${b.total_days === 1 ? "" : "s"}</td></tr>
      <tr><td style="color:#666">Pickup Location</td><td>${pickupLoc}</td></tr>
      ${returnLoc !== pickupLoc ? `<tr><td style="color:#666">Return Location</td><td>${returnLoc}</td></tr>` : ""}
      <tr><td style="color:#666">Total</td><td style="font-weight:bold">${fmtMoney(b.total_amount)}</td></tr>
    </table>
  `;
}

// ── Stage templates ─────────────────────────────────────────────────
interface TemplateData {
  booking: Record<string, any>;
  vehicleName: string;
  pickupLoc: string;
  returnLoc: string;
  signLink: string;
}

function getStageContent(stage: Stage, d: TemplateData): { subject: string; sms: string; emailBody: string } {
  const b = d.booking;
  const summary = bookingSummaryHtml(b, d.vehicleName, d.pickupLoc, d.returnLoc);
  const code = b.booking_code;

  switch (stage) {
    case "payment_received":
      return {
        subject: `Payment Confirmed – Booking ${code}`,
        sms: `C2C Exotic: Payment of ${fmtMoney(b.total_amount)} received for booking ${code}. Pickup: ${fmtDate(b.start_at)} at ${d.pickupLoc}. We'll verify your license next.`,
        emailBody: `
          <h2>Payment Confirmed ✓</h2>
          <p>We've received your payment of <strong>${fmtMoney(b.total_amount)}</strong>. Your booking is now secured!</p>
          ${summary}
          <p><strong>Next step:</strong> We'll verify your driver's license. You'll receive an update once it's approved.</p>
        `,
      };

    case "license_approved":
      return {
        subject: `License Verified – Booking ${code}`,
        sms: `C2C Exotic: Your license is approved for booking ${code}! Pickup: ${fmtDate(b.start_at)} at ${d.pickupLoc}. We're preparing your ${d.vehicleName}.`,
        emailBody: `
          <h2>License Verified ✓</h2>
          <p>Great news! Your driver's license has been approved.</p>
          ${summary}
          <p><strong>Next step:</strong> We're preparing your vehicle and will notify you when it's ready for pickup.</p>
        `,
      };

    case "license_rejected":
      return {
        subject: `Action Required – License Issue – Booking ${code}`,
        sms: `C2C Exotic: There's an issue with your license for booking ${code}. Please check your email and re-upload a clearer image.`,
        emailBody: `
          <h2>License Verification Issue</h2>
          <p>We couldn't verify your driver's license for the following booking:</p>
          ${summary}
          <p><strong>What to do:</strong> Please upload a clearer photo of your license. Make sure all text is legible and the image isn't blurry or cropped.</p>
          <p>If you have questions, reply to this email or contact us at <strong>1-888-XXX-XXXX</strong>.</p>
        `,
      };

    case "vehicle_assigned":
      return {
        subject: `Vehicle Assigned – Booking ${code}`,
        sms: `C2C Exotic: Your ${d.vehicleName} has been assigned for booking ${code}! Pickup: ${fmtDate(b.start_at)} at ${d.pickupLoc}.`,
        emailBody: `
          <h2>Vehicle Assigned ✓</h2>
          <p>Your specific vehicle has been assigned to your reservation.</p>
          ${summary}
          <p><strong>Next step:</strong> Our team will prepare the vehicle and send you the rental agreement to sign before pickup.</p>
        `,
      };

    case "agreement_generated":
      return {
        subject: `Action Required – Sign Your Agreement – Booking ${code}`,
        sms: `C2C Exotic: Your rental agreement for booking ${code} is ready. Please sign before pickup: ${d.signLink}`,
        emailBody: `
          <h2>Rental Agreement Ready</h2>
          <p>Your rental agreement is ready for your signature.</p>
          ${summary}
          <p>Please review and sign the agreement before your pickup time to ensure a smooth handover.</p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${d.signLink}" style="background:#dc2626;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:16px;">Sign Agreement Now</a>
          </p>
        `,
      };

    case "agreement_signed":
      return {
        subject: `Agreement Signed – Booking ${code}`,
        sms: `C2C Exotic: Agreement signed for booking ${code}! We'll complete vehicle prep and inspection next. See you ${fmtDate(b.start_at)}!`,
        emailBody: `
          <h2>Agreement Signed ✓</h2>
          <p>Thank you for signing the rental agreement.</p>
          ${summary}
          <p><strong>Next step:</strong> We'll complete the vehicle inspection and have everything ready for your pickup.</p>
        `,
      };

    case "checkin_complete":
      return {
        subject: `Check-In Complete – Booking ${code}`,
        sms: `C2C Exotic: You're checked in for booking ${code}! We're finalizing your ${d.vehicleName} now.`,
        emailBody: `
          <h2>Check-In Complete ✓</h2>
          <p>You've been checked in successfully.</p>
          ${summary}
          <p><strong>Next step:</strong> We're completing the final vehicle preparation. You'll be notified when your car is ready.</p>
        `,
      };

    case "prep_complete":
      return {
        subject: `Your ${d.vehicleName} is Ready! – Booking ${code}`,
        sms: `C2C Exotic: Your ${d.vehicleName} is cleaned and ready for pickup at ${d.pickupLoc}! Booking ${code}. Bring your ID.`,
        emailBody: `
          <h2>🚗 Your Vehicle is Ready!</h2>
          <p>Great news! Your <strong>${d.vehicleName}</strong> has been cleaned, inspected, and is ready for you.</p>
          ${summary}
          <p><strong>What to bring:</strong> Your government-issued ID and the credit card used for booking.</p>
        `,
      };

    case "walkaround_complete":
      return {
        subject: `Inspection Complete – Booking ${code}`,
        sms: `C2C Exotic: Vehicle inspection complete for booking ${code}. Your ${d.vehicleName} is ready for handover!`,
        emailBody: `
          <h2>Inspection Complete ✓</h2>
          <p>The vehicle walkaround inspection has been completed and documented.</p>
          ${summary}
          <p><strong>Next step:</strong> You're all set to receive your keys! 🔑</p>
        `,
      };

    case "rental_activated": {
      const returnInfo = d.returnLoc !== d.pickupLoc
        ? `<li><strong>Return Location:</strong> ${d.returnLoc}</li>`
        : `<li><strong>Return Location:</strong> ${d.pickupLoc}</li>`;
      return {
        subject: `Rental Active – Enjoy Your ${d.vehicleName}! – Booking ${code}`,
        sms: `C2C Exotic: Your ${d.vehicleName} rental is active! Booking ${code}. Return by ${fmtDateTime(b.end_at)} to ${d.returnLoc}. Emergency: 1-888-XXX-XXXX. Drive safe!`,
        emailBody: `
          <h2>🚗 You're On Your Way!</h2>
          <p>Your rental is now active. Here's everything you need:</p>
          ${summary}
          <h3>Important Details</h3>
          <ul>
            <li><strong>Return By:</strong> ${fmtDateTime(b.end_at)}</li>
            ${returnInfo}
            <li><strong>Emergency Line:</strong> 1-888-XXX-XXXX</li>
          </ul>
          <p>Drive safe and enjoy your exotic experience! 🎉</p>
        `,
      };
    }

    case "return_initiated":
      return {
        subject: `Return Started – Booking ${code}`,
        sms: `C2C Exotic: Return started for booking ${code}. We're inspecting your ${d.vehicleName} now. You'll get a confirmation once complete.`,
        emailBody: `
          <h2>Return in Progress</h2>
          <p>Thank you for returning the vehicle. Our team is conducting the final inspection.</p>
          ${summary}
          <p><strong>Next step:</strong> You'll receive a confirmation once the inspection is complete and your deposit release is processed.</p>
        `,
      };

    case "rental_completed":
      return {
        subject: `Rental Complete – Thank You! – Booking ${code}`,
        sms: `C2C Exotic: Booking ${code} is complete! Your deposit of ${fmtMoney(b.deposit_amount)} will be released within 5-10 business days. Thank you for choosing C2C Exotic!`,
        emailBody: `
          <h2>Thank You for Renting with C2C Exotic! 🎉</h2>
          <p>Your rental has been successfully completed.</p>
          ${summary}
          <h3>Deposit Information</h3>
          <p>Your security deposit of <strong>${fmtMoney(b.deposit_amount)}</strong> will be released within 5-10 business days to your original payment method.</p>
          <p>We'd love to hear about your experience – please consider leaving us a review!</p>
          <p>See you on your next adventure! 🚗</p>
        `,
      };

    case "deposit_released":
      return {
        subject: `Deposit Released – Booking ${code}`,
        sms: `C2C Exotic: Your deposit of ${fmtMoney(b.deposit_amount)} for booking ${code} has been released. It should appear on your statement within 5-10 business days.`,
        emailBody: `
          <h2>Deposit Released ✓</h2>
          <p>Your security deposit has been released for the following booking:</p>
          ${summary}
          <h3>Refund Details</h3>
          <p><strong>Amount Released:</strong> ${fmtMoney(b.deposit_amount)}</p>
          <p>The refund should appear on your original payment method within <strong>5-10 business days</strong>, depending on your bank.</p>
          <p>Thank you for choosing C2C Exotic! We hope to see you again soon.</p>
        `,
      };

    default:
      return {
        subject: `Booking Update – ${code}`,
        sms: `C2C Exotic: Update for booking ${code}. Check your email for details.`,
        emailBody: `
          <h2>Booking Update</h2>
          <p>There's an update on your booking:</p>
          ${summary}
        `,
      };
  }
}

// ── Wrap email in branded shell ─────────────────────────────────────
function wrapEmail(userName: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;">
  <div style="background:#1a1a1a;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;color:#dc2626;font-size:24px;">C2C EXOTIC</h1>
    <p style="margin:4px 0 0;color:#999;font-size:12px;">Premium Car Rentals</p>
  </div>
  <div style="padding:30px;background:#f9f9f9;border-radius:0 0 8px 8px;">
    <p>Hi ${userName},</p>
    ${body}
    <hr style="margin:30px 0;border:none;border-top:1px solid #ddd;">
    <p style="color:#999;font-size:11px;text-align:center;">
      C2C Exotic Rentals &bull; <a href="https://c2crental.ca" style="color:#dc2626;">c2crental.ca</a><br>
      Questions? Call us at 1-888-XXX-XXXX
    </p>
  </div>
</body>
</html>`;
}

// ── Main handler ────────────────────────────────────────────────────
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
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bookingId, stage, customMessage }: NotificationRequest = await req.json();

    console.log(`[send-booking-notification] Stage: ${stage}, Booking: ${bookingId}`);

    if (!bookingId || !stage) {
      return new Response(
        JSON.stringify({ error: "bookingId and stage are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch booking with BOTH locations (disambiguated) ───────────
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        pickup_location:locations!location_id (name, address, city),
        return_location:locations!return_location_id (name, address, city)
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

    // ── Fetch vehicle category name ─────────────────────────────────
    let vehicleName = "your vehicle";
    if (booking.vehicle_id) {
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("name")
        .eq("id", booking.vehicle_id)
        .single();
      if (category?.name) vehicleName = category.name;
    }

    // ── Location strings ────────────────────────────────────────────
    const pickupLoc = locationStr(booking.pickup_location);
    const returnLoc = booking.return_location ? locationStr(booking.return_location) : pickupLoc;

    // ── Fetch user profile ──────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone, full_name")
      .eq("id", booking.user_id)
      .single();

    let userEmail = profile?.email;
    let userPhone = profile?.phone;
    const userName = profile?.full_name || "Valued Customer";

    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      userEmail = authUser?.user?.email;
      userPhone = userPhone || authUser?.user?.phone;
    }

    // ── Build sign link ─────────────────────────────────────────────
    const appUrl = Deno.env.get("APP_URL") || "https://c2crental.ca";
    const signLink = `${appUrl}/booking/${bookingId}`;

    // ── Get stage content ───────────────────────────────────────────
    const template = getStageContent(stage, {
      booking, vehicleName, pickupLoc, returnLoc, signLink,
    });

    // ── Dedup check ─────────────────────────────────────────────────
    const idempotencyKey = `${stage}_${bookingId}_${new Date().toISOString().slice(0, 13)}`;

    const { data: recentLog } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("notification_type", stage)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString())
      .limit(1);

    if (recentLog && recentLog.length > 0) {
      console.log("Duplicate notification prevented for stage:", stage);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Recent notification exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { email: false, sms: false };

    // ── Send Email ──────────────────────────────────────────────────
    if (resendApiKey && userEmail) {
      try {
        const smsText = customMessage || template.sms;
        const emailHtml = wrapEmail(userName, template.emailBody);

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "C2C Exotic Rentals <noreply@resend.dev>",
            to: [userEmail],
            subject: template.subject,
            html: emailHtml,
          }),
        });

        results.email = emailRes.ok;
        if (!emailRes.ok) {
          const errBody = await emailRes.text();
          console.error("Email API error:", errBody);
        } else {
          console.log("Email sent successfully");
        }
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    // ── Send SMS ────────────────────────────────────────────────────
    if (twilioSid && twilioToken && twilioPhone && userPhone) {
      try {
        const smsMessage = customMessage || template.sms;
        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": "Basic " + btoa(`${twilioSid}:${twilioToken}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: userPhone,
              From: twilioPhone,
              Body: smsMessage,
            }),
          }
        );

        results.sms = smsRes.ok;
        if (!smsRes.ok) {
          const errBody = await smsRes.text();
          console.error("SMS API error:", errBody);
        } else {
          console.log("SMS sent successfully");
        }
      } catch (e) {
        console.error("SMS error:", e);
      }
    }

    // ── Log notification ────────────────────────────────────────────
    await supabase.from("notification_logs").insert({
      booking_id: bookingId,
      user_id: booking.user_id,
      notification_type: stage,
      channel: results.email && results.sms ? "both" : results.email ? "email" : results.sms ? "sms" : "none",
      status: results.email || results.sms ? "sent" : "failed",
      idempotency_key: idempotencyKey,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
