/**
 * wl-capture — Capture a previously authorized Bambora transaction.
 *
 * Supports two kinds:
 *   - kind: 'deposit' (default) — captures wl_deposit_transaction_id, updates deposit_*.
 *   - kind: 'rental'             — captures wl_transaction_id, marks rental payment 'completed'.
 *
 * Admin/staff/finance only.
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

    const { bookingId, amount: captureAmount, kind, manualOverride, reason } = await req.json();
    const captureKind: "rental" | "deposit" = kind === "rental" ? "rental" : "deposit";
    const isManual = manualOverride === true;

    if (isManual) {
      await requireRoleOrThrow(user.userId, ["admin"], corsHeaders);
    } else {
      await requireRoleOrThrow(user.userId, ["admin", "staff", "finance"], corsHeaders);
    }

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
      .select("wl_deposit_transaction_id, wl_transaction_id, deposit_amount, deposit_status, wl_auth_status, total_amount, booking_code")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── RENTAL CAPTURE ──
    if (captureKind === "rental") {
      const rentalTxnId = booking.wl_transaction_id;
      if (!rentalTxnId) {
        return new Response(
          JSON.stringify({ error: "No rental transaction found for this booking" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (booking.wl_auth_status === "completed") {
        return new Response(
          JSON.stringify({ error: "Rental already captured" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── MANUAL OVERRIDE (rental) ── bypass Bambora completion call
      if (isManual) {
        const finalAmountManual = captureAmount ?? booking.total_amount;

        await supabase.from("bookings").update({
          wl_auth_status: "completed",
        }).eq("id", bookingId);

        await supabase.from("payments")
          .update({ status: "completed", payment_method: "card_manual_capture" })
          .eq("booking_id", bookingId)
          .eq("transaction_id", rentalTxnId);

        await supabase.from("audit_logs").insert({
          action: "rental_capture_manual_override",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: user.userId,
          new_data: {
            rental_txn_id: rentalTxnId,
            amount: finalAmountManual,
            reason: reason || null,
            booking_code: booking.booking_code,
          },
        });

        log.info("Rental capture manual override", { amount: finalAmountManual, rentalTxnId, reason });

        return new Response(
          JSON.stringify({ success: true, kind: "rental", capturedAmount: finalAmountManual, manualOverride: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const finalAmount = captureAmount ?? booking.total_amount;

      const res = await log.timed("bambora_capture_rental", () =>
        worldlineRequest("POST", `/payments/${rentalTxnId}/completions`, { amount: finalAmount }),
      );

      if (!res.ok) {
        log.error("Rental capture failed", undefined, { response: res.data });
        return new Response(
          JSON.stringify({ error: parseWorldlineError(res.data) }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase.from("bookings").update({
        wl_auth_status: "completed",
      }).eq("id", bookingId);

      await supabase.from("payments")
        .update({ status: "completed" })
        .eq("booking_id", bookingId)
        .eq("transaction_id", rentalTxnId);

      log.info("Rental capture completed", { amount: finalAmount, rentalTxnId });

      return new Response(
        JSON.stringify({ success: true, kind: "rental", capturedAmount: finalAmount }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── DEPOSIT CAPTURE (legacy default behavior) ──
    const depositTxnId = booking.wl_deposit_transaction_id || booking.wl_transaction_id;

    if (!depositTxnId) {
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
      worldlineRequest("POST", `/payments/${depositTxnId}/completions`, { amount: finalAmount }),
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

    await supabase.from("payments")
      .update({ status: "completed" })
      .eq("booking_id", bookingId)
      .eq("transaction_id", depositTxnId);

    log.info("Deposit capture completed", { amount: finalAmount, depositTxnId });

    return new Response(
      JSON.stringify({ success: true, kind: "deposit", capturedAmount: finalAmount }),
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
