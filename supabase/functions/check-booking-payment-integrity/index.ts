/**
 * check-booking-payment-integrity
 *
 * Verifies a booking has BOTH a rental payment row AND a deposit hold (ledger
 * 'hold' entry OR wl_deposit_auth_status in {authorized, captured}).
 *
 * If anything is missing, inserts an admin_alerts row of type 'payment_pending'
 * (idempotent — won't duplicate if a pending one already exists for this booking).
 *
 * Auth: admin/staff via JWT, OR booking owner via JWT, OR caller passing
 * accessToken for the booking. Service role on the server side.
 */

import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { validateAuth, getAdminClient, AuthError, authErrorResponse } from "../_shared/auth.ts";
import { requireBookingOwnerOrToken } from "../_shared/booking-core.ts";
import { createLogger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  const log = createLogger("check-booking-payment-integrity");

  try {
    const { bookingId, accessToken } = await req.json();
    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const auth = await validateAuth(req);
    const authUserId = auth.authenticated ? auth.userId ?? null : null;
    // requireBookingOwnerOrToken throws on unauthorized access
    const booking = await requireBookingOwnerOrToken(bookingId, authUserId, accessToken);

    log.setBooking(bookingId);

    const supabase = getAdminClient();

    // Fetch booking deposit fields
    const { data: bRow } = await supabase
      .from("bookings")
      .select("booking_code, wl_deposit_auth_status, deposit_status, wl_transaction_id")
      .eq("id", bookingId)
      .single();

    const { data: rentalRows } = await supabase
      .from("payments")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("payment_type", "rental")
      .limit(1);

    const { data: holdRows } = await supabase
      .from("deposit_ledger")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("action", "hold")
      .limit(1);

    const missingRental = !rentalRows || rentalRows.length === 0;

    const depositAuthStr = (bRow?.wl_deposit_auth_status || bRow?.deposit_status || "").toLowerCase();
    const depositAuthorized = ["authorized", "captured", "hold_created"].includes(depositAuthStr);
    const hasLedgerHold = !!holdRows && holdRows.length > 0;
    const missingDeposit = !depositAuthorized && !hasLedgerHold;

    const ok = !missingRental && !missingDeposit;

    if (!ok) {
      // Idempotent alert: don't duplicate a pending one.
      const { data: existing } = await supabase
        .from("admin_alerts")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("alert_type", "payment_pending")
        .eq("status", "pending")
        .ilike("title", "Booking missing rental or deposit%")
        .limit(1);

      if (!existing || existing.length === 0) {
        const parts: string[] = [];
        if (missingRental) parts.push("rental payment");
        if (missingDeposit) parts.push("deposit hold");
        const code = bRow?.booking_code || "";

        await supabase.from("admin_alerts").insert({
          booking_id: bookingId,
          alert_type: "payment_pending",
          title: `Booking missing rental or deposit — needs review${code ? ` (${code})` : ""}`,
          message:
            `Booking ${code} is missing: ${parts.join(" + ")}. ` +
            `Online checkout completed but post-payment integrity check failed. ` +
            `Review and take payment manually before vehicle handover.`,
          status: "pending",
        });

        log.warn("Integrity alert raised", { missingRental, missingDeposit });
      }
    } else {
      log.info("Integrity check passed", { bookingId });
    }

    return new Response(
      JSON.stringify({ ok, missingRental, missingDeposit }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Integrity check failed", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
