import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  stage: 
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
    | "rental_completed";
  customMessage?: string;
}

// Message templates for each stage
const stageMessages: Record<string, { subject: string; sms: string; emailBody: string }> = {
  license_approved: {
    subject: "License Verified - You're Ready to Drive!",
    sms: "Your driver's license has been verified for your C2C Exotic rental. We're preparing your vehicle!",
    emailBody: `
      <h2>License Verified ✓</h2>
      <p>Great news! Your driver's license has been approved for your upcoming rental.</p>
      <p>We're now preparing your vehicle and will notify you when it's ready for pickup.</p>
    `,
  },
  license_rejected: {
    subject: "Action Required - License Verification Issue",
    sms: "There was an issue with your license verification for C2C Exotic rental. Please check your email for details.",
    emailBody: `
      <h2>License Verification Issue</h2>
      <p>We couldn't verify your driver's license. Please upload a clearer image or contact us for assistance.</p>
      <p>This is required before we can proceed with your rental.</p>
    `,
  },
  vehicle_assigned: {
    subject: "Your Vehicle Has Been Assigned",
    sms: "Your C2C Exotic vehicle has been assigned! We'll notify you when it's ready for pickup.",
    emailBody: `
      <h2>Vehicle Assigned</h2>
      <p>Your specific vehicle has been assigned to your reservation.</p>
      <p>Our team is preparing it for your arrival.</p>
    `,
  },
  agreement_generated: {
    subject: "Action Required - Sign Your Rental Agreement",
    sms: "Your C2C Exotic rental agreement is ready. Please sign it before pickup: {{SIGN_LINK}}",
    emailBody: `
      <h2>Rental Agreement Ready</h2>
      <p>Your rental agreement is now ready for your signature.</p>
      <p>Please review and sign the agreement before your pickup time to ensure a smooth handover.</p>
      <p><a href="{{SIGN_LINK}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign Agreement</a></p>
    `,
  },
  agreement_signed: {
    subject: "Agreement Signed - Almost Ready!",
    sms: "Your C2C Exotic rental agreement has been signed. We'll complete our walkaround inspection next.",
    emailBody: `
      <h2>Agreement Signed ✓</h2>
      <p>Thank you for signing the rental agreement.</p>
      <p>We'll complete the vehicle inspection and you'll be on your way soon!</p>
    `,
  },
  prep_complete: {
    subject: "Your Vehicle is Ready!",
    sms: "Your C2C Exotic vehicle is cleaned and ready for pickup! See you soon.",
    emailBody: `
      <h2>Vehicle Ready for Pickup</h2>
      <p>Great news! Your vehicle has been cleaned, inspected, and is ready for you.</p>
      <p>Please arrive at your scheduled pickup time with your ID.</p>
    `,
  },
  checkin_complete: {
    subject: "Check-In Complete",
    sms: "You're checked in at C2C Exotic! Proceeding with payment and agreement.",
    emailBody: `
      <h2>Check-In Complete ✓</h2>
      <p>You've been checked in successfully.</p>
      <p>We'll now process payment and prepare the final paperwork.</p>
    `,
  },
  walkaround_complete: {
    subject: "Inspection Complete - Ready for Handover",
    sms: "Vehicle inspection complete. Your C2C Exotic rental is ready for handover!",
    emailBody: `
      <h2>Inspection Complete ✓</h2>
      <p>The vehicle walkaround inspection is complete and documented.</p>
      <p>You're all set to receive your keys!</p>
    `,
  },
  rental_activated: {
    subject: "Your Rental is Now Active - Enjoy Your Drive!",
    sms: "Your C2C Exotic rental is active! Emergency: 1-888-XXX-XXXX. Return by {{RETURN_DATE}}. Have a great trip!",
    emailBody: `
      <h2>🚗 You're On Your Way!</h2>
      <p>Your rental is now active. Here's what you need to know:</p>
      <ul>
        <li><strong>Return Date:</strong> {{RETURN_DATE}}</li>
        <li><strong>Return Location:</strong> {{LOCATION}}</li>
        <li><strong>Emergency Line:</strong> 1-888-XXX-XXXX</li>
      </ul>
      <p>Drive safe and enjoy your exotic experience!</p>
    `,
  },
  return_initiated: {
    subject: "Return Process Started",
    sms: "Your C2C Exotic vehicle return has started. We're inspecting the vehicle now.",
    emailBody: `
      <h2>Return in Progress</h2>
      <p>Thank you for returning the vehicle. Our team is now conducting the final inspection.</p>
      <p>You'll receive a confirmation once everything is complete.</p>
    `,
  },
  rental_completed: {
    subject: "Rental Complete - Thank You!",
    sms: "Your C2C Exotic rental is complete! Thank you for choosing us. We hope to see you again!",
    emailBody: `
      <h2>Thank You for Renting with C2C Exotic!</h2>
      <p>Your rental has been successfully completed and your deposit will be released.</p>
      <p>We'd love to hear about your experience. Please consider leaving us a review!</p>
      <p>See you on your next adventure!</p>
    `,
  },
};

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

    // Fetch booking with location
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        vehicle_id,
        locations (name, address, city)
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

    // Fetch category info separately
    let categoryData = { make: "", model: "Vehicle", year: 0 };
    if (booking.vehicle_id) {
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("name")
        .eq("id", booking.vehicle_id)
        .single();
      if (category) {
        categoryData = { make: "", model: category.name, year: 0 };
      }
    }
    // Attach vehicle info to booking for template compatibility
    (booking as any).vehicles = categoryData;

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, phone, full_name")
      .eq("id", booking.user_id)
      .single();

    // Fallback to auth.users if profile doesn't have email
    let userEmail = profile?.email;
    let userPhone = profile?.phone;
    let userName = profile?.full_name || "Valued Customer";

    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(booking.user_id);
      userEmail = authUser?.user?.email;
      userPhone = userPhone || authUser?.user?.phone;
    }

    // Get stage template
    const template = stageMessages[stage];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown stage: ${stage}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format dates
    const returnDate = new Date(booking.end_at).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const vehicleInfo = booking.vehicles
      ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
      : "your vehicle";

    const locationInfo = booking.locations?.name || "our location";
    const signLink = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/booking/${bookingId}`;

    // Replace placeholders
    let smsMessage = customMessage || template.sms;
    smsMessage = smsMessage
      .replace("{{RETURN_DATE}}", returnDate)
      .replace("{{VEHICLE}}", vehicleInfo)
      .replace("{{LOCATION}}", locationInfo)
      .replace("{{SIGN_LINK}}", signLink);

    let emailBody = template.emailBody
      .replace("{{RETURN_DATE}}", returnDate)
      .replace("{{VEHICLE}}", vehicleInfo)
      .replace("{{LOCATION}}", locationInfo)
      .replace("{{SIGN_LINK}}", signLink);

    const idempotencyKey = `${stage}_${bookingId}_${new Date().toISOString().slice(0, 13)}`;

    // Check for recent notification to prevent duplicates
    const { data: recentLog } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("notification_type", stage)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(1);

    if (recentLog && recentLog.length > 0) {
      console.log("Duplicate notification prevented for stage:", stage);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Recent notification exists" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { email: false, sms: false };

    // Send Email
    if (resendApiKey && userEmail) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "C2C Exotic Rentals <noreply@resend.dev>",
            to: [userEmail],
            subject: `${template.subject} - Booking ${booking.booking_code}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"></head>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1a1a1a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #dc2626;">C2C EXOTIC</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                  <p>Hi ${userName},</p>
                  ${emailBody}
                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                  <p style="color: #666; font-size: 12px;">
                    Booking: <strong>${booking.booking_code}</strong><br>
                    Vehicle: ${vehicleInfo}
                  </p>
                </div>
              </body>
              </html>
            `,
          }),
        });

        results.email = emailRes.ok;
        console.log("Email sent:", emailRes.ok);
      } catch (e) {
        console.error("Email error:", e);
      }
    }

    // Send SMS
    if (twilioSid && twilioToken && twilioPhone && userPhone) {
      try {
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
        console.log("SMS sent:", smsRes.ok);
      } catch (e) {
        console.error("SMS error:", e);
      }
    }

    // Log notification
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
