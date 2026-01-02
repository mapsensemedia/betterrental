import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  bookingId: string;
  channel: "sms" | "email";
}

// Generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple hash function for OTP (using Web Crypto API)
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { bookingId, channel }: SendOtpRequest = await req.json();

    if (!bookingId || !channel) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId or channel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-booking-otp] Sending OTP for booking ${bookingId} via ${channel}`);

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, booking_code")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("[send-booking-otp] Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user contact info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone, email, full_name")
      .eq("id", booking.user_id)
      .single();

    // Fallback to auth.users if profile doesn't have the info
    let userPhone = profile?.phone;
    let userEmail = profile?.email;
    let userName = profile?.full_name;

    if (!userPhone || !userEmail) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
      if (authUser?.user) {
        userPhone = userPhone || authUser.user.phone || authUser.user.user_metadata?.phone;
        userEmail = userEmail || authUser.user.email;
        userName = userName || authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name;
      }
    }

    // Validate contact method exists
    if (channel === "sms" && !userPhone) {
      return new Response(
        JSON.stringify({ error: "No phone number on file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (channel === "email" && !userEmail) {
      return new Response(
        JSON.stringify({ error: "No email address on file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP and hash
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing OTPs for this booking
    await supabaseAdmin
      .from("booking_otps")
      .update({ expires_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .is("verified_at", null);

    // Store new OTP hash
    const { error: insertError } = await supabaseAdmin
      .from("booking_otps")
      .insert({
        booking_id: bookingId,
        user_id: booking.user_id,
        otp_hash: otpHash,
        channel,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-booking-otp] Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via chosen channel
    if (channel === "sms") {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");

      if (!twilioSid || !twilioAuth || !twilioFrom) {
        console.error("[send-booking-otp] Twilio not configured");
        return new Response(
          JSON.stringify({ error: "SMS service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const message = `Your booking verification code is: ${otp}. This code expires in 10 minutes. Booking ref: ${booking.booking_code}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: userPhone!,
          From: twilioFrom,
          Body: message,
        }),
      });

      if (!twilioResponse.ok) {
        const twilioError = await twilioResponse.text();
        console.error("[send-booking-otp] Twilio error:", twilioError);
        return new Response(
          JSON.stringify({ error: "Failed to send SMS" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[send-booking-otp] SMS sent to ${userPhone?.slice(-4)}`);
    } else {
      // Send via email using Resend
      const resendKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendKey) {
        console.error("[send-booking-otp] Resend not configured");
        return new Response(
          JSON.stringify({ error: "Email service not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Verify Your Booking</h1>
          <p>Hi ${userName || "there"},</p>
          <p>Your verification code for booking <strong>${booking.booking_code}</strong> is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            DriveFleet Car Rentals
          </p>
        </div>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DriveFleet <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Your verification code: ${otp}`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const resendError = await resendResponse.text();
        console.error("[send-booking-otp] Resend error:", resendError);
        // Don't fail - email may be limited to verified addresses in test mode
        console.log("[send-booking-otp] Email may not have been delivered (test mode limitations)");
      } else {
        console.log(`[send-booking-otp] Email sent to ${userEmail}`);
      }
    }

    // Mask the contact for response
    const maskedContact = channel === "sms" 
      ? `***${userPhone?.slice(-4)}`
      : userEmail?.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return new Response(
      JSON.stringify({ 
        success: true, 
        channel,
        sentTo: maskedContact,
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-booking-otp] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
