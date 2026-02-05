/**
 * Sync Deposit Status Hook
 * 
 * Manually syncs deposit/authorization status from Stripe
 * Used when webhooks fail or to refresh stale status
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  previousStatus: string;
  newStatus: string;
  stripeStatus: string;
  amountCapturable: number;
  cardLast4?: string;
  cardBrand?: string;
}

export function useSyncDepositStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke("sync-deposit-status", {
        body: { bookingId },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to sync deposit status");
      
      return data;
    },
    onSuccess: (result, bookingId) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["deposit-hold-status", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger", bookingId] });
      
      if (result.previousStatus !== result.newStatus) {
        toast.success(`Status synced: ${result.previousStatus} → ${result.newStatus}`);
      } else {
        toast.info(`Status confirmed: ${result.newStatus}`);
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to sync status: " + error.message);
    },
  });
}
