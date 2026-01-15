import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getCorsHeaders, 
  handleCorsPreflightRequest,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";

interface SendOtpRequest {
  bookingId: string;
  channel: "sms" | "email";
}

// Generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP with salt
async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const clientIp = getClientIp(req);
    
    // Rate limit by IP: 5 OTP requests per 10 minutes
    const ipRateLimit = checkRateLimit(clientIp, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: "otp-ip",
    });
    
    if (!ipRateLimit.allowed) {
      console.log(`[send-booking-otp] IP rate limit exceeded: ${clientIp}`);
      return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
    }

    const supabaseAdmin = getAdminClient();
    const { bookingId, channel }: SendOtpRequest = await req.json();

    if (!bookingId || !channel) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId or channel" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit by booking: 3 OTP requests per booking per 5 minutes
    const bookingRateLimit = checkRateLimit(bookingId, {
      windowMs: 5 * 60 * 1000,
      maxRequests: 3,
      keyPrefix: "otp-booking",
    });
    
    if (!bookingRateLimit.allowed) {
      console.log(`[send-booking-otp] Booking rate limit exceeded: ${bookingId}`);
      return new Response(
        JSON.stringify({ error: "Too many code requests. Please wait a few minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking details (don't reveal if booking exists or not)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, booking_code")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      // Anti-enumeration: don't reveal if booking exists
      console.error("[send-booking-otp] Booking not found:", bookingId);
      return new Response(
        JSON.stringify({ error: "Unable to send verification code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user contact info
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("phone, email, full_name")
      .eq("id", booking.user_id)
      .single();

    let userPhone = profile?.phone;
    let userEmail = profile?.email;
    let userName = profile?.full_name;

    if (!userPhone || !userEmail) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(booking.user_id);
      if (authUser?.user) {
        userPhone = userPhone || authUser.user.phone || authUser.user.user_metadata?.phone;
        userEmail = userEmail || authUser.user.email;
        userName = userName || authUser.user.user_metadata?.full_name;
      }
    }

    // Rate limit by phone/email: 10 OTPs per day
    const contactKey = channel === "sms" ? userPhone : userEmail;
    if (contactKey) {
      const contactRateLimit = checkRateLimit(contactKey, {
        windowMs: 24 * 60 * 60 * 1000,
        maxRequests: 10,
        keyPrefix: `otp-${channel}`,
      });
      
      if (!contactRateLimit.allowed) {
        console.log(`[send-booking-otp] Contact rate limit exceeded: ${contactKey}`);
        return new Response(
          JSON.stringify({ error: "Daily verification limit reached" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate contact method exists (generic error)
    if ((channel === "sms" && !userPhone) || (channel === "email" && !userEmail)) {
      return new Response(
        JSON.stringify({ error: "Unable to send verification code" }),
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
        attempts: 0,
      });

    if (insertError) {
      console.error("[send-booking-otp] Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send OTP via chosen channel
    if (channel === "sms") {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (!twilioSid || !twilioAuth || !twilioFrom) {
        console.error("[send-booking-otp] Twilio not configured");
        return new Response(
          JSON.stringify({ error: "SMS service not available" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const message = `Your verification code is: ${otp}. Expires in 10 minutes.`;

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
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
        }
      );

      if (!twilioResponse.ok) {
        console.error("[send-booking-otp] Twilio error");
        return new Response(
          JSON.stringify({ error: "Failed to send SMS" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendKey) {
        console.error("[send-booking-otp] Resend not configured");
        return new Response(
          JSON.stringify({ error: "Email service not available" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Verify Your Booking</h1>
          <p>Hi ${userName || "there"},</p>
          <p>Your verification code is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "C2C Rental <onboarding@resend.dev>",
          to: [userEmail],
          subject: `Your verification code: ${otp}`,
          html: emailHtml,
        }),
      });
    }

    // Mask contact for response
    const maskedContact = channel === "sms" 
      ? `***${userPhone?.slice(-4)}`
      : userEmail?.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return new Response(
      JSON.stringify({ 
        success: true, 
        channel,
        sentTo: maskedContact,
        expiresAt: expiresAt.toISOString(),
        remaining: bookingRateLimit.remaining,
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
