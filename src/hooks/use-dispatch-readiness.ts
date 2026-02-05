/**
 * Dispatch Readiness Hook
 * 
 * Provides dispatch readiness status for delivery bookings
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  checkDispatchReadiness, 
  type DispatchReadinessCheck,
  type BookingForDispatchCheck 
} from "@/lib/dispatch-readiness";

interface UseDispatchReadinessOptions {
  bookingId: string | null;
  enabled?: boolean;
}

export function useDispatchReadiness({ bookingId, enabled = true }: UseDispatchReadinessOptions) {
  return useQuery<DispatchReadinessCheck>({
    queryKey: ["dispatch-readiness", bookingId],
    queryFn: async () => {
      if (!bookingId) {
        return {
          isReady: false,
          requirements: {
            paymentHoldAuthorized: false,
            unitAssigned: false,
            prepPhotosComplete: false,
          },
          missingRequirements: ["Booking not found"],
        };
      }

      // Fetch booking details
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, deposit_status, assigned_unit_id, stripe_deposit_pi_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingError || !booking) {
        return {
          isReady: false,
          requirements: {
            paymentHoldAuthorized: false,
            unitAssigned: false,
            prepPhotosComplete: false,
          },
          missingRequirements: ["Booking not found"],
        };
      }

      // Fetch prep photo count
      const { count: photoCount } = await supabase
        .from("condition_photos")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .eq("phase", "pre_delivery");

      const bookingData: BookingForDispatchCheck = {
        id: booking.id,
        depositStatus: booking.deposit_status,
        assignedUnitId: booking.assigned_unit_id,
        stripeDepositPiId: booking.stripe_deposit_pi_id,
      };

      return checkDispatchReadiness(bookingData, photoCount || 0);
    },
    enabled: enabled && !!bookingId,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Batch check dispatch readiness for multiple bookings
 */
export function useBatchDispatchReadiness(bookingIds: string[]) {
  return useQuery<Map<string, DispatchReadinessCheck>>({
    queryKey: ["batch-dispatch-readiness", bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) {
        return new Map();
      }

      // Fetch all bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, deposit_status, assigned_unit_id, stripe_deposit_pi_id")
        .in("id", bookingIds);

      // Fetch photo counts for all bookings
      const { data: photoCounts } = await supabase
        .from("condition_photos")
        .select("booking_id")
        .in("booking_id", bookingIds)
        .eq("phase", "pre_delivery");

      // Count photos per booking
      const photoCountMap = new Map<string, number>();
      (photoCounts || []).forEach((photo) => {
        const count = photoCountMap.get(photo.booking_id) || 0;
        photoCountMap.set(photo.booking_id, count + 1);
      });

      // Build results map
      const results = new Map<string, DispatchReadinessCheck>();
      (bookings || []).forEach((booking) => {
        const bookingData: BookingForDispatchCheck = {
          id: booking.id,
          depositStatus: booking.deposit_status,
          assignedUnitId: booking.assigned_unit_id,
          stripeDepositPiId: booking.stripe_deposit_pi_id,
        };
        results.set(
          booking.id,
          checkDispatchReadiness(bookingData, photoCountMap.get(booking.id) || 0)
        );
      });

      return results;
    },
    enabled: bookingIds.length > 0,
    staleTime: 10000,
  });
}
