import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VehicleConflict {
  bookingId: string;
  bookingCode: string;
  startAt: string;
  endAt: string;
  status: string;
}

export interface VehicleAssignmentCheck {
  vehicleId: string;
  isAvailable: boolean;
  conflicts: VehicleConflict[];
}

// Check if a vehicle is available for a given date range
export function useCheckVehicleAvailability(
  vehicleId: string | null,
  startAt: string | null,
  endAt: string | null,
  excludeBookingId?: string
) {
  return useQuery({
    queryKey: ['vehicle-availability', vehicleId, startAt, endAt, excludeBookingId],
    queryFn: async (): Promise<VehicleAssignmentCheck | null> => {
      if (!vehicleId || !startAt || !endAt) return null;

      // Find overlapping bookings for this vehicle
      const { data: conflicts, error } = await supabase
        .from('bookings')
        .select('id, booking_code, start_at, end_at, status')
        .eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'confirmed', 'active'])
        .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`);

      if (error) throw error;

      // Filter out the current booking if provided
      const filteredConflicts = (conflicts || [])
        .filter(b => b.id !== excludeBookingId)
        .map(b => ({
          bookingId: b.id,
          bookingCode: b.booking_code,
          startAt: b.start_at,
          endAt: b.end_at,
          status: b.status,
        }));

      return {
        vehicleId,
        isAvailable: filteredConflicts.length === 0,
        conflicts: filteredConflicts,
      };
    },
    enabled: !!vehicleId && !!startAt && !!endAt,
  });
}

// Get available vehicles for a date range at a location
export function useAvailableVehicles(
  locationId: string | null,
  startAt: string | null,
  endAt: string | null,
  excludeBookingId?: string
) {
  return useQuery({
    queryKey: ['available-vehicles', locationId, startAt, endAt, excludeBookingId],
    queryFn: async () => {
      if (!locationId || !startAt || !endAt) return [];

      // Get all vehicles at this location
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, make, model, year, category, daily_rate, image_url')
        .eq('location_id', locationId)
        .eq('is_available', true);

      if (vehicleError) throw vehicleError;

      // Get conflicting bookings for the date range
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('vehicle_id')
        .in('status', ['pending', 'confirmed', 'active'])
        .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`);

      if (bookingError) throw bookingError;

      // Filter out the excluded booking
      const conflictingVehicleIds = new Set(
        (bookings || [])
          .filter(b => b.vehicle_id)
          .map(b => b.vehicle_id)
      );

      // Return vehicles that don't have conflicts
      return (vehicles || []).filter(v => !conflictingVehicleIds.has(v.id));
    },
    enabled: !!locationId && !!startAt && !!endAt,
  });
}

// Assign a vehicle to a booking
export function useAssignVehicle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      vehicleId,
      startAt,
      endAt,
    }: {
      bookingId: string;
      vehicleId: string;
      startAt: string;
      endAt: string;
    }) => {
      // First check for conflicts
      const { data: conflicts, error: checkError } = await supabase
        .from('bookings')
        .select('id, booking_code')
        .eq('vehicle_id', vehicleId)
        .neq('id', bookingId)
        .in('status', ['pending', 'confirmed', 'active'])
        .or(`and(start_at.lte.${endAt},end_at.gte.${startAt})`);

      if (checkError) throw checkError;

      if (conflicts && conflicts.length > 0) {
        throw new Error(
          `Vehicle is already assigned to booking${conflicts.length > 1 ? 's' : ''}: ${conflicts.map(c => c.booking_code).join(', ')}`
        );
      }

      // Assign the vehicle
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ vehicle_id: vehicleId })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Send notification to customer
      try {
        await supabase.functions.invoke('send-booking-notification', {
          body: { bookingId, stage: 'vehicle_assigned' },
        });
      } catch (e) {
        console.error('Failed to send vehicle assignment notification:', e);
      }

      return { bookingId, vehicleId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-availability'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      toast({
        title: 'Vehicle assigned',
        description: 'The vehicle has been assigned and customer notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Unassign the current VIN unit from a booking and release it back to available.
 * Used when staff want to change the vehicle before activation.
 */
export function useUnassignVehicle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Release the VIN unit first
      try {
        await supabase.rpc("release_vin_from_booking", { p_booking_id: bookingId });
      } catch (e) {
        console.error("Failed to release VIN:", e);
      }

      // Clear vehicle and unit assignment
      const { error } = await supabase
        .from("bookings")
        .update({
          vehicle_id: null,
          assigned_unit_id: null,
        })
        .eq("id", bookingId);

      if (error) throw error;

      return bookingId;
    },
    onSuccess: (bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      toast({
        title: "Vehicle unassigned",
        description: "Vehicle cleared. You can now assign a different one.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unassign vehicle",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
