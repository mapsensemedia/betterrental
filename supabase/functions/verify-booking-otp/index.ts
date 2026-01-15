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

interface VerifyOtpRequest {
  bookingId: string;
  otp: string;
}

// Hash OTP the same way as send function
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
    
    // Rate limit by IP: 10 verification attempts per 10 minutes
    const ipRateLimit = checkRateLimit(clientIp, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: "verify-otp-ip",
    });
    
    if (!ipRateLimit.allowed) {
      console.log(`[verify-booking-otp] IP rate limit exceeded: ${clientIp}`);
      return rateLimitResponse(ipRateLimit.resetAt, corsHeaders);
    }

    const supabaseAdmin = getAdminClient();
    const { bookingId, otp }: VerifyOtpRequest = await req.json();

    if (!bookingId || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId or otp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid verification code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit by booking: 10 verification attempts per 10 minutes
    const bookingRateLimit = checkRateLimit(bookingId, {
      windowMs: 10 * 60 * 1000,
      maxRequests: 10,
      keyPrefix: "verify-otp-booking",
    });
    
    if (!bookingRateLimit.allowed) {
      console.log(`[verify-booking-otp] Booking rate limit exceeded: ${bookingId}`);
      return new Response(
        JSON.stringify({ error: "Too many verification attempts" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the latest unexpired, unverified OTP for this booking
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("booking_otps")
      .select("*")
      .eq("booking_id", bookingId)
      .is("verified_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      // Generic error to prevent enumeration
      return new Response(
        JSON.stringify({ error: "Invalid or expired code. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts (5) with lockout
    if (otpRecord.attempts >= 5) {
      // Invalidate the OTP after too many attempts
      await supabaseAdmin
        .from("booking_otps")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempt counter first (before verification)
    await supabaseAdmin
      .from("booking_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Hash the provided OTP and compare
    const providedHash = await hashOtp(otp);

    if (providedHash !== otpRecord.otp_hash) {
      const remainingAttempts = 4 - otpRecord.attempts;
      
      return new Response(
        JSON.stringify({ 
          error: "Invalid verification code",
          remainingAttempts: Math.max(0, remainingAttempts),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from("booking_otps")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Update booking status to confirmed
    const { error: bookingError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (bookingError) {
      console.error("[verify-booking-otp] Failed to update booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to confirm booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get booking details for response
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_code")
      .eq("id", bookingId)
      .single();

    console.log(`[verify-booking-otp] Booking ${bookingId} confirmed successfully`);

    // Trigger confirmation notifications (fire and forget)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const notificationPromises = [];

    notificationPromises.push(
      fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId }),
      }).catch(e => console.log("[verify-booking-otp] Email notification failed:", e))
    );

    notificationPromises.push(
      fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ bookingId }),
      }).catch(e => console.log("[verify-booking-otp] SMS notification failed:", e))
    );

    Promise.all(notificationPromises).catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Booking verified and confirmed",
        booking: {
          id: booking?.id,
          bookingCode: booking?.booking_code,
          status: "confirmed"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[verify-booking-otp] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
