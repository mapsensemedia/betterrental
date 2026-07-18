import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleSwapHistoryRow {
  id: string;
  booking_id: string;
  old_unit_id: string | null;
  new_unit_id: string | null;
  old_agreement_id: string | null;
  new_agreement_id: string | null;
  swap_effective_at: string;
  old_end_mileage: number | null;
  new_start_mileage: number;
  reason: string | null;
  notes: string | null;
  old_vin: string | null;
  old_license_plate: string | null;
  new_vin: string | null;
  new_license_plate: string | null;
  changed_by: string | null;
  created_at: string;
}

export function useVehicleSwapHistory(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["vehicle-swap-history", bookingId],
    queryFn: async () => {
      if (!bookingId) return [] as VehicleSwapHistoryRow[];
      const { data, error } = await supabase
        .from("vehicle_swap_history")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VehicleSwapHistoryRow[];
    },
    enabled: !!bookingId,
  });
}
