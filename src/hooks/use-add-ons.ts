import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateFuelCostForUnit, TANK_SIZES } from "@/lib/fuel-pricing";

export interface AddOn {
  id: string;
  name: string;
  description: string | null;
  dailyRate: number;
  oneTimeFee: number | null;
  isActive: boolean | null;
}

/**
 * Check if an add-on is the fuel service add-on
 */
export function isFuelAddOn(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes("fuel") && lowerName.includes("tank");
}

/**
 * Fetch all active add-ons
 */
export function useAddOns() {
  return useQuery({
    queryKey: ["add-ons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("add_ons")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching add-ons:", error);
        return [];
      }

      return (data || []).map((addon) => ({
        id: addon.id,
        name: addon.name,
        description: addon.description,
        dailyRate: Number(addon.daily_rate),
        oneTimeFee: addon.one_time_fee ? Number(addon.one_time_fee) : 0,
        isActive: addon.is_active,
      })) as AddOn[];
    },
    staleTime: 60000, // 1 minute
  });
}

export interface FuelPricingInfo {
  ourPrice: number;
  marketPrice: number;
  savings: number;
  tankLiters: number;
}

/**
 * Calculate total add-on cost for a rental period
 * @param addOns List of available add-ons
 * @param selectedIds IDs of selected add-ons
 * @param rentalDays Number of rental days
 * @param vehicleCategory Optional vehicle category for fuel tank size calculation (fallback)
 * @param unitTankCapacity Optional VIN-specific tank capacity in liters (takes priority)
 */
export function calculateAddOnsCost(
  addOns: AddOn[],
  selectedIds: string[],
  rentalDays: number,
  vehicleCategory?: string,
  unitTankCapacity?: number | null
): { 
  itemized: Array<{ id: string; name: string; total: number }>; 
  total: number;
  fuelPricing?: FuelPricingInfo;
} {
  let fuelPricing: FuelPricingInfo | undefined;
  
  const itemized = selectedIds
    .map((id) => {
      const addon = addOns.find((a) => a.id === id);
      if (!addon) return null;
      
      // Handle fuel add-on specially - use VIN-specific or category-based tank size
      if (isFuelAddOn(addon.name)) {
        const fuelCost = calculateFuelCostForUnit(unitTankCapacity, vehicleCategory || "default");
        fuelPricing = fuelCost;
        return { id: addon.id, name: addon.name, total: fuelCost.ourPrice };
      }
      
      const total = addon.dailyRate * rentalDays + (addon.oneTimeFee || 0);
      return { id: addon.id, name: addon.name, total };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const total = itemized.reduce((acc, item) => acc + item.total, 0);

  return { itemized, total, fuelPricing };
}
