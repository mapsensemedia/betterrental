/**
 * @deprecated This module uses the legacy vehicles table for availability checks.
 * For new code, use the category-based availability system:
 * - useBrowseCategories() which calls get_available_categories() RPC
 * - useCategoryAvailability() for checking specific category availability
 * 
 * The vehicles-based availability is being phased out.
 * See REFACTOR_PLAN.md PR2 for migration details.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AvailabilityFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  isAwd?: boolean;
}

export interface AvailabilityQuery {
  locationId: string;
  startAt: Date;
  endAt: Date;
  filters?: AvailabilityFilters;
}

export interface AvailableVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  dailyRate: number;
  imageUrl: string | null;
  seats: number | null;
  fuelType: string | null;
  transmission: string | null;
  isFeatured: boolean | null;
  featuresJson: unknown;
  specsJson: unknown;
  cleaningBufferHours: number | null;
}

/**
 * Check vehicle availability for a given location and date range.
 * Excludes vehicles that are:
 * 1. Not available (is_available = false)
 * 2. Booked during the requested period (overlapping bookings)
 * 3. In cleaning buffer period (end_at + cleaning_buffer_hours)
 * 4. Held by active reservation holds (to be added in Phase 4)
 */
export async function getAvailableVehicles(
  query: AvailabilityQuery
): Promise<AvailableVehicle[]> {
  const { locationId, startAt, endAt, filters } = query;

  // Get all vehicles at location OR available at all locations (location_id = null)
  let vehicleQuery = supabase
    .from("vehicles")
    .select("*")
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .eq("is_available", true);

  // Apply filters
  if (filters?.category) {
    vehicleQuery = vehicleQuery.eq("category", filters.category);
  }
  if (filters?.minPrice !== undefined) {
    vehicleQuery = vehicleQuery.gte("daily_rate", filters.minPrice);
  }
  if (filters?.maxPrice !== undefined) {
    vehicleQuery = vehicleQuery.lte("daily_rate", filters.maxPrice);
  }
  if (filters?.seats !== undefined) {
    vehicleQuery = vehicleQuery.gte("seats", filters.seats);
  }
  if (filters?.transmission) {
    vehicleQuery = vehicleQuery.eq("transmission", filters.transmission);
  }
  if (filters?.fuelType) {
    vehicleQuery = vehicleQuery.eq("fuel_type", filters.fuelType);
  }

  const { data: vehicles, error: vehiclesError } = await vehicleQuery;

  if (vehiclesError) {
    console.error("Error fetching vehicles:", vehiclesError);
    return [];
  }

  if (!vehicles || vehicles.length === 0) {
    return [];
  }

  // Get all bookings that overlap with requested period
  const vehicleIds = vehicles.map((v) => v.id);
  
  const { data: conflictingBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("vehicle_id, end_at")
    .in("vehicle_id", vehicleIds)
    .in("status", ["pending", "confirmed", "active"])
    .or(
      `and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`
    );

  if (bookingsError) {
    console.error("Error fetching bookings:", bookingsError);
    return [];
  }

  // Get active reservation holds that overlap with requested period
  const { data: activeHolds, error: holdsError } = await supabase
    .from("reservation_holds")
    .select("vehicle_id")
    .in("vehicle_id", vehicleIds)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .or(
      `and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`
    );

  if (holdsError) {
    console.error("Error fetching holds:", holdsError);
  }

  // Build set of blocked vehicle IDs
  const blockedVehicleIds = new Set<string>();

  // Block vehicles with overlapping bookings
  conflictingBookings?.forEach((booking) => {
    blockedVehicleIds.add(booking.vehicle_id);
  });

  // Block vehicles with active holds
  activeHolds?.forEach((hold) => {
    blockedVehicleIds.add(hold.vehicle_id);
  });

  // Check cleaning buffer: if a booking ends within buffer period before startAt
  const { data: cleaningConflicts, error: cleaningError } = await supabase
    .from("bookings")
    .select("vehicle_id, end_at")
    .in("vehicle_id", vehicleIds)
    .in("status", ["completed", "active"])
    .lte("end_at", startAt.toISOString());

  if (!cleaningError && cleaningConflicts) {
    cleaningConflicts.forEach((booking) => {
      const vehicle = vehicles.find((v) => v.id === booking.vehicle_id);
      if (vehicle) {
        const bufferHours = vehicle.cleaning_buffer_hours || 2;
        const bufferEnd = new Date(booking.end_at);
        bufferEnd.setHours(bufferEnd.getHours() + bufferHours);
        
        if (bufferEnd > startAt) {
          blockedVehicleIds.add(booking.vehicle_id);
        }
      }
    });
  }

  // Filter out blocked vehicles
  const availableVehicles = vehicles
    .filter((v) => !blockedVehicleIds.has(v.id))
    .map((v) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      category: v.category,
      dailyRate: Number(v.daily_rate),
      imageUrl: v.image_url,
      seats: v.seats,
      fuelType: v.fuel_type,
      transmission: v.transmission,
      isFeatured: v.is_featured,
      featuresJson: v.features_json,
      specsJson: v.specs_json,
      cleaningBufferHours: v.cleaning_buffer_hours,
    }));

  return availableVehicles;
}

/**
 * Check if a specific vehicle is available for a date range
 */
export async function isVehicleAvailable(
  vehicleId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  // Check for overlapping bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .in("status", ["pending", "confirmed", "active"])
    .or(
      `and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`
    )
    .limit(1);

  if (bookingsError) {
    console.error("Error checking vehicle availability:", bookingsError);
    return false;
  }

  if (bookings && bookings.length > 0) {
    return false;
  }

  // Check for active holds
  const { data: holds, error: holdsError } = await supabase
    .from("reservation_holds")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .or(
      `and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`
    )
    .limit(1);

  if (holdsError) {
    console.error("Error checking holds:", holdsError);
    return false;
  }

  if (holds && holds.length > 0) {
    return false;
  }

  return true;
}

