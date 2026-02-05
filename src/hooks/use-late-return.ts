/**
 * Late Return Hook - Manages late return calculations and customer self-marking with GPS
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateLateReturnFeeWithRate, LATE_RETURN_GRACE_PERIOD_MINUTES, LATE_RETURN_FEE_PERCENTAGE } from "@/lib/late-return";

interface MarkReturnedOptions {
  bookingId: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

interface OverrideLateFeeOptions {
  bookingId: string;
  overrideAmount: number;
  reason: string;
}

/**
 * Request geolocation from browser
 */
export async function requestGeolocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Hook for customers to self-mark their vehicle as returned (key drop scenario)
 * Now captures GPS coordinates when available
 */
export function useCustomerMarkReturned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, latitude, longitude, address }: MarkReturnedOptions) => {
      const now = new Date().toISOString();
      
      const updateData: Record<string, unknown> = {
        customer_marked_returned_at: now,
      };

      // Add GPS coordinates if available
      if (latitude != null && longitude != null) {
        updateData.customer_return_lat = latitude;
        updateData.customer_return_lng = longitude;
      }
      
      if (address) {
        updateData.customer_return_address = address;
      }
      
      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", bookingId)
        .eq("status", "active"); // Only allow for active bookings

      if (error) throw error;
      return { markedAt: now, hasLocation: latitude != null };
    },
    onSuccess: (result, variables) => {
      const locationNote = result.hasLocation 
        ? " Location recorded." 
        : "";
      toast.success("Vehicle marked as returned", {
        description: `The rental office will process your return shortly.${locationNote}`,
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
    mutationFn: async ({ bookingId, scheduledEndAt, dailyRate, actualReturnAt }: {
      bookingId: string;
      scheduledEndAt: string;
      dailyRate: number;
      actualReturnAt?: string | null;
    }) => {
      const lateInfo = calculateLateReturnFeeWithRate(scheduledEndAt, dailyRate, actualReturnAt);
      
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

export { LATE_RETURN_GRACE_PERIOD_MINUTES, LATE_RETURN_FEE_PERCENTAGE };
