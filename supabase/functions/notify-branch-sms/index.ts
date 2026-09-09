/**
 * Branch text alerts.
 *
 * Sends a text to the branch's operations number when:
 *  - a new booking is created at that branch  (type: "booking")
 *  - a support ticket is opened for a booking at that branch (type: "ticket")
 *
 * The recipient per branch lives in system_settings -> branch_sms_recipients
 * (JSON keyed by location name) so the number can change without a code edit.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAN = "America/Vancouver";

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: VAN,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: VAN,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    const body = await req.json().catch(() => ({}));
    const type: string = body?.type === "ticket" ? "ticket" : "booking";
    const bookingId: string | undefined = body?.bookingId;
    const ticketId: string | undefined = body?.ticketId;

    if (type === "booking" && !bookingId) {
      return new Response(JSON.stringify({ error: "bookingId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (type === "ticket" && !ticketId) {
      return new Response(JSON.stringify({ error: "ticketId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve booking (directly or through the ticket)
    let ticket: any = null;
    let resolvedBookingId = bookingId ?? null;

    if (type === "ticket") {
      const { data: t } = await supabase
        .from("support_tickets_v2")
        .select("id, ticket_id, subject, description, booking_id, customer_id, guest_name, is_urgent, priority")
        .eq("id", ticketId!)
        .maybeSingle();
      if (!t) {
        return new Response(JSON.stringify({ error: "Ticket not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      ticket = t;
      resolvedBookingId = t.booking_id;
    }

    if (!resolvedBookingId) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_booking" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, start_at, end_at, location_id, user_id, guest_name, guest_email, total_amount, paid_offline, locations!inner(name)",
      )
      .eq("id", resolvedBookingId)
      .maybeSingle();

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const branchName = (booking.locations as any)?.name || "";

    // Recipient for this branch
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "branch_sms_recipients")
      .maybeSingle();

    let recipients: Record<string, string> = {};
    try {
      recipients = setting?.value ? JSON.parse(setting.value) : {};
    } catch {
      recipients = {};
    }

    const toPhone =
      recipients[branchName] ||
      Object.entries(recipients).find(([k]) =>
        branchName.toLowerCase().includes(k.split(" ")[0].toLowerCase()),
      )?.[1];

    if (!toPhone) {
      console.log(`[notify-branch-sms] no recipient configured for branch "${branchName}"`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_recipient" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Renter name
    let renter = booking.guest_name || "";
    if (!renter && booking.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", booking.user_id)
        .maybeSingle();
      renter = profile?.full_name || "";
    }
    renter = renter || "Customer";

    let message = "";

    if (type === "booking") {
      // Paid online only when money has actually been collected
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, status, payment_type")
        .eq("booking_id", booking.id)
        .in("status", ["completed", "captured"]);

      const collected = (payments || [])
        .filter((p: any) => p.payment_type !== "deposit")
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      const paid = collected > 0 || booking.paid_offline ? "Online" : "At pick-up";

      message = [
        `New C2C ${branchName} booking`,
        `Renter: ${renter}`,
        `Pickup: ${fmtDate(booking.start_at)}`,
        `Pickup time: ${fmtTime(booking.start_at)}`,
        `Booking: ${booking.booking_code}`,
        `Paid: ${paid}`,
        `Return: ${fmtDate(booking.end_at)}`,
        `Return time: ${fmtTime(booking.end_at)}`,
      ].join("\n");
    } else {
      message = [
        `New C2C ${branchName} support ticket`,
        `Ticket: ${ticket.ticket_id}`,
        `Renter: ${renter}`,
        `Booking: ${booking.booking_code}`,
        `Issue: ${String(ticket.subject || "").slice(0, 80)}`,
        String(ticket.description || "").slice(0, 160),
      ].join("\n");
    }

    if (!twilioSid || !twilioToken || !twilioFrom) {
      console.warn("[notify-branch-sms] Twilio not configured - skipping");
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "sms_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: one text per booking/ticket event
    const idempotencyKey =
      type === "booking" ? `branch_sms_booking_${booking.id}` : `branch_sms_ticket_${ticket.id}`;

    const { data: existing } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: toPhone, From: twilioFrom, Body: message }),
      },
    );

    const twilioResult = await twilioResponse.json().catch(() => ({}));

    await supabase.from("notification_logs").insert({
      channel: "sms",
      notification_type: type === "booking" ? "branch_new_booking" : "branch_new_ticket",
      booking_id: booking.id,
      user_id: booking.user_id,
      idempotency_key: idempotencyKey,
      status: twilioResponse.ok ? "sent" : "failed",
      provider_id: (twilioResult as any)?.sid || null,
      error_message: twilioResponse.ok ? null : JSON.stringify(twilioResult),
      sent_at: twilioResponse.ok ? new Date().toISOString() : null,
    });

    if (!twilioResponse.ok) {
      console.error("[notify-branch-sms] Twilio error", twilioResponse.status, twilioResult);
      return new Response(
        JSON.stringify({ error: "sms_failed", status: twilioResponse.status, details: twilioResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notify-branch-sms] unexpected error", error);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
