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
  /** Optional new pickup timestamp (ISO). Omit to keep the stored pickup. */
  newStartAt?: string;
  /**
   * True when only the timestamps move and the billable day count is unchanged —
   * applied via `update_time_only` so the agreed price stays untouched.
   */
  timeOnly?: boolean;
  reason: string;
}


export interface ModificationLineBreakdown {
  vehicle: number;
  protection: number;
  addOns: number;
  additionalDrivers: number;
  regulatoryFees: number;
  youngRenterFee: number;
  subtotal: number;
  tax: number;
  total: number;
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
  /** Itemized before/after so staff quote the full amount, not just the car. */
  before: ModificationLineBreakdown;
  after: ModificationLineBreakdown;
}

/** Extras the booking already carries — must be included or the quote under-charges. */
export interface ModificationExtras {
  protectionDailyRate?: number;
  addOnsPerDay?: number;
  addOnsOneTime?: number;
  additionalDriversPerDay?: number;
  deliveryFee?: number;
  differentDropoffFee?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Preview the pricing impact of a booking modification before confirming.
 *
 * DELTA ONLY: the engine is run for the old and the new duration and only the
 * difference is applied to the booking's stored (customer-agreed) price. A
 * booking priced below today's rate card (negotiated long-term rate) must never
 * be silently rebuilt from the current rate card.
 *
 * The preview MUST receive the booking's protection plan rate, add-ons and
 * additional-driver rates. Pricing the car alone under-quotes the customer,
 * because the server charges for all of them.
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
  extras: ModificationExtras = {},
  newStartAt?: string,
): ModificationPreview {
  const {
    protectionDailyRate = 0,
    addOnsPerDay = 0,
    addOnsOneTime = 0,
    additionalDriversPerDay = 0,
    deliveryFee = 0,
    differentDropoffFee = 0,
  } = extras;

  const originalStart = new Date(booking.start_at);
  const start = newStartAt ? new Date(newStartAt) : originalStart;
  const newEnd = new Date(newEndAt);

  const hoursDiff = differenceInHours(newEnd, start);
  const newDays = Math.max(1, Math.ceil(hoursDiff / 24));
  const oldDays = Math.max(
    1,
    booking.total_days ||
      Math.ceil(differenceInHours(new Date(booking.end_at), originalStart) / 24),
  );

  const ageBand = booking.driver_age_band === "20_24" ? "20_24" as DriverAgeBand : null;

  const priceFor = (days: number) =>
    calculateBookingPricing({
      vehicleDailyRate: booking.daily_rate,
      rentalDays: days,
      protectionDailyRate,
      // Add-ons and additional drivers are both charged per day by the server.
      addOnsTotal: round2(addOnsPerDay * days + addOnsOneTime + additionalDriversPerDay * days),
      deliveryFee,
      differentDropoffFee,
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

  const breakdownFor = (days: number, engine: ReturnType<typeof calculateBookingPricing>, subtotal: number): ModificationLineBreakdown => {
    const tax = round2(round2(subtotal * 0.07) + round2(subtotal * 0.05));
    return {
      vehicle: round2(engine.vehicleTotal),
      protection: round2(protectionDailyRate * days),
      addOns: round2(addOnsPerDay * days + addOnsOneTime),
      additionalDrivers: round2(additionalDriversPerDay * days),
      regulatoryFees: round2(engine.dailyFeesTotal ?? 0),
      youngRenterFee: round2(engine.youngDriverFee ?? 0),
      subtotal,
      tax,
      total: round2(subtotal + tax),
    };
  };

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
    before: breakdownFor(oldDays, enginePrevious, storedSubtotal),
    after: breakdownFor(newDays, engineNew, newSubtotal),
  };
}



/**
 * Mutation to apply a booking modification via server-side repricing
 */
export function useModifyBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, newEndAt, newStartAt, timeOnly, reason }: BookingModification) => {
      const { data, error } = await supabase.functions.invoke("reprice-booking", {
        body: {
          bookingId,
          operation: timeOnly ? "update_time_only" : "modify",
          newEndAt,
          newStartAt: newStartAt || undefined,
          reason,
        },
      });

      if (error) throw new Error(error.message || "Failed to modify booking");
      if (data?.error) throw new Error(data.error);

      return {
        bookingId,
        timeOnly: !!timeOnly,
        oldTotal: data.oldTotal,
        newTotal: data.total,
        priceDifference: timeOnly
          ? 0
          : data.deltaTotal != null
            ? Number(data.deltaTotal)
            : data.total - data.oldTotal,
        pricingDrift: timeOnly ? null : (data.pricingDrift ?? null),
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
