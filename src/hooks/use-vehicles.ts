/**
 * @deprecated This hook uses the legacy vehicles table.
 * For new code, use:
 * - useBrowseCategories() from '@/hooks/use-browse-categories' for customer-facing category browsing
 * - useFleetCategories() from '@/hooks/use-fleet-categories' for admin fleet management
 * - useCategory() from this file for fetching a single category (category-based booking flow)
 * 
 * The vehicles table is being phased out in favor of vehicle_categories + vehicle_units.
 * See REFACTOR_PLAN.md PR2 for migration details.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Vehicle {
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
  isAvailable: boolean | null;
  locationId: string | null;
  featuresJson: unknown;
  specsJson: unknown;
  imagesJson: unknown;
  cleaningBufferHours: number | null;
}

export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_available", true)
        .order("is_featured", { ascending: false })
        .order("daily_rate", { ascending: true });

      if (error) {
        console.error("Error fetching vehicles:", error);
        return [];
      }

      return (data || []).map((v) => ({
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
        isAvailable: v.is_available,
        locationId: v.location_id,
        featuresJson: v.features_json,
        specsJson: v.specs_json,
        imagesJson: v.images_json,
        cleaningBufferHours: v.cleaning_buffer_hours,
      }));
    },
    staleTime: 60000,
  });
}

export function useFeaturedVehicles(limit = 4) {
  return useQuery<Vehicle[]>({
    queryKey: ["featured-vehicles", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("is_available", true)
        .eq("is_featured", true)
        .limit(limit);

      if (error) {
        console.error("Error fetching featured vehicles:", error);
        return [];
      }

      return (data || []).map((v) => ({
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
        isAvailable: v.is_available,
        locationId: v.location_id,
        featuresJson: v.features_json,
        specsJson: v.specs_json,
        imagesJson: v.images_json,
        cleaningBufferHours: v.cleaning_buffer_hours,
      }));
    },
    staleTime: 60000,
  });
}

export function useVehicle(id: string | null) {
  return useQuery<Vehicle | null>({
    queryKey: ["vehicle", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching vehicle:", error);
        return null;
      }

      return {
        id: data.id,
        make: data.make,
        model: data.model,
        year: data.year,
        category: data.category,
        dailyRate: Number(data.daily_rate),
        imageUrl: data.image_url,
        seats: data.seats,
        fuelType: data.fuel_type,
        transmission: data.transmission,
        isFeatured: data.is_featured,
        isAvailable: data.is_available,
        locationId: data.location_id,
        featuresJson: data.features_json,
        specsJson: data.specs_json,
        imagesJson: data.images_json,
        cleaningBufferHours: data.cleaning_buffer_hours,
      };
    },
    enabled: !!id,
    staleTime: 60000,
  });
}

/**
 * Fetch a single category by ID (for new category-based booking flow)
 */
export function useCategory(id: string | null) {
  return useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching category:", error);
        return null;
      }

      // Return in Vehicle-compatible format for BookingSummaryPanel
      return {
        id: data.id,
        make: "", // Categories don't have make
        model: data.name, // Use category name as model
        year: new Date().getFullYear(),
        category: data.name,
        dailyRate: Number(data.daily_rate),
        imageUrl: data.image_url,
        seats: data.seats,
        fuelType: data.fuel_type,
        transmission: data.transmission,
        isFeatured: false,
        isAvailable: true,
        locationId: null,
        featuresJson: null,
        specsJson: null,
        imagesJson: null,
        cleaningBufferHours: null,
        // Category-specific
        isCategory: true,
        categoryName: data.name,
        categoryDescription: data.description,
      };
    },
    enabled: !!id,
    staleTime: 60000,
  });
}
