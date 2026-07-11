import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getAdminClient, getUserOrThrow, requireRoleOrThrow, authErrorResponse } from "../_shared/auth.ts";
import { checkDbRateLimit } from "../_shared/rate-limit-db.ts";

const ADMIN_PHONE = "+16727553399";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { userId } = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(userId, ["admin", "staff"], corsHeaders);

    const { bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== "string") {
      return new Response(JSON.stringify({ error: "bookingId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rl = await checkDbRateLimit({
      key: `bank-xfer-otp:${bookingId}`,
      windowSeconds: 600,
      maxRequests: 3,
    });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many code requests. Please wait a few minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = getAdminClient();

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, booking_code, total_amount, paid_offline")
      .eq("id", bookingId)
      .single();
    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (booking.paid_offline) {
      return new Response(JSON.stringify({ error: "Booking already marked as paid by bank transfer" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate previous OTPs
    await supabase.from("bank_transfer_otps")
      .update({ expires_at: new Date().toISOString() })
      .eq("booking_id", bookingId)
      .is("verified_at", null);

    const { error: insertErr } = await supabase.from("bank_transfer_otps").insert({
      booking_id: bookingId,
      requested_by: userId,
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
    });
    if (insertErr) {
      console.error("[send-bank-transfer-otp] insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send via Twilio to admin phone
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      return new Response(JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const message = `C2C: OTP ${otp} to mark booking ${booking.booking_code} ($${Number(booking.total_amount).toFixed(2)}) as paid by bank transfer. Expires in 10 min.`;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: ADMIN_PHONE, From: twilioFrom, Body: message }),
      }
    );

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error("[send-bank-transfer-otp] twilio error", errText);
      return new Response(JSON.stringify({ error: "Failed to send SMS" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      sentTo: `***${ADMIN_PHONE.slice(-4)}`,
      expiresAt: expiresAt.toISOString(),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    try { return authErrorResponse(err, getCorsHeaders(req)); } catch {
      console.error("[send-bank-transfer-otp] error", err);
      return new Response(JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
  }
});
