/**
 * Branch text alerts.
 *
 * Sends a text to every opted-in staff member at the booking's branch when:
 *  - a new booking is created at that branch  (type: "booking")
 *  - a support ticket is opened for a booking at that branch (type: "ticket")
 *
 * Recipients are resolved from staff_assignments by LOCATION ID
 * (sms_alerts_enabled = true, is_active = true, phone on the profile).
 * system_settings -> branch_sms_recipients is used only as a fallback when the
 * location has no opted-in staff. When neither exists we log a warning and
 * write a failed notification_logs row instead of quietly returning success.
 *
 * This function only ever handles the event it is invoked for. It never reads
 * or retries old notification_logs rows.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toE164 } from "../_shared/phone.ts";
import { failureKey, writeNotificationLog } from "../_shared/notify-log.ts";

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

    const notificationType = type === "booking" ? "branch_new_booking" : "branch_new_ticket";

    // Resolve booking (directly or through the ticket)
    let ticket: {
      id: string;
      ticket_id: string;
      subject: string | null;
      description: string | null;
      booking_id: string | null;
      guest_name: string | null;
    } | null = null;
    let resolvedBookingId = bookingId ?? null;

    if (type === "ticket") {
      const { data: t, error: ticketError } = await supabase
        .from("support_tickets_v2")
        .select("id, ticket_id, subject, description, booking_id, customer_id, guest_name, is_urgent, priority")
        .eq("id", ticketId!)
        .maybeSingle();

      if (ticketError || !t) {
        const detail = ticketError?.message || "ticket row not found";
        console.error(`[notify-branch-sms] ticket lookup failed for ${ticketId}: ${detail}`);
        await writeNotificationLog(supabase, {
          channel: "sms",
          notificationType,
          bookingId: null,
          idempotencyKey: failureKey(`branch_sms_ticket_${ticketId}`),
          status: "failed",
          errorMessage: `ticket_lookup_failed: ${detail}`,
        });
        return new Response(JSON.stringify({ error: "ticket_lookup_failed", details: detail }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // deno-lint-ignore no-explicit-any
      ticket = t as any;
      resolvedBookingId = t.booking_id;
    }

    // A ticket raised outside any booking still needs a branch: fall back to the
    // customer's most recent booking so the alert is routed instead of dropped.
    if (!resolvedBookingId && type === "ticket" && (ticket as { customer_id?: string } | null)?.customer_id) {
      const { data: recent } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", (ticket as unknown as { customer_id: string }).customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent?.id) resolvedBookingId = recent.id;
    }

    if (!resolvedBookingId) {
      console.warn(`[notify-branch-sms] ${type} has no booking attached - nothing to route`);
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: null,
        idempotencyKey: failureKey(`branch_sms_${type}_no_booking_${ticketId ?? bookingId}`),
        status: "failed",
        errorMessage: "no_booking_to_route_branch_alert",
      });
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_booking" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // bookings has TWO foreign keys to locations (pickup + return) — the pickup
    // relationship must be named explicitly or PostgREST refuses the embed.
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, start_at, end_at, location_id, user_id, customer_id, pickup_contact_name, pickup_contact_phone, total_amount, paid_offline, locations!bookings_location_id_fkey(id, name)",
      )
      .eq("id", resolvedBookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      const detail = bookingError?.message || "booking row not found";
      console.error(
        `[notify-branch-sms] booking lookup failed for ${resolvedBookingId}: ${detail}`,
        bookingError,
      );
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: resolvedBookingId,
        idempotencyKey: failureKey(`branch_sms_${type}_${resolvedBookingId}`),
        status: "failed",
        errorMessage: `booking_lookup_failed: ${detail}`,
      });
      return new Response(
        JSON.stringify({ error: "booking_lookup_failed", details: detail }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // deno-lint-ignore no-explicit-any
    const branchName = (booking.locations as any)?.name || "";
    const locationId = booking.location_id as string | null;

    // ---- Recipients: opted-in staff at this location (by location ID) ----
    const recipientPhones: string[] = [];
    const invalidPhones: string[] = [];
    let recipientSource = "staff_assignments";

    if (locationId) {
      const { data: assignments, error: assignError } = await supabase
        .from("staff_assignments")
        .select("user_id, display_name, sms_alerts_enabled, is_active")
        .eq("location_id", locationId)
        .eq("is_active", true)
        .eq("sms_alerts_enabled", true);

      if (assignError) {
        console.error("[notify-branch-sms] staff_assignments lookup failed", assignError);
      }

      const staffIds = (assignments || []).map((a: { user_id: string }) => a.user_id).filter(Boolean);
      if (staffIds.length > 0) {
        const { data: staffProfiles } = await supabase
          .from("profiles")
          .select("id, phone")
          .in("id", staffIds);

        for (const p of staffProfiles || []) {
          const e164 = toE164(p.phone);
          if (e164) {
            if (!recipientPhones.includes(e164)) recipientPhones.push(e164);
          } else if (p.phone) {
            invalidPhones.push(String(p.phone));
          }
        }
      }
    } else {
      console.warn(`[notify-branch-sms] booking ${booking.booking_code} has no location_id`);
    }

    // ---- Fallback: branch_sms_recipients, only when nobody is opted in ----
    if (recipientPhones.length === 0) {
      recipientSource = "branch_sms_recipients_fallback";
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

      const fallbackRaw =
        recipients[branchName] ||
        Object.entries(recipients).find(([k]) =>
          branchName.toLowerCase().includes(k.split(" ")[0].toLowerCase()),
        )?.[1];

      const fallback = toE164(fallbackRaw);
      if (fallback) recipientPhones.push(fallback);
      else if (fallbackRaw) invalidPhones.push(String(fallbackRaw));
    }

    if (invalidPhones.length > 0) {
      console.warn(
        `[notify-branch-sms] invalid_phone for branch "${branchName}": ${invalidPhones.join(", ")}`,
      );
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: booking.id,
        idempotencyKey: failureKey(`branch_sms_invalid_${booking.id}`),
        status: "failed",
        errorMessage: `invalid_phone: ${invalidPhones.join(", ")}`,
      });
    }

    if (recipientPhones.length === 0) {
      console.warn(
        `[notify-branch-sms] NO RECIPIENT for branch "${branchName}" (location ${locationId}) - branch alert not sent for ${booking.booking_code}`,
      );
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: booking.id,
        idempotencyKey: failureKey(`branch_sms_no_recipient_${booking.id}`),
        status: "failed",
        errorMessage: `no_recipient_for_location: ${branchName || locationId || "unknown"}`,
      });
      return new Response(
        JSON.stringify({ success: false, reason: "no_recipient", branch: branchName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Renter name + phone (never a staff record) ----
    let renter = "";
    let renterPhone = "";
    if (booking.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", booking.user_id)
        .maybeSingle();
      renter = profile?.full_name || "";
      renterPhone = profile?.phone || "";
    }
    if ((!renter || !renterPhone) && booking.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name, phone")
        .eq("id", booking.customer_id)
        .maybeSingle();
      renter = renter || customer?.full_name || "";
      renterPhone = renterPhone || customer?.phone || "";
    }
    if (!renter) renter = booking.pickup_contact_name || ticket?.guest_name || "Customer";
    if (!renterPhone) renterPhone = booking.pickup_contact_phone || "";


    let message = "";

    if (type === "booking") {
      // Paid online only when money has actually been collected
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, status, payment_type")
        .eq("booking_id", booking.id)
        .in("status", ["completed", "captured"]);

      const collected = (payments || [])
        // deno-lint-ignore no-explicit-any
        .filter((p: any) => p.payment_type !== "deposit")
        // deno-lint-ignore no-explicit-any
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
        `Ticket: ${ticket?.ticket_id}`,
        `Renter: ${renter}`,
        `Phone: ${renterPhone || "not on file"}`,
        `Booking: ${booking.booking_code}`,

        `Issue: ${String(ticket?.subject || "").slice(0, 80)}`,
        String(ticket?.description || "").slice(0, 160),
      ].join("\n");
    }

    if (!twilioSid || !twilioToken || !twilioFrom) {
      console.error("[notify-branch-sms] Twilio not configured - branch alert not sent");
      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: booking.id,
        idempotencyKey: failureKey(`branch_sms_unconfigured_${booking.id}`),
        status: "failed",
        errorMessage: "sms_not_configured",
      });
      return new Response(JSON.stringify({ success: false, reason: "sms_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ to: string; ok: boolean; sid?: string | null }> = [];

    for (const toPhone of recipientPhones) {
      // One text per recipient per booking/ticket event.
      const idempotencyKey =
        type === "booking"
          ? `branch_sms_booking_${booking.id}_${toPhone}`
          : `branch_sms_ticket_${ticket?.id}_${toPhone}`;

      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        console.log(`[notify-branch-sms] already sent to ${toPhone} for this event - skipping`);
        results.push({ to: toPhone, ok: true });
        continue;
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

      await writeNotificationLog(supabase, {
        channel: "sms",
        notificationType,
        bookingId: booking.id,
        userId: booking.user_id,
        idempotencyKey,
        status: twilioResponse.ok ? "sent" : "failed",
        // deno-lint-ignore no-explicit-any
        providerId: (twilioResult as any)?.sid || null,
        errorMessage: twilioResponse.ok ? null : JSON.stringify(twilioResult),
      });

      if (!twilioResponse.ok) {
        console.error(
          `[notify-branch-sms] Twilio error for ${toPhone}`,
          twilioResponse.status,
          twilioResult,
        );
      } else {
        console.log(
          `[notify-branch-sms] sent ${notificationType} to ${toPhone} (source: ${recipientSource})`,
        );
      }

      results.push({
        to: toPhone,
        ok: twilioResponse.ok,
        // deno-lint-ignore no-explicit-any
        sid: (twilioResult as any)?.sid || null,
      });
    }

    const anySent = results.some((r) => r.ok);

    return new Response(
      JSON.stringify({ success: anySent, branch: branchName, recipientSource, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[notify-branch-sms] unexpected error", error);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
