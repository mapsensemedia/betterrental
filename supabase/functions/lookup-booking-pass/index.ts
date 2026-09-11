/**
 * lookup-booking-pass — public, code-only booking lookup for the pass QR code.
 *
 * The pass QR points at /check-in?code=XXXX. That link is scanned by staff
 * phones and by customers, often with nobody signed in, so an RLS-bound
 * browser query cannot resolve it. This function resolves the code with the
 * service role and returns ONLY the fields the check-in card renders:
 * code, status, pickup/return timestamps and the branch name/address.
 *
 * Never returns prices, customer contact details, card data or ids beyond the
 * booking id needed for staff routing. Rate limited per IP so codes cannot be
 * enumerated in bulk.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { getClientIp } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/auth.ts";
import { checkDbRateLimit } from "../_shared/rate-limit-db.ts";

const CODE_PATTERN = /^[A-Z0-9]{6,12}$/;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!CODE_PATTERN.test(rawCode)) {
      return json({ error: "invalid_code" }, 400);
    }

    const ip = getClientIp(req);
    const limit = await checkDbRateLimit({
      key: `booking-pass-ip:${ip}`,
      windowSeconds: 60,
      maxRequests: 20,
    });
    if (!limit.allowed) {
      return json({ error: "rate_limited" }, 429);
    }

    const supabase = getAdminClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, booking_code, start_at, end_at, status, location_id")
      .eq("booking_code", rawCode)
      .maybeSingle();

    if (error) {
      console.error("[lookup-booking-pass] lookup failed", error);
      return json({ error: "lookup_failed" }, 500);
    }

    if (!booking) {
      return json({ error: "not_found" }, 404);
    }

    let location: { id: string; name: string; address: string | null; city: string | null } | null = null;
    if (booking.location_id) {
      const { data: loc } = await supabase
        .from("locations")
        .select("id, name, address, city")
        .eq("id", booking.location_id)
        .maybeSingle();
      if (loc) location = loc;
    }

    return json({
      booking: {
        id: booking.id,
        booking_code: booking.booking_code,
        start_at: booking.start_at,
        end_at: booking.end_at,
        status: booking.status,
        locations: location,
      },
    });
  } catch (err) {
    console.error("[lookup-booking-pass] unexpected error", err);
    return json({ error: "unexpected_error" }, 500);
  }
});
