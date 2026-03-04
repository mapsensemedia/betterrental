/**
 * wl-capture — Capture a previously authorized deposit hold
 * 
 * Admin/staff only. Captures the full or partial amount of a pre-auth.
 * Uses wl_deposit_transaction_id (not rental wl_transaction_id).
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { worldlineRequest, parseWorldlineError } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-capture");

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId, ["admin", "staff", "finance"], corsHeaders);

    const { bookingId, amount: captureAmount } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log.setBooking(bookingId);
    log.setUser(user.userId);

    const supabase = getAdminClient();

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("wl_deposit_transaction_id, wl_transaction_id, deposit_amount, deposit_status, booking_code")
      .eq("id", bookingId)
      .single();

    // Use deposit-specific txn id, fall back to legacy wl_transaction_id
    const depositTxnId = booking?.wl_deposit_transaction_id || booking?.wl_transaction_id;

    if (bErr || !depositTxnId) {
      return new Response(
        JSON.stringify({ error: "No deposit authorization found for this booking" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (booking.deposit_status === "captured") {
      return new Response(
        JSON.stringify({ error: "Deposit already captured" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalAmount = captureAmount ?? booking.deposit_amount;

    const res = await log.timed("bambora_capture", () =>
      worldlineRequest("POST", `/payments/${depositTxnId}/completions`, {
        amount: finalAmount,
      }),
    );

    if (!res.ok) {
      log.error("Capture failed", undefined, { response: res.data });
      return new Response(
        JSON.stringify({ error: parseWorldlineError(res.data) }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("bookings").update({
      deposit_status: "captured",
      deposit_captured_amount: finalAmount,
      deposit_captured_at: new Date().toISOString(),
      deposit_capture_reason: "manual_capture",
      wl_deposit_auth_status: "captured",
    }).eq("id", bookingId);

    // Update payment record for the deposit transaction
    await supabase.from("payments")
      .update({ status: "completed" })
      .eq("booking_id", bookingId)
      .eq("transaction_id", depositTxnId);

    log.info("Capture completed", { amount: finalAmount, depositTxnId });

    return new Response(
      JSON.stringify({ success: true, capturedAmount: finalAmount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Capture error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
