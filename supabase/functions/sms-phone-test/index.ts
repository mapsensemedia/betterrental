/**
 * TEMPORARY test-only function. Delete after verification.
 * Renders the confirmation template for one real booking per location and
 * sends it ONLY to a single hard-coded allowed test number.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BRAND, fmtDateTimeVan, getBookingContactPhone } from "../_shared/sms-format.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TEST_NUMBER = "+16047351917";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = Deno.env.get("TWILIO_PHONE_NUMBER")!;

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  const results: Array<Record<string, unknown>> = [];

  for (const loc of locations ?? []) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_code, start_at, end_at, location_id, return_location_id")
      .eq("location_id", loc.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!booking) {
      results.push({ location: loc.name, skipped: "no booking" });
      continue;
    }

    const contactPhone = await getBookingContactPhone(supabase, booking);
    const body =
      `${BRAND}: Booking ${booking.booking_code} confirmed!\n\nLocation: ${loc.name}\n` +
      `Pickup: ${fmtDateTimeVan(booking.start_at)}\nReturn: ${fmtDateTimeVan(booking.end_at)}\n\n` +
      `Questions? Call ${contactPhone}`;

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: ALLOWED_TEST_NUMBER, From: from, Body: body }),
      },
    );
    const json = await res.json();
    results.push({
      location: loc.name,
      contactPhone,
      ok: res.ok,
      sid: json.sid ?? null,
      error: res.ok ? null : json.message,
      body,
    });
  }

  return new Response(JSON.stringify({ to: ALLOWED_TEST_NUMBER, results }, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
