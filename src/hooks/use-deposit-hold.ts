/**
 * Deposit Hold Hooks (Simplified)
 * 
 * Kept only useCloseAccount which is still used.
 * All deposit hold lifecycle hooks removed.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Close account with final settlement
 */
export function useCloseAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      additionalCharges,
      notes 
    }: { 
      bookingId: string; 
      additionalCharges?: Array<{
        description: string;
        amount: number;
        type: "late_fee" | "damage" | "fee" | "other";
      }>;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("close-account", {
        body: { bookingId, additionalCharges, notes },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to close account");
      
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["final-invoice", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      
      toast.success(`Account closed - Invoice ${result.invoiceNumber} generated`);
    },
    onError: (error: Error) => {
      toast.error("Failed to close account: " + error.message);
    },
  });
}
