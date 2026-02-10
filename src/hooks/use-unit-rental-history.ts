/**
 * Unit Rental History Hook
 * Fetches all bookings associated with a specific vehicle unit
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnitBookingRecord {
  id: string;
  booking_code: string;
  status: string;
  start_at: string;
  end_at: string;
  actual_return_at: string | null;
  total_days: number;
  daily_rate: number;
  total_amount: number;
  customer_name: string;
  customer_email: string;
}

export function useUnitRentalHistory(unitId: string | null) {
  return useQuery({
    queryKey: ["unit-rental-history", unitId],
    queryFn: async () => {
      if (!unitId) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, status, start_at, end_at, actual_return_at,
          total_days, daily_rate, total_amount,
          profiles:user_id(full_name, email)
        `)
        .eq("assigned_unit_id", unitId)
        .order("start_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code,
        status: b.status,
        start_at: b.start_at,
        end_at: b.end_at,
        actual_return_at: b.actual_return_at,
        total_days: b.total_days,
        daily_rate: b.daily_rate,
        total_amount: b.total_amount,
        customer_name: b.profiles?.full_name || "Unknown",
        customer_email: b.profiles?.email || "",
      })) as UnitBookingRecord[];
    },
    enabled: !!unitId,
  });
}
