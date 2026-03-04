/**
 * wl-authorize — Pre-authorization hold via Worldline/Bambora (complete: false)
 * 
 * Replaces create-checkout-hold for deposit hold flow.
 * Accepts a single-use token nonce from the Custom Checkout SDK.
 * Amount is server-derived from booking.deposit_amount.
 * 
 * Writes to separate deposit columns: wl_deposit_transaction_id, wl_deposit_auth_status
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

async function persistDepositAuthorization(
  supabase: ReturnType<typeof getAdminClient>,
  bookingId: string,
  bookingUserId: string,
  amount: number,
  transactionId: string,
  cardholderName: string | null,
  card?: { card_type?: string; last_four?: string; name?: string },
) {
  const bookingUpdate = await supabase.from("bookings").update({
    wl_deposit_transaction_id: transactionId,
    wl_deposit_auth_status: "authorized",
    deposit_status: "authorized",
    deposit_amount: amount,
    deposit_authorized_at: new Date().toISOString(),
    card_last_four: card?.last_four || null,
    card_type: card?.card_type || null,
    card_holder_name: card?.name || cardholderName || null,
  }).eq("id", bookingId);

  if (bookingUpdate.error) throw bookingUpdate.error;

  const paymentInsert = await supabase.from("payments").insert({
    booking_id: bookingId,
    user_id: bookingUserId,
    amount,
    payment_type: "deposit",
    payment_method: "card",
    status: "authorized",
    transaction_id: transactionId,
  });

  if (paymentInsert.error) throw paymentInsert.error;
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
    if (authUserId) log.setUser(authUserId);

    const supabase = getAdminClient();
    const amount = booking.deposit_amount ?? booking.total_amount;

    log.info("Deposit authorization invoked", {
      has_token: !!token,
      has_name: typeof name === "string" && name.trim().length > 0,
      has_access_token: !!accessToken,
      amount,
    });

    // Pre-auth: complete: false — uses -DEP suffix to avoid order_number collision with rental
    const res = await log.timed("bambora_preauth", () =>
      worldlineRequest<BamboraPaymentResponse>("POST", "/payments", {
        order_number: booking.booking_code + "-DEP",
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

    await persistDepositAuthorization(
      supabase,
      bookingId,
      booking.user_id,
      amount,
      String(txn.id),
      typeof name === "string" ? name.trim() : null,
      txn.card,
    );

    log.info("Pre-auth completed", { transaction_id: txn.id, amount });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txn.id,
        amount,
        authCode: txn.auth_code,
        status: "authorized",
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
