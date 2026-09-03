import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getAdminClient, getUserOrThrow, requireRoleOrThrow, authErrorResponse } from "../_shared/auth.ts";

const MAX_ATTEMPTS = 5;

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
    await requireRoleOrThrow(userId, ["super_admin", "manager", "admin", "staff"], corsHeaders);

    const { bookingId, code, reference } = await req.json();
    if (!bookingId || !code || !/^\d{6}$/.test(String(code))) {
      return new Response(JSON.stringify({ error: "bookingId and 6-digit code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (reference && typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "reference must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = getAdminClient();

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, booking_code, status, paid_offline")
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

    const { data: otpRow } = await supabase
      .from("bank_transfer_otps")
      .select("id, otp_hash, expires_at, verified_at, attempts")
      .eq("booking_id", bookingId)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return new Response(JSON.stringify({ error: "No active code — request a new one" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired — request a new one" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((otpRow.attempts ?? 0) >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "Too many wrong attempts — request a new code" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const submittedHash = await hashOtp(String(code));
    if (submittedHash !== otpRow.otp_hash) {
      await supabase.from("bank_transfer_otps")
        .update({ attempts: (otpRow.attempts ?? 0) + 1 })
        .eq("id", otpRow.id);
      const remaining = MAX_ATTEMPTS - ((otpRow.attempts ?? 0) + 1);
      return new Response(JSON.stringify({ error: "Invalid code", remainingAttempts: Math.max(0, remaining) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark OTP verified
    await supabase.from("bank_transfer_otps")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", otpRow.id);

    // Promote booking status if still draft/pending
    const nextStatus =
      booking.status === "draft" || booking.status === "pending" ? "confirmed" : booking.status;

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        paid_offline: true,
        offline_payment_method: "bank_transfer",
        offline_payment_reference: reference?.slice(0, 500) ?? null,
        offline_paid_at: new Date().toISOString(),
        offline_paid_by: userId,
        status: nextStatus,
      })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[confirm-bank-transfer-paid] update error", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rental pre-auths become the settled rental payment (bank transfer
    // covers the rental balance). Deposit authorizations MUST remain
    // 'authorized' — the deposit hold is still live on the customer's card
    // and only gets captured/voided at return time.
    const { error: rentalErr } = await supabase
      .from("payments")
      .update({ status: "completed" })
      .eq("booking_id", bookingId)
      .eq("status", "authorized")
      .or("payment_type.is.null,payment_type.neq.deposit");
    if (rentalErr) {
      console.error("[confirm-bank-transfer-paid] mark rental paid error", rentalErr);
    }

    await supabase.from("audit_logs").insert({
      action: "bank_transfer_marked_paid",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: userId,
      new_data: {
        booking_code: booking.booking_code,
        reference: reference ?? null,
        promoted_status: nextStatus,
      },
    });

    return new Response(JSON.stringify({ success: true, bookingStatus: nextStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    try { return authErrorResponse(err, getCorsHeaders(req)); } catch {
      console.error("[confirm-bank-transfer-paid] error", err);
      return new Response(JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }
  }
});
