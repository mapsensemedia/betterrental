/**
 * Support ticket SMS to the CUSTOMER.
 *
 * Two kinds, chosen by the `kind` field:
 *   - "reply"   (default, unchanged behaviour): first staff reply on a ticket.
 *   - "created": confirmation the moment the customer submits a ticket, with the
 *                branch callback number.
 *
 * Only ever sends for the event happening right now. Nothing here reads old
 * tickets or resends/backfills anything. Every outcome (sent, failed, no phone)
 * writes exactly one notification_logs row.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toE164 } from "../_shared/phone.ts";
import { resolveBookingContact, writeNotificationLog, failureKey } from "../_shared/notify-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SUPPORT_PHONE = "+1 (604) 763-4242";

interface SendSupportSmsRequest {
  ticketId: string;
  kind?: "created" | "reply";
  // Optional hints from older callers; the ticket row is authoritative.
  customerId?: string;
  guestPhone?: string;
  guestName?: string;
  ticketNumber?: string;
  subject?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: SendSupportSmsRequest = await req.json();
    const ticketId = body.ticketId;
    const kind = body.kind === "created" ? "created" : "reply";

    if (!ticketId) {
      return json({ error: "ticketId is required" }, 400);
    }

    const notificationType = kind === "created" ? "support_ticket_created" : "support_chat_started";
    const idempotencyKey =
      kind === "created" ? `support_ticket_created_${ticketId}` : `support_chat_start_${ticketId}`;

    // ── Ticket row is the source of truth ────────────────────────────────
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets_v2")
      .select(
        "id, ticket_id, subject, customer_id, booking_id, guest_phone, guest_name, created_by_type",
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      const detail = ticketError?.message ?? "ticket not found";
      console.error("[send-support-sms] ticket lookup failed:", detail);
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        idempotencyKey: failureKey(idempotencyKey),
        status: "failed",
        errorMessage: `ticket lookup failed: ${detail}`,
      });
      return json({ error: "Ticket lookup failed", details: detail }, 404);
    }

    const ticketNumber = ticket.ticket_id || body.ticketNumber || "your request";
    const subject = ticket.subject || body.subject || "";

    // ── Duplicate guard: one text per ticket per kind ────────────────────
    const { data: existing } = await supabase
      .from("notification_logs")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      console.log(`[send-support-sms] ${kind} already sent for ${ticketNumber}`);
      return json({ success: true, duplicate: true });
    }

    // ── Recipient + branch callback number ──────────────────────────────
    let booking: {
      id: string;
      user_id: string | null;
      customer_id: string | null;
      pickup_contact_name: string | null;
      pickup_contact_phone: string | null;
      location_id: string | null;
    } | null = null;

    if (ticket.booking_id) {
      const { data } = await supabase
        .from("bookings")
        .select("id, user_id, customer_id, pickup_contact_name, pickup_contact_phone, location_id")
        .eq("id", ticket.booking_id)
        .maybeSingle();
      booking = data ?? null;
    }

    const contact = await resolveBookingContact(supabase, {
      user_id: booking?.user_id ?? ticket.customer_id,
      customer_id: booking?.customer_id ?? null,
      pickup_contact_name: booking?.pickup_contact_name ?? ticket.guest_name ?? null,
      pickup_contact_phone: booking?.pickup_contact_phone ?? ticket.guest_phone ?? null,
    });

    const rawPhone = ticket.guest_phone || contact.phone || body.guestPhone || null;
    const toPhone = toE164(rawPhone);

    let branchPhone = DEFAULT_SUPPORT_PHONE;
    if (booking?.location_id) {
      const { data: loc } = await supabase
        .from("locations")
        .select("phone")
        .eq("id", booking.location_id)
        .maybeSingle();
      if (loc?.phone) branchPhone = loc.phone;
    }

    if (!twilioSid || !twilioToken || !twilioFrom) {
      console.warn("[send-support-sms] Twilio not configured");
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: ticket.booking_id,
        userId: ticket.customer_id,
        idempotencyKey: failureKey(idempotencyKey),
        status: "failed",
        errorMessage: "twilio_not_configured",
      });
      return json({ success: false, skipped: true, reason: "SMS service not configured" });
    }

    if (!toPhone) {
      console.warn(`[send-support-sms] no usable phone for ticket ${ticketNumber}`);
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: ticket.booking_id,
        userId: ticket.customer_id,
        idempotencyKey: failureKey(idempotencyKey),
        status: "failed",
        errorMessage: rawPhone ? `invalid_phone: ${rawPhone}` : "no_phone_on_file",
      });
      return json({ success: false, skipped: true, reason: "No usable phone number on file" });
    }

    // ── Message body ────────────────────────────────────────────────────
    const appUrl = Deno.env.get("APP_URL") || "https://c2crental.ca";
    const dashboardLink = `${appUrl}/dashboard`;
    const subjectLine = subject
      ? `\nRe: ${subject.substring(0, 60)}${subject.length > 60 ? "..." : ""}`
      : "";

    const message =
      kind === "created"
        ? `C2C Rental Support: We've received your request ${ticketNumber}.${subjectLine}\n` +
          `Our team is reviewing it. Need to talk to us now? Call ${branchPhone}.\n` +
          `You can also reply from your dashboard: ${dashboardLink}`
        : `C2C Rental Support: Your ticket ${ticketNumber} has a new reply from our team.${subjectLine}\n\n` +
          `Log in to your dashboard to view and reply:\n${dashboardLink}`;

    // ── Send ────────────────────────────────────────────────────────────
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const authHeader = btoa(`${twilioSid}:${twilioToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toPhone, From: twilioFrom, Body: message }),
    });

    const twilioResult = await twilioResponse.json();

    await writeNotificationLog(supabase, {
      channel: "sms",
      notificationType,
      bookingId: ticket.booking_id,
      userId: ticket.customer_id,
      idempotencyKey: twilioResponse.ok ? idempotencyKey : failureKey(idempotencyKey),
      status: twilioResponse.ok ? "sent" : "failed",
      providerId: twilioResult.sid || null,
      errorMessage: twilioResponse.ok ? null : JSON.stringify(twilioResult),
    });

    if (!twilioResponse.ok) {
      console.error("[send-support-sms] Twilio error:", twilioResult);
      return json({ error: "Failed to send SMS", details: twilioResult }, 500);
    }

    console.log(`[send-support-sms] ${kind} sent for ${ticketNumber}:`, twilioResult.sid);
    return json({ success: true, messageId: twilioResult.sid });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[send-support-sms] unexpected failure:", detail);
    return json({ error: detail }, 500);
  }
});
