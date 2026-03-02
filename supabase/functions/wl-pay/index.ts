/**
 * wl-pay — Full payment via Worldline/Bambora (complete: true)
 * 
 * Replaces create-checkout-session for "pay now" flow.
 * Accepts a single-use token nonce from the Custom Checkout SDK.
 * Amount is server-derived from the booking record.
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
import { worldlineRequest, parseWorldlineError } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

interface BamboraPaymentResponse {
  id: string;
  authorizing_merchant_id: number;
  approved: number;
  message_id: number;
  message: string;
  auth_code: string;
  created: string;
  order_number: string;
  type: string;
  payment_method: string;
  amount: number;
  card?: { card_type: string; last_four: string; name: string };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-pay");

  try {
    const { bookingId, accessToken, token, name } = await req.json();

    if (!bookingId || !token) {
      return new Response(
        JSON.stringify({ error: "bookingId and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: user or guest access token
    const auth = await validateAuth(req);
    const authUserId = auth.authenticated ? auth.userId ?? null : null;
    const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);

    log.setBooking(bookingId);
    if (authUserId) log.setUser(authUserId);

    const supabase = getAdminClient();
    const amount = booking.total_amount;

    // Call Bambora Payments API — complete: true = immediate capture
    const res = await log.timed("bambora_payment", () =>
      worldlineRequest<BamboraPaymentResponse>("POST", "/payments", {
        order_number: booking.booking_code,
        amount,
        payment_method: "token",
        token: { code: token, name: name || "Cardholder" },
        complete: true,
      }),
    );

    if (!res.ok || !res.data.approved) {
      log.error("Payment declined", undefined, { response: res.data });
      return new Response(
        JSON.stringify({ error: parseWorldlineError(res.data), declined: true }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const txn = res.data;

    // Update booking with Worldline transaction ID
    await supabase.from("bookings").update({
      wl_transaction_id: String(txn.id),
      wl_auth_status: "completed",
      status: "confirmed",
      card_last_four: txn.card?.last_four || null,
      card_type: txn.card?.card_type || null,
      card_holder_name: txn.card?.name || name || null,
    }).eq("id", bookingId);

    // Insert payment record
    await supabase.from("payments").insert({
      booking_id: bookingId,
      user_id: booking.user_id,
      amount,
      payment_type: "rental",
      payment_method: "card",
      status: "completed",
      transaction_id: String(txn.id),
    });

    log.info("Payment completed", { transaction_id: txn.id, amount });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txn.id,
        amount,
        authCode: txn.auth_code,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Payment failed", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
