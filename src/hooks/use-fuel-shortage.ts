/**
 * Fuel Shortage Hook
 * 
 * Calculates fuel shortage charge by comparing pickup and return fuel levels
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateFuelShortage, TANK_SIZES, type FuelShortageResult } from "@/lib/fuel-pricing";

interface UseFuelShortageOptions {
  bookingId: string | null;
  enabled?: boolean;
}

interface FuelShortageData extends FuelShortageResult {
  tankCapacity: number;
}

export function useFuelShortage({ bookingId, enabled = true }: UseFuelShortageOptions) {
  return useQuery<FuelShortageData | null>({
    queryKey: ["fuel-shortage", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      // Fetch booking to get assigned unit
      const { data: booking } = await supabase
        .from("bookings")
        .select("assigned_unit_id, vehicle_id")
        .eq("id", bookingId)
        .maybeSingle();

      // Fetch tank capacity from vehicle unit or category
      let tankCapacity = TANK_SIZES.default;

      if (booking?.assigned_unit_id) {
        const { data: unit } = await supabase
          .from("vehicle_units")
          .select("tank_capacity_liters, category_id")
          .eq("id", booking.assigned_unit_id)
          .maybeSingle();

        if (unit?.tank_capacity_liters) {
          tankCapacity = unit.tank_capacity_liters;
        } else if (unit?.category_id) {
          const { data: category } = await supabase
            .from("vehicle_categories")
            .select("name")
            .eq("id", unit.category_id)
            .maybeSingle();

          if (category?.name) {
            const categoryLower = category.name.toLowerCase();
            for (const [key, size] of Object.entries(TANK_SIZES)) {
              if (categoryLower.includes(key)) {
                tankCapacity = size;
                break;
              }
            }
          }
        }
      }

      // Fetch inspection metrics
      const { data: metrics } = await supabase
        .from("inspection_metrics")
        .select("phase, fuel_level")
        .eq("booking_id", bookingId)
        .in("phase", ["pickup", "return"]);

      const pickup = metrics?.find(m => m.phase === "pickup");
      const returnMetric = metrics?.find(m => m.phase === "return");

      const shortage = calculateFuelShortage(
        pickup?.fuel_level ?? null,
        returnMetric?.fuel_level ?? null,
        tankCapacity
      );

      if (!shortage) return null;

      return {
        ...shortage,
        tankCapacity,
      };
    },
    enabled: enabled && !!bookingId,
    staleTime: 30000,
  });
}

/**
 * Record fuel shortage charge in deposit ledger
 */
export async function recordFuelShortageCharge(
  bookingId: string,
  chargeAmount: number,
  description: string,
  userId: string
): Promise<void> {
  await supabase.from("deposit_ledger").insert({
    booking_id: bookingId,
    action: "withhold",
    amount: chargeAmount,
    reason: description,
    category: "fuel",
    created_by: userId,
  });

  // Log the charge
  await supabase.from("audit_logs").insert({
    action: "fuel_shortage_charge",
    entity_type: "booking",
    entity_id: bookingId,
    user_id: userId,
    new_data: { 
      charge_amount: chargeAmount,
      description,
    },
  });
}
