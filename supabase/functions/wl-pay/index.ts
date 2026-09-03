/**
 * wl-pay — Rental payment via Worldline/Bambora (NO AUTO-CAPTURE)
 *
 * Behavior:
 * 1. POST /payments with complete: true (request purchase from Bambora).
 * 2. If Bambora returns approved=1:
 *      - type "P"  (purchase)            → record payment as 'completed', booking status → confirmed.
 *      - type "PA" (pre-auth)            → record payment as 'authorized', booking status → confirmed.
 *      - any other approved type         → record payment as 'authorized' (safe default).
 * 3. ALWAYS return success when approved=1, regardless of capture status.
 *    Capture for authorized rentals is performed manually from the admin panel
 *    via the wl-capture edge function (kind: 'rental').
 *
 * Removed (intentionally):
 * - Forced /completions call.
 * - "Rental capture failed" admin_alerts insert.
 *
 * Deposits go through wl-authorize (always pre-auth). Not handled here.
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
import { worldlineRequest, parseWorldlineError } from "../_shared/worldline.ts";
import { createLogger } from "../_shared/logger.ts";

interface BamboraPaymentResponse {
  id: string;
  authorizing_merchant_id?: number;
  approved: number;
  message_id?: number;
  message?: string;
  auth_code?: string;
  created?: string;
  order_number?: string;
  type?: string; // "P" purchase, "PA" pre-auth
  payment_method?: string;
  amount?: number;
  card?: { card_type: string; last_four: string; name: string; expiry_month?: string; expiry_year?: string };
  code?: number;
  category?: number;
}

/** Format gateway expiry month/year as MM/YY. Returns null when unavailable. */
function formatCardExpiry(card?: { expiry_month?: string; expiry_year?: string }): string | null {
  const mm = card?.expiry_month?.toString().padStart(2, "0");
  const yy = card?.expiry_year?.toString().slice(-2);
  if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return null;
  return `${mm}/${yy}`;
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

    const auth = await validateAuth(req);
    const authUserId = auth.authenticated ? auth.userId ?? null : null;
    const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);

    log.setBooking(bookingId);
    if (authUserId) log.setUser(authUserId);

    const supabase = getAdminClient();
    const amount = booking.total_amount;

    // Single payment attempt — no force-capture follow-up.
    const res = await log.timed("bambora_payment", () =>
      worldlineRequest<BamboraPaymentResponse>("POST", "/payments", {
        order_number: booking.booking_code,
        amount,
        payment_method: "token",
        token: { code: token, name: name || "Cardholder" },
        complete: true,
      }),
    );

    if (!res.ok || !res.data?.approved) {
      log.error("Payment declined", undefined, { response: res.data });
      return new Response(
        JSON.stringify({
          error: parseWorldlineError(res.data),
          declined: true,
          debug: {
            bamboraStatus: res.status,
            bamboraOk: res.ok,
            bamboraMessage: res.data?.message,
            bamboraCode: res.data?.message_id,
            bamboraApproved: res.data?.approved,
          },
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const txn = res.data;
    const returnedType = (txn.type || "").toUpperCase();
    // "P" = purchase (already captured). Anything else (PA or unknown) is treated as authorized only.
    const captured = returnedType === "P";
    const paymentRowStatus = captured ? "completed" : "authorized";
    const wlAuthStatus = captured ? "completed" : "authorized";

    await supabase.from("bookings").update({
      wl_transaction_id: String(txn.id),
      wl_auth_status: wlAuthStatus,
      status: "confirmed",
      card_last_four: txn.card?.last_four || null,
      card_type: txn.card?.card_type || null,
      card_holder_name: txn.card?.name || name || null,
      ...(formatCardExpiry(txn.card) ? { card_expiry: formatCardExpiry(txn.card) } : {}),
    }).eq("id", bookingId);

    await supabase.from("payments").insert({
      booking_id: bookingId,
      user_id: booking.user_id,
      amount,
      payment_type: "rental",
      payment_method: "card",
      status: paymentRowStatus,
      transaction_id: String(txn.id),
    });

    log.info("Rental payment recorded", {
      transaction_id: txn.id,
      amount,
      returnedType,
      paymentRowStatus,
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txn.id,
        amount,
        authCode: txn.auth_code,
        captured,
        status: paymentRowStatus,
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
