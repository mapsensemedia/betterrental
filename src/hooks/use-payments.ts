/**
 * Payments Hook
 *
 * Internal hook for booking lookups by code. Payment recording is handled
 * server-side by the Worldline (wl-pay / wl-webhook) flow.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Look up a booking by its booking code
 */
export function useBookingByCode(code: string | null) {
  return useMutation({
    mutationFn: async (searchCode: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          start_at,
          end_at,
          status,
          locations!location_id (id, name, address, city)
        `)
        .eq("booking_code", searchCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
