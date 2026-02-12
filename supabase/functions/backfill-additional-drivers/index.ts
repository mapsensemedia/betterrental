import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Regulatory daily fees (must match src/lib/pricing.ts)
const PVRT_DAILY_FEE = 1.5;
const ACSRCH_DAILY_FEE = 1.0;

function toCents(n: number | null | undefined): number {
  return Math.round(Number(n || 0) * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth check: require admin/staff
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "staff"])
      .limit(1);

    if (!roleCheck || roleCheck.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const bookingCodes: string[] | undefined = body.bookingCodes;
    const since: string | undefined = body.since;
    const dryRun: boolean = body.dryRun !== false; // default true

    // Fetch driver rates from system_settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "additional_driver_daily_rate_standard",
        "additional_driver_daily_rate_young",
        "additional_driver_rate",
        "young_additional_driver_rate",
      ]);

    const settingsMap = new Map((settings || []).map((s: any) => [s.key, s.value]));
    const standardRate = Number(
      settingsMap.get("additional_driver_daily_rate_standard") ??
      settingsMap.get("additional_driver_rate") ??
      14.99
    );
    const youngRate = Number(
      settingsMap.get("additional_driver_daily_rate_young") ??
      settingsMap.get("young_additional_driver_rate") ??
      19.99
    );

    // Fetch bookings
    let query = supabase
      .from("bookings")
      .select("id, booking_code, subtotal, daily_rate, total_days, young_driver_fee, different_dropoff_fee, delivery_fee, upgrade_daily_fee, protection_plan, vehicle_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (bookingCodes && bookingCodes.length > 0) {
      query = query.in("booking_code", bookingCodes.map((c: string) => c.toUpperCase()));
    } else if (since) {
      query = query.gte("created_at", since);
    }

    const { data: bookings, error: bError } = await query;
    if (bError) throw bError;
    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ scanned: 0, matched: 0, inserted: 0, skipped: 0, details: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing additional_drivers for these bookings
    const bookingIds = bookings.map((b: any) => b.id);
    const { data: existingDrivers } = await supabase
      .from("booking_additional_drivers")
      .select("booking_id")
      .in("booking_id", bookingIds);

    const hasDrivers = new Set((existingDrivers || []).map((d: any) => d.booking_id));

    // Fetch add-ons for these bookings
    const { data: addOnsData } = await supabase
      .from("booking_add_ons")
      .select("booking_id, price")
      .in("booking_id", bookingIds);

    const addOnsByBooking = new Map<string, number>();
    for (const a of addOnsData || []) {
      addOnsByBooking.set(a.booking_id, (addOnsByBooking.get(a.booking_id) || 0) + toCents(a.price));
    }

    // Fetch vehicle categories for protection rate lookup
    const vehicleIds = [...new Set(bookings.map((b: any) => b.vehicle_id).filter(Boolean))];
    const { data: categories } = vehicleIds.length > 0
      ? await supabase.from("vehicle_categories").select("id, name").in("id", vehicleIds)
      : { data: [] };
    const catMap = new Map((categories || []).map((c: any) => [c.id, c.name]));

    // Protection rates - group-aware, matching src/lib/protection-groups.ts
    const GROUP_RATES: Record<number, Record<string, number>> = {
      1: { basic: 32.99, smart: 37.99, premium: 49.99 },
      2: { basic: 52.99, smart: 57.99, premium: 69.99 },
      3: { basic: 64.99, smart: 69.99, premium: 82.99 },
    };

    function getProtectionGroup(catName: string): number {
      const name = (catName || "").toUpperCase();
      if (name.includes("LARGE") && name.includes("SUV")) return 3;
      if (name.includes("MINIVAN")) return 2;
      if (name.includes("STANDARD") && name.includes("SUV")) return 2;
      return 1;
    }

    function getProtectionDailyRate(plan: string | null, catName: string): number {
      if (!plan || plan === "none") return 0;
      const group = getProtectionGroup(catName);
      return GROUP_RATES[group]?.[plan] ?? 0;
    }

    const report: any[] = [];
    let matched = 0;
    let inserted = 0;
    let skipped = 0;

    for (const b of bookings) {
      const days = b.total_days || 0;
      const base = {
        bookingCode: b.booking_code,
        bookingId: b.id,
        createdAt: b.created_at,
        days,
      };

      if (days <= 0) {
        report.push({ ...base, status: "skipped", skipReason: "no_days" });
        skipped++;
        continue;
      }

      // Bulk pre-check said no rows, but re-verify per-booking for idempotency
      if (hasDrivers.has(b.id)) {
        report.push({ ...base, status: "skipped", skipReason: "already_has_drivers" });
        skipped++;
        continue;
      }

      // Idempotency: re-check right before insert (guards against concurrent runs)
      const { data: existCheck } = await supabase
        .from("booking_additional_drivers")
        .select("id, driver_name")
        .eq("booking_id", b.id)
        .limit(5);

      if (existCheck && existCheck.length > 0) {
        report.push({ ...base, status: "skipped", skipReason: "already_has_rows" });
        skipped++;
        continue;
      }

      const dbSubtotalCents = toCents(b.subtotal);
      const catName = catMap.get(b.vehicle_id) || "";
      const protectionCents = toCents(getProtectionDailyRate(b.protection_plan, catName)) * days;
      const addOnsCents = addOnsByBooking.get(b.id) || 0;
      const youngRenterCents = toCents(b.young_driver_fee);
      const dropoffCents = toCents(b.different_dropoff_fee);
      const deliveryCents = toCents(b.delivery_fee);
      const upgradeDailyCents = toCents(b.upgrade_daily_fee);
      const upgradeCents = upgradeDailyCents > 0 ? upgradeDailyCents * days : 0;
      const pvrtCents = toCents(PVRT_DAILY_FEE) * days;
      const acsrchCents = toCents(ACSRCH_DAILY_FEE) * days;

      const nonVehicleNonDriverCents = protectionCents + addOnsCents + youngRenterCents
        + dropoffCents + deliveryCents + upgradeCents + pvrtCents + acsrchCents;

      const vehicleBaseCents = toCents(b.daily_rate) * days;
      const deltaCents = dbSubtotalCents - vehicleBaseCents - nonVehicleNonDriverCents;

      if (deltaCents <= 0) {
        report.push({ ...base, status: "skipped", skipReason: "no_positive_delta", deltaCents });
        skipped++;
        continue;
      }

      // Try to match delta to n drivers at standard or young rate
      let matchResult: { n: number; band: string; matchType: string; perDriverCents: number; totalCents: number } | null = null;

      for (const { rate, band, matchType } of [
        { rate: standardRate, band: "25_70", matchType: "standard" },
        { rate: youngRate, band: "20_24", matchType: "young" },
      ]) {
        const perDriverCents = toCents(rate) * days;
        if (perDriverCents <= 0) continue;
        for (let n = 1; n <= 4; n++) {
          const expected = perDriverCents * n;
          if (Math.abs(deltaCents - expected) <= 1) {
            matchResult = { n, band, matchType, perDriverCents, totalCents: expected };
            break;
          }
        }
        if (matchResult) break;
      }

      if (!matchResult) {
        report.push({ ...base, status: "skipped", skipReason: "no_rate_match", deltaCents });
        skipped++;
        continue;
      }

      matched++;
      const perDriverTotalCents = matchResult.perDriverCents; // total for one driver for the rental

      const rows = Array.from({ length: matchResult.n }, (_, i) => ({
        booking_id: b.id,
        driver_name: `Additional Driver ${i + 1}`,
        driver_age_band: matchResult!.band,
        young_driver_fee: perDriverTotalCents / 100,
      }));

      const detail = {
        ...base,
        deltaCents,
        matchType: matchResult.matchType,
        n: matchResult.n,
        perDriverTotalCents,
      };

      if (dryRun) {
        report.push({ ...detail, status: "matched", wouldInsert: matchResult.n, inserted: 0 });
      } else {
        const { error: insertError } = await supabase
          .from("booking_additional_drivers")
          .insert(rows);

        if (insertError) {
          report.push({ ...detail, status: "error", error: insertError.message, inserted: 0 });
        } else {
          inserted += matchResult.n;
          report.push({ ...detail, status: "inserted", inserted: matchResult.n });
        }
      }
    }

    return new Response(
      JSON.stringify({
        scanned: bookings.length,
        matched,
        inserted,
        skipped,
        dryRun,
        rates: { standard: standardRate, young: youngRate },
        details: report,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Backfill error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
