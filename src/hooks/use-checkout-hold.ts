/**
 * Checkout Hold Hook
 * 
 * Creates unified Stripe authorization hold for rental + deposit
 * Used by admin when customer hasn't completed checkout
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateCheckoutHoldResult {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  totalHoldAmount: number;
  depositAmount: number;
  rentalAmount: number;
  expiresAt: string;
  alreadyExists?: boolean;
}

/**
 * Create a unified checkout hold (rental + deposit)
 * Used when admin needs to create authorization for a booking
 */
export function useCreateCheckoutHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      depositAmount,
      rentalAmount,
    }: { 
      bookingId: string; 
      depositAmount: number;
      rentalAmount: number;
    }): Promise<CreateCheckoutHoldResult> => {
      const { data, error } = await supabase.functions.invoke("create-checkout-hold", {
        body: { bookingId, depositAmount, rentalAmount },
      });

      if (error) throw new Error(error.message);
      if (!data.success && !data.alreadyExists) {
        throw new Error(data.error || "Failed to create checkout hold");
      }
      
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-hold-status", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["payment-deposit-status", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["booking", variables.bookingId] 
      });
      
      if (result.alreadyExists) {
        toast.info("Authorization hold already exists");
      } else {
        toast.success(`Authorization created - Hold ID: ${result.paymentIntentId}`);
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to create authorization: " + error.message);
    },
  });
}
