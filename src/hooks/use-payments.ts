/**
 * Payments Hook
 * 
 * Internal hook for recording payments from Stripe webhooks.
 * Manual payment recording has been removed - all payments are Stripe-only.
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
          locations (id, name, address, city)
        `)
        .eq("booking_code", searchCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
