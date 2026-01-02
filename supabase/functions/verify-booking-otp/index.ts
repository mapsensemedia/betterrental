import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { bookingId, otp }: VerifyOtpRequest = await req.json();

    if (!bookingId || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId or otp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-booking-otp] Verifying OTP for booking ${bookingId}`);

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
      console.log("[verify-booking-otp] No valid OTP found:", otpError);
      return new Response(
        JSON.stringify({ error: "No valid OTP found. Please request a new code." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts (5)
    if (otpRecord.attempts >= 5) {
      console.log("[verify-booking-otp] Max attempts exceeded");
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempt counter
    await supabaseAdmin
      .from("booking_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Hash the provided OTP and compare
    const providedHash = await hashOtp(otp);

    if (providedHash !== otpRecord.otp_hash) {
      const remainingAttempts = 4 - otpRecord.attempts;
      console.log(`[verify-booking-otp] Invalid OTP, ${remainingAttempts} attempts remaining`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid verification code",
          remainingAttempts 
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

    // Get booking details for notifications
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(`
        *,
        vehicles(make, model, year, image_url),
        locations(name, address, city)
      `)
      .eq("id", bookingId)
      .single();

    console.log(`[verify-booking-otp] Booking ${bookingId} confirmed successfully`);

    // Trigger confirmation notifications
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    
    // Send email notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
    } catch (e) {
      console.log("[verify-booking-otp] Email notification trigger failed:", e);
    }

    // Send SMS notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
    } catch (e) {
      console.log("[verify-booking-otp] SMS notification trigger failed:", e);
    }

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
