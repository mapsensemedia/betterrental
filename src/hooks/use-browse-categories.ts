/**
 * Browse Categories Hook
 * Fetches categories with available vehicle counts for customer-facing pages
 * 
 * PR7: Performance optimization - optimized stale time and query structure
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_STALE_TIMES } from "@/lib/query-client";

export interface BrowseCategory {
  id: string;
  name: string;
  description: string | null;
  dailyRate: number;
  imageUrl: string | null;
  availableCount: number;
  totalCount: number;
  seats: number;
  fuelType: string;
  transmission: string;
}

interface UseBrowseCategoriesParams {
  locationId?: string;
  startAt?: Date;
  endAt?: Date;
}

// Memoized category builder to avoid recreation on every render
function buildCategoryData(
  categories: any[],
  units: any[],
  bookedUnitIds: Set<string>
): BrowseCategory[] {
  // Build category data map
  const categoryMap = new Map<string, {
    totalCount: number;
    availableCount: number;
    lowestRate: number;
    imageUrl: string | null;
    seats: number;
    fuelType: string;
    transmission: string;
  }>();

  (units || []).forEach((unit: any) => {
    if (!unit.category_id || !unit.vehicle) return;

    const current = categoryMap.get(unit.category_id) || {
      totalCount: 0,
      availableCount: 0,
      lowestRate: Infinity,
      imageUrl: null,
      seats: 5,
      fuelType: "Petrol",
      transmission: "Automatic",
    };

    current.totalCount++;

    // Check if this unit is available
    const isBooked = bookedUnitIds.has(unit.id);
    const isVehicleAvailable = unit.vehicle.is_available !== false;
    if (!isBooked && isVehicleAvailable) {
      current.availableCount++;
    }

    // Track lowest rate
    const rate = Number(unit.vehicle.daily_rate || 0);
    if (rate > 0 && rate < current.lowestRate) {
      current.lowestRate = rate;
      current.imageUrl = unit.vehicle.image_url;
      current.seats = unit.vehicle.seats || 5;
      current.fuelType = unit.vehicle.fuel_type || "Petrol";
      current.transmission = unit.vehicle.transmission || "Automatic";
    }

    categoryMap.set(unit.category_id, current);
  });

  // Build final list, only include categories with vehicles
  return categories
    .map((cat): BrowseCategory | null => {
      const data = categoryMap.get(cat.id);
      if (!data || data.totalCount === 0) return null;

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        dailyRate: data.lowestRate === Infinity ? 0 : data.lowestRate,
        imageUrl: data.imageUrl,
        availableCount: data.availableCount,
        totalCount: data.totalCount,
        seats: data.seats,
        fuelType: data.fuelType,
        transmission: data.transmission,
      };
    })
    .filter((c): c is BrowseCategory => c !== null && c.availableCount > 0);
}

export function useBrowseCategories(params?: UseBrowseCategoriesParams) {
  return useQuery<BrowseCategory[]>({
    queryKey: ["browse-categories", params?.locationId, params?.startAt?.toISOString(), params?.endAt?.toISOString()],
    queryFn: async () => {
      // Get all categories with their vehicles
      const { data: categories, error: catError } = await supabase
        .from("vehicle_categories")
        .select("*")
        .order("name");

      if (catError) throw catError;
      if (!categories?.length) return [];

      // Get all vehicle units with their vehicle info
      const { data: units, error: unitError } = await supabase
        .from("vehicle_units")
        .select(`
          id,
          category_id,
          status,
          vehicle:vehicles(
            id,
            daily_rate,
            image_url,
            seats,
            fuel_type,
            transmission,
            is_available
          )
        `)
        .eq("status", "active");

      if (unitError) throw unitError;

      // If date range is specified, check for booked units
      let bookedUnitIds = new Set<string>();
      if (params?.startAt && params?.endAt) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("assigned_unit_id")
          .not("assigned_unit_id", "is", null)
          .in("status", ["confirmed", "active"])
          .or(`start_at.lte.${params.endAt.toISOString()},end_at.gte.${params.startAt.toISOString()}`);

        (bookings || []).forEach((b) => {
          if (b.assigned_unit_id) bookedUnitIds.add(b.assigned_unit_id);
        });
      }

      return buildCategoryData(categories, units || [], bookedUnitIds);
    },
    staleTime: QUERY_STALE_TIMES.categories,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
