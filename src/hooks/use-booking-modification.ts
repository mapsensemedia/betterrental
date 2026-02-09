/**
 * Hook for modifying active/confirmed bookings — extend duration, update dates,
 * and recalculate pricing automatically.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateBookingPricing, DriverAgeBand, TOTAL_TAX_RATE } from "@/lib/pricing";
import { differenceInDays, differenceInHours } from "date-fns";

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

  // Calculate new days (minimum 1)
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
 * Mutation to apply a booking modification with full recalculation
 */
export function useModifyBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, newEndAt, reason }: BookingModification) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch current booking
      const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select(`
          id, start_at, end_at, daily_rate, total_days, subtotal,
          tax_amount, total_amount, vehicle_id, user_id, status,
          driver_age_band, protection_plan, young_driver_fee,
          deposit_amount, location_id
        `)
        .eq("id", bookingId)
        .maybeSingle();

      if (fetchErr || !booking) throw new Error("Booking not found");

      if (!["pending", "confirmed", "active"].includes(booking.status)) {
        throw new Error("Only pending, confirmed, or active bookings can be modified");
      }

      // Get add-ons total
      const { data: addOns } = await supabase
        .from("booking_add_ons")
        .select("price, quantity")
        .eq("booking_id", bookingId);

      const addOnsTotal = (addOns || []).reduce((sum, a) => sum + Number(a.price), 0);

      // Get protection daily rate from system settings or categories
      let protectionDailyRate = 0;
      if (booking.protection_plan && booking.protection_plan !== "none") {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", `protection_${booking.protection_plan}_rate`)
          .maybeSingle();
        
        if (settings?.value) {
          protectionDailyRate = Number(settings.value);
        }
      }

      // Calculate new days
      const start = new Date(booking.start_at);
      const newEnd = new Date(newEndAt);
      const hoursDiff = differenceInHours(newEnd, start);
      const newDays = Math.max(1, Math.ceil(hoursDiff / 24));

      const ageBand = booking.driver_age_band === "20_24" ? "20_24" as DriverAgeBand : null;

      // Recalculate pricing
      const newPricing = calculateBookingPricing({
        vehicleDailyRate: booking.daily_rate,
        rentalDays: newDays,
        protectionDailyRate,
        addOnsTotal,
        driverAgeBand: ageBand,
        pickupDate: start,
      });

      // Prepare old data for audit
      const oldData = {
        end_at: booking.end_at,
        total_days: booking.total_days,
        subtotal: booking.subtotal,
        tax_amount: booking.tax_amount,
        total_amount: booking.total_amount,
      };

      // Update booking
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          end_at: newEndAt,
          total_days: newDays,
          subtotal: Number(newPricing.subtotal.toFixed(2)),
          tax_amount: Number(newPricing.taxAmount.toFixed(2)),
          total_amount: Number(newPricing.total.toFixed(2)),
        })
        .eq("id", bookingId);

      if (updateErr) throw updateErr;

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "booking_modified",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: user.id,
        old_data: oldData,
        new_data: {
          end_at: newEndAt,
          total_days: newDays,
          subtotal: newPricing.subtotal,
          tax_amount: newPricing.taxAmount,
          total_amount: newPricing.total,
          reason,
          modified_by: user.id,
        },
      });

      return {
        bookingId,
        oldDays: booking.total_days,
        newDays,
        oldTotal: booking.total_amount,
        newTotal: newPricing.total,
        priceDifference: newPricing.total - booking.total_amount,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });
      const diff = result.priceDifference;
      toast.success(
        `Booking updated: ${result.oldDays} → ${result.newDays} days`,
        { description: diff > 0 ? `Additional charge: $${diff.toFixed(2)} CAD` : diff < 0 ? `Refund: $${Math.abs(diff).toFixed(2)} CAD` : "No price change" }
      );
    },
    onError: () => {
      toast.error("Failed to modify booking. Please try again.");
    },
  });
}
