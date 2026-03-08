/**
 * Hook for editing booking details (dates, time, location, duration)
 * with automatic pricing recalculation via server-side edge function.
 *
 * All financial writes go through reprice-booking to comply with
 * trg_block_sensitive_booking_updates.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateBookingPricing, type DriverAgeBand } from "@/lib/pricing";
import { differenceInHours } from "date-fns";
import { extractEdgeFunctionError } from "@/lib/edge-function-error";

export interface BookingEditPayload {
  bookingId: string;
  startAt?: string;
  endAt?: string;
  locationId?: string;
  dailyRate?: number;
  reason: string;
}

export interface BookingEditPreview {
  originalDays: number;
  newDays: number;
  originalTotal: number;
  newSubtotal: number;
  newTaxAmount: number;
  newTotal: number;
  priceDifference: number;
  dailyRate: number;
}

/**
 * Fetch active locations for the location picker
 */
export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, city, address")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // 5 min
  });
}

/**
 * Preview pricing impact of booking edits (client-side display only)
 */
export function previewBookingEdit(
  booking: {
    start_at: string;
    end_at: string;
    daily_rate: number;
    total_days: number;
    total_amount: number;
    subtotal: number;
    tax_amount: number | null;
    driver_age_band: string | null;
  },
  newStartAt: string,
  newEndAt: string,
): BookingEditPreview {
  const start = new Date(newStartAt);
  const end = new Date(newEndAt);
  const hoursDiff = differenceInHours(end, start);
  const newDays = Math.max(1, Math.ceil(hoursDiff / 24));

  const ageBand = booking.driver_age_band === "20_24" ? ("20_24" as DriverAgeBand) : null;

  const pricing = calculateBookingPricing({
    vehicleDailyRate: booking.daily_rate,
    rentalDays: newDays,
    driverAgeBand: ageBand,
    pickupDate: start,
  });

  return {
    originalDays: booking.total_days,
    newDays,
    originalTotal: booking.total_amount,
    newSubtotal: pricing.subtotal,
    newTaxAmount: pricing.taxAmount,
    newTotal: pricing.total,
    priceDifference: pricing.total - booking.total_amount,
    dailyRate: booking.daily_rate,
  };
}

/**
 * Mutation to apply booking edits via reprice-booking edge function.
 * All financial field writes are handled server-side.
 */
export function useEditBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, startAt, endAt, locationId, dailyRate, reason }: BookingEditPayload) => {
      const { data, error } = await supabase.functions.invoke("reprice-booking", {
        body: {
          bookingId,
          operation: "modify",
          newStartAt: startAt || undefined,
          newEndAt: endAt || undefined,
          newDailyRate: dailyRate || undefined,
          newLocationId: locationId || undefined,
          reason,
        },
      });

      if (error || data?.error) {
        const msg = await extractEdgeFunctionError(data, error);
        throw new Error(msg);
      }

      return {
        bookingId,
        oldTotal: data.oldTotal,
        newTotal: data.total,
        priceDifference: data.total - data.oldTotal,
        locationChanged: !!locationId,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });

      const diff = result.priceDifference;
      const msg = result.locationChanged ? "Booking updated (location changed — vehicle cleared)" : "Booking updated";
      toast.success(msg, {
        description: diff > 0
          ? `Additional charge: $${diff.toFixed(2)} CAD`
          : diff < 0
          ? `Refund: $${Math.abs(diff).toFixed(2)} CAD`
          : "No price change",
      });
    },
    onError: (err) => {
      toast.error((err as Error).message || "Failed to edit booking");
    },
  });
}
