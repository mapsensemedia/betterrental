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
  /** Difference between the booking's stored (agreed) price and today's rate card. */
  pricingDrift: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Preview the pricing impact of a booking modification before confirming.
 *
 * DELTA ONLY: the engine is run for the old and the new duration and only the
 * difference is applied to the booking's stored (customer-agreed) price. A
 * booking priced below today's rate card (negotiated long-term rate) must never
 * be silently rebuilt from the current rate card.
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
  const oldDays = Math.max(
    1,
    booking.total_days || Math.ceil(differenceInHours(new Date(booking.end_at), start) / 24),
  );

  const ageBand = booking.driver_age_band === "20_24" ? "20_24" as DriverAgeBand : null;

  const priceFor = (days: number) =>
    calculateBookingPricing({
      vehicleDailyRate: booking.daily_rate,
      rentalDays: days,
      protectionDailyRate,
      addOnsTotal: addOnsPerDay * days,
      deliveryFee,
      driverAgeBand: ageBand,
      pickupDate: start,
    });

  const enginePrevious = priceFor(oldDays);
  const engineNew = priceFor(newDays);

  const deltaSubtotal = round2(engineNew.subtotal - enginePrevious.subtotal);
  const storedSubtotal = round2(Number(booking.subtotal) || 0);
  const newSubtotal = round2(Math.max(storedSubtotal + deltaSubtotal, 0));
  const newTaxAmount = round2(round2(newSubtotal * 0.07) + round2(newSubtotal * 0.05));
  const newTotal = round2(newSubtotal + newTaxAmount);

  return {
    originalDays: oldDays,
    newDays,
    addedDays: newDays - oldDays,
    originalTotal: booking.total_amount,
    newTotal,
    priceDifference: round2(newTotal - (Number(booking.total_amount) || 0)),
    newSubtotal,
    newTaxAmount,
    dailyRate: booking.daily_rate,
    pricingDrift: round2(storedSubtotal - enginePrevious.subtotal),
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
        priceDifference:
          data.deltaTotal != null ? Number(data.deltaTotal) : data.total - data.oldTotal,
        pricingDrift: data.pricingDrift ?? null,
        agreementRegenerated: data.agreementRegenerated ?? null,
        newDays: 0, // Will be refreshed from query invalidation
        oldDays: 0,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", result.bookingId] });
      const diff = result.priceDifference;
      const agreementNote = result.agreementRegenerated
        ? " Rental agreement regenerated."
        : result.agreementRegenerated === false
          ? " Agreement could not be regenerated — check it manually."
          : "";
      toast.success(
        "Booking duration updated",
        {
          description:
            (diff > 0
              ? `Additional charge: $${diff.toFixed(2)} CAD`
              : diff < 0
                ? `Refund: $${Math.abs(diff).toFixed(2)} CAD`
                : "No price change") + agreementNote,
        }
      );
      if (result.pricingDrift) {
        const d = Number(result.pricingDrift.difference || 0);
        toast.warning("Agreed price differs from current rate card", {
          description: `Stored price is $${Math.abs(d).toFixed(2)} ${d < 0 ? "above" : "below"} today's rate card. Only the duration difference was charged.`,
          duration: 10000,
        });
      }
    },

    onError: (err: Error) => {
      toast.error(err.message || "Failed to modify booking. Please try again.");
    },
  });
}
