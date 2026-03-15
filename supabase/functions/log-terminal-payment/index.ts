import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getUserOrThrow,
  requireRoleOrThrow,
  getAdminClient,
  authErrorResponse,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: staff/admin only
    const { userId } = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(userId, ["admin", "staff"], corsHeaders);

    const { bookingId, receiptNumber, cardLastFour, authCode } = await req.json();

    // --- Input validation ---
    if (!bookingId || typeof bookingId !== "string") {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!receiptNumber || typeof receiptNumber !== "string") {
      return new Response(
        JSON.stringify({ error: "receiptNumber is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmedReceipt = receiptNumber.trim();
    if (!/^[A-Za-z0-9\-_]{3,50}$/.test(trimmedReceipt)) {
      return new Response(
        JSON.stringify({ error: "Receipt number must be 3-50 alphanumeric characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!cardLastFour || !/^\d{4}$/.test(cardLastFour)) {
      return new Response(
        JSON.stringify({ error: "cardLastFour must be exactly 4 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = getAdminClient();

    // --- Fetch booking ---
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, total_amount, status, user_id, location_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Check duplicate receipt ---
    const txnId = `TERM-${trimmedReceipt}`;
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("transaction_id", txnId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "A payment with this receipt number already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Insert payment record ---
    const { error: payErr } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: booking.total_amount,
      payment_type: "rental",
      payment_method: "terminal",
      status: "completed",
      transaction_id: txnId,
      user_id: booking.user_id,
      location_id: booking.location_id,
    });

    if (payErr) {
      console.error("Payment insert error:", payErr);
      return new Response(
        JSON.stringify({ error: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Update booking status + card info ---
    const { error: bookingUpdateErr } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        wl_transaction_id: txnId,
        wl_auth_status: "completed",
        card_last_four: cardLastFour,
      })
      .eq("id", bookingId);

    if (bookingUpdateErr) {
      console.error("Booking update error:", bookingUpdateErr);
      return new Response(
        JSON.stringify({ error: "Payment recorded but booking update failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Audit log ---
    await supabase.from("audit_logs").insert({
      action: "terminal_payment_logged",
      entity_type: "booking",
      entity_id: bookingId,
      user_id: userId,
      new_data: {
        receipt_number: trimmedReceipt,
        card_last_four: cardLastFour,
        auth_code: authCode || null,
        amount: booking.total_amount,
        transaction_id: txnId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txnId,
        amount: booking.total_amount,
        bookingStatus: "confirmed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    try {
      return authErrorResponse(err, corsHeaders);
    } catch {
      console.error("Unhandled error:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }
});
