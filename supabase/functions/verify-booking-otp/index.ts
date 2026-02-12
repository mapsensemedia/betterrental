import { 
  getCorsHeaders, 
  handleCorsPreflightRequest,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/cors.ts";
import { AuthError, authErrorResponse } from "../_shared/auth.ts";
import { verifyOtpAndMintToken } from "../_shared/booking-core.ts";

Deno.serve(async (req: Request): Promise<Response> => {
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

    const { bookingId, otp } = await req.json();

    if (!bookingId || !otp) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId or otp" }),
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

    // Delegate to shared OTP verification + token minting
    const result = await verifyOtpAndMintToken(bookingId, otp);

    console.log(`[verify-booking-otp] Booking ${bookingId} verified, token minted`);

    // Fire-and-forget confirmation notifications
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    Promise.all([
      fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ bookingId }),
      }).catch(e => console.log("[verify-booking-otp] Email notification failed:", e)),
      fetch(`${supabaseUrl}/functions/v1/send-booking-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ bookingId }),
      }).catch(e => console.log("[verify-booking-otp] SMS notification failed:", e)),
    ]).catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true,
        bookingId: result.booking.id,
        bookingCode: result.booking.booking_code,
        accessToken: result.accessToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        ...(result.remainingAttempts !== undefined && { remainingAttempts: result.remainingAttempts }),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    console.error("[verify-booking-otp] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
