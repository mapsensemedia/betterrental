/**
 * Hook for modifying active/confirmed bookings — extend duration, update dates,
 * and recalculate pricing automatically via server-side edge function.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateBookingPricing, DriverAgeBand } from "@/lib/pricing";
import { differenceInHours } from "date-fns";

export interface BookingModification {
  bookingId: string;
  newEndAt: string;
  reason: string;
}

export interface ModificationPreview {
  originalDays: number;
  newDays: number;
  addedDays: number;
  originalTotal: number;
  newTotal: number;
  priceDifference: number;
  newSubtotal: number;
  newTaxAmount: number;
  dailyRate: number;
}

/**
 * Preview the pricing impact of a booking modification before confirming
 * (client-side preview only — actual write goes through edge function)
 */
export function previewModification(
  booking: {
    start_at: string;
    end_at: string;
    daily_rate: number;
    total_days: number;
    total_amount: number;
    subtotal: number;
    tax_amount: number | null;
    driver_age_band: string | null;
    protection_plan: string | null;
    young_driver_fee: number | null;
  },
  newEndAt: string,
  protectionDailyRate: number = 0,
  addOnsPerDay: number = 0,
  deliveryFee: number = 0,
): ModificationPreview {
  const start = new Date(booking.start_at);
  const newEnd = new Date(newEndAt);

  const hoursDiff = differenceInHours(newEnd, start);
  const newDays = Math.max(1, Math.ceil(hoursDiff / 24));

  const ageBand = booking.driver_age_band === "20_24" ? "20_24" as DriverAgeBand : null;

  const newPricing = calculateBookingPricing({
    vehicleDailyRate: booking.daily_rate,
    rentalDays: newDays,
    protectionDailyRate,
    addOnsTotal: addOnsPerDay * newDays,
    deliveryFee,
    driverAgeBand: ageBand,
    pickupDate: start,
  });

  return {
    originalDays: booking.total_days,
    newDays,
    addedDays: newDays - booking.total_days,
    originalTotal: booking.total_amount,
    newTotal: newPricing.total,
    priceDifference: newPricing.total - booking.total_amount,
    newSubtotal: newPricing.subtotal,
    newTaxAmount: newPricing.taxAmount,
    dailyRate: booking.daily_rate,
  };
}

/**
 * Mutation to apply a booking modification via server-side repricing
 */
export function useModifyBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, newEndAt, reason }: BookingModification) => {
      const { data, error } = await supabase.functions.invoke("reprice-booking", {
        body: {
          bookingId,
          operation: "modify",
          newEndAt,
          reason,
        },
      });

      if (error) throw new Error(error.message || "Failed to modify booking");
      if (data?.error) throw new Error(data.error);

      return {
        bookingId,
        oldTotal: data.oldTotal,
        newTotal: data.total,
        priceDifference: data.total - data.oldTotal,
        newDays: 0, // Will be refreshed from query invalidation
        oldDays: 0,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });
      const diff = result.priceDifference;
      toast.success(
        "Booking duration updated",
        { description: diff > 0 ? `Additional charge: $${diff.toFixed(2)} CAD` : diff < 0 ? `Refund: $${Math.abs(diff).toFixed(2)} CAD` : "No price change" }
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to modify booking. Please try again.");
    },
  });
}
