/**
 * wl-authorize — Pre-authorization hold via Worldline/Bambora (complete: false)
 * 
 * Replaces create-checkout-hold for deposit hold flow.
 * Accepts a single-use token nonce from the Custom Checkout SDK.
 * Amount is server-derived from booking.deposit_amount.
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
import { worldlineRequest, parseWorldlineError } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

interface BamboraPaymentResponse {
  id: string;
  approved: number;
  message: string;
  auth_code: string;
  order_number: string;
  amount: number;
  card?: { card_type: string; last_four: string; name: string };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-authorize");

  try {
    const { bookingId, accessToken, token, name } = await req.json();

    if (!bookingId || !token) {
      return new Response(
        JSON.stringify({ error: "bookingId and token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = await validateAuth(req);
    const authUserId = auth.authenticated ? auth.userId ?? null : null;
    const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);

    log.setBooking(bookingId);

    const supabase = getAdminClient();
    const amount = booking.deposit_amount ?? booking.total_amount;

    // Pre-auth: complete: false
    const res = await log.timed("bambora_preauth", () =>
      worldlineRequest<BamboraPaymentResponse>("POST", "/payments", {
        order_number: booking.booking_code,
        amount,
        payment_method: "token",
        token: { code: token, name: name || "Cardholder" },
        complete: false,
      }),
    );

    if (!res.ok || !res.data.approved) {
      log.error("Pre-auth declined", undefined, { response: res.data });
      return new Response(
        JSON.stringify({ error: parseWorldlineError(res.data), declined: true }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const txn = res.data;

    await supabase.from("bookings").update({
      wl_transaction_id: String(txn.id),
      wl_auth_status: "authorized",
      deposit_status: "authorized",
      deposit_amount: amount,
      deposit_authorized_at: new Date().toISOString(),
      card_last_four: txn.card?.last_four || null,
      card_type: txn.card?.card_type || null,
      card_holder_name: txn.card?.name || name || null,
    }).eq("id", bookingId);

    await supabase.from("payments").insert({
      booking_id: bookingId,
      user_id: booking.user_id,
      amount,
      payment_type: "deposit",
      payment_method: "card",
      status: "authorized",
      transaction_id: String(txn.id),
    });

    log.info("Pre-auth completed", { transaction_id: txn.id, amount });

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
    log.error("Pre-auth failed", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
