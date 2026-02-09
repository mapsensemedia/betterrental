/**
 * Hook for editing booking details (dates, time, location, duration)
 * with automatic pricing recalculation and audit logging.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateBookingPricing, type DriverAgeBand } from "@/lib/pricing";
import { differenceInHours } from "date-fns";

export interface BookingEditPayload {
  bookingId: string;
  startAt?: string;
  endAt?: string;
  locationId?: string;
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
 * Preview pricing impact of booking edits
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
 * Mutation to apply booking edits with full recalculation
 */
export function useEditBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, startAt, endAt, locationId, reason }: BookingEditPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch current booking
      const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select(`
          id, start_at, end_at, daily_rate, total_days, subtotal,
          tax_amount, total_amount, vehicle_id, status,
          driver_age_band, protection_plan, young_driver_fee,
          location_id
        `)
        .eq("id", bookingId)
        .maybeSingle();

      if (fetchErr || !booking) throw new Error("Booking not found");

      if (!["pending", "confirmed"].includes(booking.status)) {
        throw new Error("Only pending or confirmed bookings can be edited");
      }

      const effectiveStartAt = startAt || booking.start_at;
      const effectiveEndAt = endAt || booking.end_at;
      const effectiveLocationId = locationId || booking.location_id;

      // Calculate new days
      const start = new Date(effectiveStartAt);
      const end = new Date(effectiveEndAt);

      if (end <= start) {
        throw new Error("Return date must be after pickup date");
      }

      const hoursDiff = differenceInHours(end, start);
      const newDays = Math.max(1, Math.ceil(hoursDiff / 24));

      if (newDays > 30) {
        throw new Error("Maximum rental duration is 30 days");
      }

      // Get add-ons total
      const { data: addOns } = await supabase
        .from("booking_add_ons")
        .select("price")
        .eq("booking_id", bookingId);

      const addOnsTotal = (addOns || []).reduce((sum, a) => sum + Number(a.price), 0);

      // Get protection daily rate
      let protectionDailyRate = 0;
      if (booking.protection_plan && booking.protection_plan !== "none") {
        const { data: settings } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", `protection_${booking.protection_plan}_rate`)
          .maybeSingle();
        if (settings?.value) protectionDailyRate = Number(settings.value);
      }

      const ageBand = booking.driver_age_band === "20_24" ? ("20_24" as DriverAgeBand) : null;

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
        start_at: booking.start_at,
        end_at: booking.end_at,
        location_id: booking.location_id,
        total_days: booking.total_days,
        subtotal: booking.subtotal,
        tax_amount: booking.tax_amount,
        total_amount: booking.total_amount,
      };

      // Build update payload
      const updatePayload: Record<string, any> = {
        total_days: newDays,
        subtotal: Number(newPricing.subtotal.toFixed(2)),
        tax_amount: Number(newPricing.taxAmount.toFixed(2)),
        total_amount: Number(newPricing.total.toFixed(2)),
      };

      if (startAt) updatePayload.start_at = startAt;
      if (endAt) updatePayload.end_at = endAt;
      if (locationId && locationId !== booking.location_id) {
        updatePayload.location_id = locationId;
        // Clear vehicle assignment when location changes (vehicle may not be available at new location)
        updatePayload.vehicle_id = null;
        updatePayload.assigned_unit_id = null;
      }

      // Update booking
      const { error: updateErr } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", bookingId);

      if (updateErr) throw updateErr;

      // If we changed location and had a VIN assigned, release it
      if (locationId && locationId !== booking.location_id && booking.vehicle_id) {
        try {
          await supabase.rpc("release_vin_from_booking", { p_booking_id: bookingId });
        } catch (e) {
          console.error("Failed to release VIN on location change:", e);
        }
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "booking_edited",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: user.id,
        old_data: oldData,
        new_data: {
          ...updatePayload,
          reason,
          edited_by: user.id,
        },
      });

      return {
        bookingId,
        oldDays: booking.total_days,
        newDays,
        oldTotal: booking.total_amount,
        newTotal: newPricing.total,
        priceDifference: newPricing.total - booking.total_amount,
        locationChanged: locationId && locationId !== booking.location_id,
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
