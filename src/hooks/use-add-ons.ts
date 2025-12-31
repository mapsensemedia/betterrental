import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AddOn {
  id: string;
  name: string;
  description: string | null;
  dailyRate: number;
  oneTimeFee: number | null;
  isActive: boolean | null;
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

/**
 * Calculate total add-on cost for a rental period
 */
export function calculateAddOnsCost(
  addOns: AddOn[],
  selectedIds: string[],
  rentalDays: number
): { itemized: Array<{ id: string; name: string; total: number }>; total: number } {
  const itemized = selectedIds
    .map((id) => {
      const addon = addOns.find((a) => a.id === id);
      if (!addon) return null;
      
      const total = addon.dailyRate * rentalDays + (addon.oneTimeFee || 0);
      return { id: addon.id, name: addon.name, total };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const total = itemized.reduce((acc, item) => acc + item.total, 0);

  return { itemized, total };
}
