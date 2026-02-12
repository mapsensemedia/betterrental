/**
 * Fleet Cost Calculator Edge Function
 * Background job for calculating fleet cost metrics
 * SECURITY: Requires admin/staff role
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getUserOrThrow, requireRoleOrThrow, AuthError, authErrorResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Only admin/staff can access fleet cost data
    const user = await getUserOrThrow(req, corsHeaders);
    await requireRoleOrThrow(user.userId, ["admin", "staff", "finance"], corsHeaders);
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err, corsHeaders);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, vehicleUnitId } = await req.json().catch(() => ({}));

    // Calculate metrics for a specific unit
    if (action === "calculate_unit" && vehicleUnitId) {
      const metrics = await calculateUnitMetrics(supabase, vehicleUnitId);
      return new Response(JSON.stringify({ success: true, metrics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate metrics for all units (background job)
    if (action === "calculate_all") {
      const { data: units } = await supabase
        .from("vehicle_units")
        .select("id")
        .eq("status", "active");

      const results = [];
      for (const unit of units || []) {
        const metrics = await calculateUnitMetrics(supabase, unit.id);
        results.push(metrics);
      }

      return new Response(JSON.stringify({ success: true, processed: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get cached metrics
    if (action === "get_cached") {
      const { data: cached } = await supabase
        .from("fleet_cost_cache")
        .select("*")
        .order("last_calculated_at", { ascending: false });

      return new Response(JSON.stringify({ success: true, data: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("Fleet cost calculation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

async function calculateUnitMetrics(supabase: any, unitId: string) {
  // Get bookings for this unit
  const { data: bookings } = await supabase
    .from("bookings")
    .select("total_amount, total_days")
    .eq("assigned_unit_id", unitId)
    .in("status", ["completed", "active"]);

  // Get damage costs
  const { data: damages } = await supabase
    .from("damage_reports")
    .select("estimated_cost")
    .eq("vehicle_unit_id", unitId);

  // Get maintenance costs
  const { data: maintenance } = await supabase
    .from("maintenance_logs")
    .select("cost")
    .eq("vehicle_unit_id", unitId);

  // Get unit acquisition cost
  const { data: unit } = await supabase
    .from("vehicle_units")
    .select("acquisition_cost")
    .eq("id", unitId)
    .single();

  const totalRevenue = (bookings || []).reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
  const totalDamage = (damages || []).reduce((sum: number, d: any) => sum + Number(d.estimated_cost || 0), 0);
  const totalMaintenance = (maintenance || []).reduce((sum: number, m: any) => sum + Number(m.cost || 0), 0);
  const acquisitionCost = Number(unit?.acquisition_cost || 0);
  const netProfit = totalRevenue - acquisitionCost - totalDamage - totalMaintenance;
  const rentalCount = bookings?.length || 0;
  const totalRentalDays = (bookings || []).reduce((sum: number, b: any) => sum + (b.total_days || 0), 0);

  // Upsert to cache
  const cacheData = {
    vehicle_unit_id: unitId,
    cache_type: "unit",
    total_rental_revenue: totalRevenue,
    total_damage_cost: totalDamage,
    total_maintenance_cost: totalMaintenance,
    net_profit: netProfit,
    rental_count: rentalCount,
    total_rental_days: totalRentalDays,
    last_calculated_at: new Date().toISOString(),
  };

  await supabase
    .from("fleet_cost_cache")
    .upsert(cacheData, { onConflict: "vehicle_unit_id,cache_type,calculation_period_start,calculation_period_end" });

  return cacheData;
}
