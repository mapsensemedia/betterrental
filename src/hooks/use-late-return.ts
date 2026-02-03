/**
 * Late Return Hook - Manages late return calculations and customer self-marking
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateLateReturnFee, LATE_RETURN_GRACE_PERIOD_MINUTES, LATE_RETURN_HOURLY_FEE } from "@/lib/late-return";

interface MarkReturnedOptions {
  bookingId: string;
}

interface OverrideLateFeeOptions {
  bookingId: string;
  overrideAmount: number;
  reason: string;
}

/**
 * Hook for customers to self-mark their vehicle as returned (key drop scenario)
 */
export function useCustomerMarkReturned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }: MarkReturnedOptions) => {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from("bookings")
        .update({
          customer_marked_returned_at: now,
        })
        .eq("id", bookingId)
        .eq("status", "active"); // Only allow for active bookings

      if (error) throw error;
      return { markedAt: now };
    },
    onSuccess: (_, variables) => {
      toast.success("Vehicle marked as returned", {
        description: "The rental office will process your return shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark vehicle as returned");
    },
  });
}

/**
 * Hook for admin to override late return fee
 */
export function useOverrideLateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, overrideAmount, reason }: OverrideLateFeeOptions) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bookings")
        .update({
          late_return_fee_override: overrideAmount,
          late_return_override_reason: reason,
          late_return_override_by: user.id,
          late_return_override_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;
      return { overrideAmount };
    },
    onSuccess: (result, variables) => {
      toast.success(`Late fee updated to CA$${result.overrideAmount.toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update late fee");
    },
  });
}

/**
 * Hook to calculate and update automatic late return fee
 */
export function useCalculateLateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, scheduledEndAt, actualReturnAt }: {
      bookingId: string;
      scheduledEndAt: string;
      actualReturnAt?: string | null;
    }) => {
      const lateInfo = calculateLateReturnFee(scheduledEndAt, actualReturnAt);
      
      const { error } = await supabase
        .from("bookings")
        .update({
          late_return_fee: lateInfo.fee,
        })
        .eq("id", bookingId);

      if (error) throw error;
      return lateInfo;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
    },
  });
}

export { LATE_RETURN_GRACE_PERIOD_MINUTES, LATE_RETURN_HOURLY_FEE };
