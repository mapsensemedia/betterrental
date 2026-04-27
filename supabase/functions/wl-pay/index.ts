/**
 * wl-pay — Rental payment via Worldline/Bambora with FORCED CAPTURE
 *
 * Flow:
 * 1. POST /payments with complete: true (request immediate purchase).
 * 2. If Bambora returns the transaction as Pre-Auth (type "PA") instead of
 *    a Purchase ("P"), immediately call POST /payments/{id}/completions
 *    to capture the funds. This guards against merchant-account level
 *    settings that force pre-auth regardless of the API flag.
 * 3. Only mark the booking confirmed and the payment row "completed"
 *    once funds are actually captured. If capture fails, write a visible
 *    admin alert and leave the payment row in "authorized" state.
 *
 * IMPORTANT: This function only ever auto-captures payment_type = 'rental'.
 * Deposits go through wl-authorize (pre-auth only).
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
  type?: string; // "P" purchase, "PA" pre-auth, "PAC" pre-auth completion
  payment_method?: string;
  amount?: number;
  card?: { card_type: string; last_four: string; name: string };
  code?: number;
  category?: number;
}

const ALREADY_COMPLETED_CODES = new Set([302]);

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

    // Step 1: initial payment attempt (request immediate purchase).
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
    const initialType = (txn.type || "").toUpperCase();
    let captured = initialType === "P" || initialType === "PAC";
    let captureError: string | null = null;
    let captureResponse: unknown = null;

    // Step 2: if it landed as PA (or unknown), force a completion call.
    if (!captured) {
      log.warn("Rental landed as Pre-Auth — forcing completion", {
        transaction_id: txn.id,
        returned_type: initialType || "unknown",
      });
      const cap = await log.timed("bambora_force_completion", () =>
        worldlineRequest<BamboraPaymentResponse>(
          "POST",
          `/payments/${txn.id}/completions`,
          { amount },
        ),
      );
      captureResponse = cap.data;
      const capCode = (cap.data as { code?: number })?.code;
      if (cap.ok && (cap.data as BamboraPaymentResponse)?.approved) {
        captured = true;
      } else if (capCode && ALREADY_COMPLETED_CODES.has(capCode)) {
        // Bambora says "already completed" — treat as captured.
        captured = true;
        log.info("Capture skipped: already completed at gateway", { code: capCode });
      } else {
        captureError = parseWorldlineError(cap.data);
        log.error("Forced completion failed", undefined, { response: cap.data });
      }
    }

    // Step 3: persist booking + payment based on capture outcome.
    if (captured) {
      await supabase.from("bookings").update({
        wl_transaction_id: String(txn.id),
        wl_auth_status: "completed",
        status: "confirmed",
        card_last_four: txn.card?.last_four || null,
        card_type: txn.card?.card_type || null,
        card_holder_name: txn.card?.name || name || null,
      }).eq("id", bookingId);

      await supabase.from("payments").insert({
        booking_id: bookingId,
        user_id: booking.user_id,
        amount,
        payment_type: "rental",
        payment_method: "card",
        status: "completed",
        transaction_id: String(txn.id),
      });

      log.info("Payment captured", { transaction_id: txn.id, amount, initialType });

      return new Response(
        JSON.stringify({
          success: true,
          transactionId: txn.id,
          amount,
          authCode: txn.auth_code,
          captured: true,
          initialType,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Capture failed — record as authorized (not collected) and raise an alert.
    await supabase.from("bookings").update({
      wl_transaction_id: String(txn.id),
      wl_auth_status: "authorized",
      status: "confirmed",
      card_last_four: txn.card?.last_four || null,
      card_type: txn.card?.card_type || null,
      card_holder_name: txn.card?.name || name || null,
    }).eq("id", bookingId);

    await supabase.from("payments").insert({
      booking_id: bookingId,
      user_id: booking.user_id,
      amount,
      payment_type: "rental",
      payment_method: "card",
      status: "authorized",
      transaction_id: String(txn.id),
    });

    // Visible alert in Finance / Alerts dashboards.
    try {
      await supabase.from("admin_alerts").insert({
        booking_id: bookingId,
        alert_type: "payment_pending",
        title: `Rental capture failed — ${booking.booking_code}`,
        message:
          `Rental payment was authorized but capture failed for booking ${booking.booking_code} ` +
          `(amount $${Number(amount).toFixed(2)}, txn ${txn.id}). ` +
          `Bambora response: ${captureError ?? "unknown error"}. ` +
          `Manual capture required from the Finance/Bambora portal.`,
        status: "pending",
      });
    } catch (alertErr) {
      log.error("Failed to create capture-failure alert", alertErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txn.id,
        amount,
        authCode: txn.auth_code,
        captured: false,
        captureError,
        captureResponse,
        warning: "Payment was authorized but capture failed. Manual capture required.",
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
