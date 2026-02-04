import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AvailableUnit {
  id: string;
  vin: string;
  licensePlate: string | null;
  color: string | null;
  currentMileage: number | null;
  vehicleId: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    category: string;
  };
}

export interface LowInventoryAlert {
  vehicleId: string;
  make: string;
  model: string;
  category: string;
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
}

// Get available units for a vehicle (not currently assigned to active bookings)
export function useAvailableUnits(vehicleId: string | null) {
  return useQuery({
    queryKey: ["available-units", vehicleId],
    queryFn: async (): Promise<AvailableUnit[]> => {
      if (!vehicleId) return [];

      // Get all active units for this category
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, vehicle_id, category_id")
        .eq("category_id", vehicleId) // vehicleId is actually categoryId in the new model
        .eq("status", "available");

      if (unitsError) throw unitsError;

      // Get category info for display
      const { data: categoryData } = await supabase
        .from("vehicle_categories")
        .select("name")
        .eq("id", vehicleId)
        .maybeSingle();

      // Get units that are currently assigned to active/confirmed bookings
      const { data: assignedBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .in("status", ["confirmed", "active"])
        .not("assigned_unit_id", "is", null);

      if (bookingsError) throw bookingsError;

      const assignedUnitIds = new Set(
        (assignedBookings || []).map((b) => b.assigned_unit_id).filter(Boolean)
      );

      // Filter out assigned units
      return (units || [])
        .filter((u) => !assignedUnitIds.has(u.id))
        .map((u) => ({
          id: u.id,
          vin: u.vin,
          licensePlate: u.license_plate,
          color: u.color,
          currentMileage: u.current_mileage,
          vehicleId: u.category_id || u.vehicle_id,
          vehicle: {
            make: "",
            model: categoryData?.name || "Vehicle",
            year: new Date().getFullYear(),
            category: categoryData?.name || "General",
          },
        }));
    },
    enabled: !!vehicleId,
  });
}

// Check low inventory across all vehicles
export function useLowInventoryAlerts(threshold: number = 2) {
  return useQuery({
    queryKey: ["low-inventory-alerts", threshold],
    queryFn: async (): Promise<LowInventoryAlert[]> => {
      // Get all vehicles with their units
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, make, model, category")
        .eq("is_available", true);

      if (vehiclesError) throw vehiclesError;

      // Get all active units grouped by vehicle
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select("id, vehicle_id")
        .eq("status", "active");

      if (unitsError) throw unitsError;

      // Get currently assigned units
      const { data: assignedBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .in("status", ["confirmed", "active"])
        .not("assigned_unit_id", "is", null);

      if (bookingsError) throw bookingsError;

      const assignedUnitIds = new Set(
        (assignedBookings || []).map((b) => b.assigned_unit_id).filter(Boolean)
      );

      // Calculate availability per vehicle
      const alerts: LowInventoryAlert[] = [];

      for (const vehicle of vehicles || []) {
        const vehicleUnits = (units || []).filter((u) => u.vehicle_id === vehicle.id);
        const totalUnits = vehicleUnits.length;
        const bookedUnits = vehicleUnits.filter((u) => assignedUnitIds.has(u.id)).length;
        const availableUnits = totalUnits - bookedUnits;

        if (availableUnits <= threshold && totalUnits > 0) {
          alerts.push({
            vehicleId: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            category: vehicle.category,
            totalUnits,
            availableUnits,
            bookedUnits,
          });
        }
      }

      return alerts.sort((a, b) => a.availableUnits - b.availableUnits);
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

// Auto-assign a unit to a booking
export function useAutoAssignUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      vehicleId,
    }: {
      bookingId: string;
      vehicleId: string;
    }) => {
      // Get available units for this vehicle/category
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage")
        .eq("category_id", vehicleId)
        .eq("status", "available");

      if (unitsError) throw unitsError;

      if (!units || units.length === 0) {
        throw new Error("No units available for this vehicle");
      }

      // Get units that are currently assigned to active bookings
      const { data: assignedBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .in("status", ["confirmed", "active"])
        .not("assigned_unit_id", "is", null);

      if (bookingsError) throw bookingsError;

      const assignedUnitIds = new Set(
        (assignedBookings || []).map((b) => b.assigned_unit_id).filter(Boolean)
      );

      // Find first available unit
      const availableUnit = units.find((u) => !assignedUnitIds.has(u.id));

      if (!availableUnit) {
        throw new Error("All units are currently assigned. No VIN available.");
      }

      // Assign the unit to the booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ assigned_unit_id: availableUnit.id })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      return { bookingId, unit: availableUnit };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-units"] });
      queryClient.invalidateQueries({ queryKey: ["low-inventory-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["booking-assigned-unit"] });
      toast.success(`VIN ${data.unit.vin} assigned successfully${data.unit.license_plate ? ` (${data.unit.license_plate})` : ""}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Manually assign a specific unit to a booking
export function useAssignUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      unitId,
    }: {
      bookingId: string;
      unitId: string;
    }) => {
      // Check if unit is already assigned
      const { data: existingBooking, error: checkError } = await supabase
        .from("bookings")
        .select("id, booking_code")
        .eq("assigned_unit_id", unitId)
        .in("status", ["confirmed", "active"])
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBooking) {
        throw new Error(
          `This unit is already assigned to booking ${existingBooking.booking_code}`
        );
      }

      // Assign the unit
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ assigned_unit_id: unitId })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      return { bookingId, unitId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["available-units"] });
      queryClient.invalidateQueries({ queryKey: ["low-inventory-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["booking-assigned-unit", variables.bookingId] });
      toast.success("VIN unit assigned successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update unit mileage on return
export function useUpdateUnitMileage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      unitId,
      newMileage,
    }: {
      unitId: string;
      newMileage: number;
    }) => {
      const { error } = await supabase
        .from("vehicle_units")
        .update({ current_mileage: newMileage })
        .eq("id", unitId);

      if (error) throw error;

      return { unitId, newMileage };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });
    },
  });
}

// Get assigned unit for a booking
export function useBookingAssignedUnit(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking-assigned-unit", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      if (!booking.assigned_unit_id) return null;

      const { data: unit, error: unitError } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, vehicle_id, category_id")
        .eq("id", booking.assigned_unit_id)
        .single();

      if (unitError) throw unitError;

      // Get category info
      const { data: categoryData } = unit.category_id
        ? await supabase
            .from("vehicle_categories")
            .select("name")
            .eq("id", unit.category_id)
            .maybeSingle()
        : { data: null };

      return {
        id: unit.id,
        vin: unit.vin,
        licensePlate: unit.license_plate,
        color: unit.color,
        currentMileage: unit.current_mileage,
        vehicleId: unit.category_id || unit.vehicle_id,
        vehicle: {
          make: "",
          model: categoryData?.name || "Vehicle",
          year: new Date().getFullYear(),
          category: categoryData?.name || "General",
        },
      };
    },
    enabled: !!bookingId,
  });
}
