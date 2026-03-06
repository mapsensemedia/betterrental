/**
 * wl-cancel-auth — Void/release a pre-authorization deposit hold
 * 
 * Admin/staff only. Voids the auth so the hold is released on the card.
 * Uses wl_deposit_transaction_id (not rental wl_transaction_id).
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { worldlineRequest, parseWorldlineError } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-cancel-auth");

  try {
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId, ["admin", "staff", "finance"], corsHeaders);

    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log.setBooking(bookingId);
    log.setUser(user.userId);

    const supabase = getAdminClient();

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("wl_deposit_transaction_id, wl_transaction_id, deposit_amount, deposit_status")
      .eq("id", bookingId)
      .single();

    if (bErr) {
      log.error("Booking fetch error", bErr);
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if already released
    if (booking.deposit_status === "released" || booking.deposit_status === "voided") {
      return new Response(
        JSON.stringify({ success: false, error: "Hold already released" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use deposit-specific txn id, fall back to legacy wl_transaction_id
    const depositTxnId = booking.wl_deposit_transaction_id || booking.wl_transaction_id;

    if (!depositTxnId) {
      return new Response(
        JSON.stringify({ success: false, error: "No active hold found for this booking" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const voidAmount = Number(booking.deposit_amount) || 0;
    if (voidAmount <= 0) {
      log.error("Invalid deposit amount for void", undefined, { deposit_amount: booking.deposit_amount });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid deposit amount — cannot release hold" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await log.timed("bambora_void", () =>
      worldlineRequest("POST", `/payments/${depositTxnId}/void`, {
        amount: voidAmount,
      }),
    );

    if (!res.ok) {
      const errMsg = parseWorldlineError(res.data);
      log.error("Void failed", undefined, { response: res.data, status: res.status });
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update booking status
    await supabase.from("bookings").update({
      deposit_status: "released",
      deposit_released_at: new Date().toISOString(),
      wl_deposit_auth_status: "released",
    }).eq("id", bookingId);

    // Update payment record if exists
    await supabase.from("payments")
      .update({ status: "voided" })
      .eq("booking_id", bookingId)
      .eq("transaction_id", depositTxnId);

    // Add deposit ledger entry for audit trail
    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      action: "release",
      amount: voidAmount,
      reason: "Hold released via admin panel",
      created_by: user.userId,
    });

    log.info("Auth voided", { depositTxnId, amount: voidAmount });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Void error", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
