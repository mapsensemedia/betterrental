/**
 * wl-cancel-auth — Void/release a pre-authorization hold
 * 
 * Admin/staff only. Voids the auth so the hold is released on the card.
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
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log.setBooking(bookingId);
    log.setUser(user.userId);

    const supabase = getAdminClient();

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("wl_transaction_id, deposit_amount, deposit_status")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking?.wl_transaction_id) {
      return new Response(
        JSON.stringify({ error: "No Worldline transaction found for this booking" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (booking.deposit_status === "released" || booking.deposit_status === "voided") {
      return new Response(
        JSON.stringify({ error: "Authorization already released" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await log.timed("bambora_void", () =>
      worldlineRequest("POST", `/payments/${booking.wl_transaction_id}/void`, {
        amount: booking.deposit_amount,
      }),
    );

    if (!res.ok) {
      log.error("Void failed", undefined, { response: res.data });
      return new Response(
        JSON.stringify({ error: parseWorldlineError(res.data) }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("bookings").update({
      deposit_status: "released",
      deposit_released_at: new Date().toISOString(),
      wl_auth_status: "voided",
    }).eq("id", bookingId);

    await supabase.from("payments")
      .update({ status: "voided" })
      .eq("booking_id", bookingId)
      .eq("transaction_id", booking.wl_transaction_id);

    log.info("Auth voided", { transaction_id: booking.wl_transaction_id });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error, corsHeaders);
    log.error("Void error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
