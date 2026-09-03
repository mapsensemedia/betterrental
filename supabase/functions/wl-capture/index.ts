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
import { requireBookingLocationOrThrow } from "../_shared/location-guard.ts";

function jsonResponse(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function getGatewayCode(data: unknown): number | undefined {
  if (!data || typeof data !== "object" || !("code" in data)) return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "number" ? code : undefined;
}

function getGatewayMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const message = (data as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

function isManualResolutionCode(code?: number, status?: number): boolean {
  return code === 302 || code === 319 || code === 16 || status === 404;
}

function isRetryableGatewayStatus(status?: number): boolean {
  return status === 408 || status === 429 || (typeof status === "number" && status >= 500);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("wl-capture");

  try {
    const user = await getUserOrThrow(req, corsHeaders);

    const { bookingId, amount: captureAmount, kind, manualOverride, reason, terminalReference } = await req.json();
    const captureKind: "rental" | "deposit" = kind === "rental" ? "rental" : "deposit";
    const isManual = manualOverride === true;

    if (isManual) {
      await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin"], corsHeaders);
    } else {
      await requireRoleOrThrow(user.userId, ["super_admin", "manager", "admin", "staff", "finance"], corsHeaders);
    }

    if (!bookingId) {
      return jsonResponse({ error: "bookingId is required" }, 400, corsHeaders);
    }

    // Branch scope: managers may only act on bookings from their own location.
    await requireBookingLocationOrThrow(user.userId, bookingId);

    log.setBooking(bookingId);
    log.setUser(user.userId);

    const supabase = getAdminClient();

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, user_id, location_id, wl_deposit_transaction_id, wl_transaction_id, deposit_amount, deposit_status, wl_auth_status, total_amount, booking_code")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) {
      return jsonResponse({ error: "Booking not found" }, 404, corsHeaders);
    }

    // ── RENTAL CAPTURE ──
    if (captureKind === "rental") {
      const rentalTxnId = booking.wl_transaction_id;
      if (!rentalTxnId) {
        return jsonResponse({ error: "No rental transaction found for this booking" }, 404, corsHeaders);
      }

      if (booking.wl_auth_status === "completed") {
        return jsonResponse({ error: "Rental already captured" }, 409, corsHeaders);
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

        return jsonResponse({ success: true, kind: "rental", capturedAmount: finalAmountManual, manualOverride: true }, 200, corsHeaders);
      }

      const finalAmount = captureAmount ?? booking.total_amount;

      const res = await log.timed("bambora_capture_rental", () =>
        worldlineRequest("POST", `/payments/${rentalTxnId}/completions`, { amount: finalAmount }),
      );

      if (!res.ok) {
        const gatewayCode = getGatewayCode(res.data);
        log.error("Rental capture failed", undefined, { response: res.data, status: res.status, gatewayCode });
        return jsonResponse({
          error: parseWorldlineError(res.data),
          gatewayStatus: res.status,
          gatewayCode,
          gatewayMessage: getGatewayMessage(res.data),
          retryable: isRetryableGatewayStatus(res.status),
          requiresManualResolution: isManualResolutionCode(gatewayCode, res.status),
        }, 422, corsHeaders);
      }

      await supabase.from("bookings").update({
        wl_auth_status: "completed",
      }).eq("id", bookingId);

      await supabase.from("payments")
        .update({ status: "completed" })
        .eq("booking_id", bookingId)
        .eq("transaction_id", rentalTxnId);

      log.info("Rental capture completed", { amount: finalAmount, rentalTxnId });

      return jsonResponse({ success: true, kind: "rental", capturedAmount: finalAmount }, 200, corsHeaders);
    }

    // ── DEPOSIT CAPTURE ──
    const depositTxnId = booking.wl_deposit_transaction_id;

    if (!depositTxnId) {
      return jsonResponse({ error: "No deposit authorization found for this booking" }, 404, corsHeaders);
    }

    if (booking.deposit_status === "captured") {
      return jsonResponse({ error: "Deposit already captured" }, 409, corsHeaders);
    }

    const finalAmount = Number(captureAmount ?? booking.deposit_amount);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      log.error("Invalid deposit amount for capture", undefined, { amount: captureAmount, deposit_amount: booking.deposit_amount });
      return jsonResponse({ error: "Invalid deposit amount — cannot capture hold" }, 422, corsHeaders);
    }

    // Manual terminal resolution: only records a real out-of-band terminal charge/reference.
    if (isManual) {
      const normalizedReference = typeof terminalReference === "string" ? terminalReference.trim() : "";
      const normalizedReason = typeof reason === "string" ? reason.trim() : "";

      if (!/^[A-Za-z0-9\-_]{3,50}$/.test(normalizedReference)) {
        return jsonResponse({ error: "A valid terminal reference / auth number is required" }, 400, corsHeaders);
      }

      if (normalizedReason.length < 5) {
        return jsonResponse({ error: "A reason is required for manual deposit resolution" }, 400, corsHeaders);
      }

      const terminalTxnId = `TERM-DEP-${normalizedReference}`;

      const { data: duplicatePayment } = await supabase
        .from("payments")
        .select("id")
        .eq("transaction_id", terminalTxnId)
        .limit(1)
        .maybeSingle();

      if (duplicatePayment) {
        return jsonResponse({ error: `Terminal reference already exists: ${terminalTxnId}` }, 409, corsHeaders);
      }

      const { error: insertPaymentErr } = await supabase.from("payments").insert({
        booking_id: bookingId,
        user_id: booking.user_id,
        amount: finalAmount,
        payment_type: "deposit",
        payment_method: "terminal",
        status: "completed",
        transaction_id: terminalTxnId,
        location_id: booking.location_id,
      });

      if (insertPaymentErr) {
        log.error("Manual deposit payment insert failed", insertPaymentErr, { terminalTxnId });
        return jsonResponse({ error: "Failed to record terminal deposit charge" }, 500, corsHeaders);
      }

      await supabase.from("payments")
        .update({ status: "voided" })
        .eq("booking_id", bookingId)
        .eq("transaction_id", depositTxnId)
        .eq("status", "authorized");

      const { error: bookingUpdateErr } = await supabase.from("bookings").update({
        deposit_status: "captured",
        deposit_captured_amount: finalAmount,
        deposit_captured_at: new Date().toISOString(),
        deposit_capture_reason: `terminal_manual:${normalizedReason}`,
        wl_deposit_auth_status: "captured",
      }).eq("id", bookingId);

      if (bookingUpdateErr) {
        log.error("Manual deposit booking update failed", bookingUpdateErr, { terminalTxnId });
        return jsonResponse({ error: "Terminal charge recorded but booking update failed" }, 500, corsHeaders);
      }

      const { data: terminalPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("transaction_id", terminalTxnId)
        .maybeSingle();

      await supabase.from("deposit_ledger").insert({
        booking_id: bookingId,
        payment_id: terminalPayment?.id || null,
        action: "capture",
        amount: finalAmount,
        reason: `Terminal deposit charge (${terminalTxnId}): ${normalizedReason}`,
        created_by: user.userId,
      });

      await supabase.from("audit_logs").insert({
        action: "deposit_capture_terminal_manual_resolution",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: user.userId,
        new_data: {
          booking_code: booking.booking_code,
          original_deposit_txn_id: depositTxnId,
          terminal_transaction_id: terminalTxnId,
          amount: finalAmount,
          reason: normalizedReason,
        },
      });

      log.info("Deposit capture manual terminal resolution completed", { amount: finalAmount, depositTxnId, terminalTxnId });

      return jsonResponse({
        success: true,
        kind: "deposit",
        capturedAmount: finalAmount,
        manualOverride: true,
        transactionId: terminalTxnId,
      }, 200, corsHeaders);
    }

    const res = await log.timed("bambora_capture", () =>
      worldlineRequest("POST", `/payments/${depositTxnId}/completions`, { amount: finalAmount }),
    );

    if (!res.ok) {
      const gatewayCode = getGatewayCode(res.data);
      log.error("Capture failed", undefined, { response: res.data, status: res.status, gatewayCode });
      return jsonResponse({
        error: parseWorldlineError(res.data),
        gatewayStatus: res.status,
        gatewayCode,
        gatewayMessage: getGatewayMessage(res.data),
        retryable: isRetryableGatewayStatus(res.status),
        requiresManualResolution: isManualResolutionCode(gatewayCode, res.status),
      }, 422, corsHeaders);
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

    const { data: capturedPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("transaction_id", depositTxnId)
      .maybeSingle();

    await supabase.from("deposit_ledger").insert({
      booking_id: bookingId,
      payment_id: capturedPayment?.id || null,
      action: "capture",
      amount: finalAmount,
      reason: "Worldline deposit hold captured at return",
      created_by: user.userId,
    });

    log.info("Deposit capture completed", { amount: finalAmount, depositTxnId });

    return jsonResponse({ success: true, kind: "deposit", capturedAmount: finalAmount }, 200, corsHeaders);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Capture error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500, corsHeaders);
  }
});
