/**
 * Fleet Categories Hook - NEW VIN Pool System
 * Single source of truth for category + VIN management
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FleetCategory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  daily_rate: number;
  seats: number | null;
  fuel_type: string | null;
  transmission: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Computed
  available_count?: number;
  total_count?: number;
}

export interface VinUnit {
  id: string;
  vin: string;
  license_plate: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: 'available' | 'on_rent' | 'maintenance' | 'damage';
  location_id: string | null;
  location_name?: string | null;
  notes: string | null;
  current_mileage: number | null;
  acquisition_cost: number | null;
  category_id: string | null;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  image_url?: string;
  daily_rate: number;
  seats?: number;
  fuel_type?: string;
  transmission?: string;
}

export interface CreateVinInput {
  category_id: string;
  vin: string;
  license_plate: string;
  location_id: string;
  year?: number;
  make?: string;
  model?: string;
  status?: 'available' | 'on_rent' | 'maintenance' | 'damage';
  notes?: string;
}

// Get all categories with counts for admin
export function useFleetCategories() {
  return useQuery({
    queryKey: ["fleet-categories"],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name");

      if (error) throw error;

      // Get unit counts per category
      const { data: units } = await supabase
        .from("vehicle_units")
        .select("category_id, status")
        .not("category_id", "is", null);

      const countMap = new Map<string, { total: number; available: number }>();
      (units || []).forEach((u) => {
        const catId = u.category_id!;
        if (!countMap.has(catId)) {
          countMap.set(catId, { total: 0, available: 0 });
        }
        const entry = countMap.get(catId)!;
        entry.total++;
        if (u.status === 'available') {
          entry.available++;
        }
      });

      return (categories || []).map((cat) => ({
        ...cat,
        total_count: countMap.get(cat.id)?.total || 0,
        available_count: countMap.get(cat.id)?.available || 0,
      })) as FleetCategory[];
    },
  });
}

// Get available categories for customer browsing (only those with available VINs)
export function useAvailableCategories(locationId: string | null) {
  return useQuery({
    queryKey: ["available-categories", locationId],
    queryFn: async () => {
      if (!locationId) return [];

      // Use the database function for consistency
      const { data, error } = await supabase
        .rpc("get_available_categories", { p_location_id: locationId });

      if (error) {
        console.error("Error fetching available categories:", error);
        // Fallback to manual query if function doesn't exist yet
        const { data: categories } = await supabase
          .from("vehicle_categories")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");
        
        // Get available units per category at location
        const { data: units } = await supabase
          .from("vehicle_units")
          .select("category_id")
          .eq("location_id", locationId)
          .eq("status", "available");

        const availableCategories = new Set(units?.map(u => u.category_id) || []);
        
        return (categories || [])
          .filter(c => availableCategories.has(c.id))
          .map(c => ({
            ...c,
            available_count: units?.filter(u => u.category_id === c.id).length || 0,
          })) as FleetCategory[];
      }

      return data as FleetCategory[];
    },
    enabled: !!locationId,
  });
}

// Get VINs for a category
export function useCategoryVins(categoryId: string | null) {
  return useQuery({
    queryKey: ["category-vins", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          location:locations(name),
          vehicle:vehicles(make, model, year)
        `)
        .eq("category_id", categoryId)
        .order("status")
        .order("vin");

      if (error) throw error;

      return (data || []).map((unit) => ({
        id: unit.id,
        vin: unit.vin,
        license_plate: unit.license_plate,
        year: unit.vehicle?.year || null,
        make: unit.vehicle?.make || null,
        model: unit.vehicle?.model || null,
        status: unit.status as VinUnit['status'],
        location_id: unit.location_id,
        location_name: unit.location?.name || null,
        notes: unit.notes,
        current_mileage: unit.current_mileage,
        acquisition_cost: unit.acquisition_cost ? Number(unit.acquisition_cost) : null,
        category_id: unit.category_id,
        created_at: unit.created_at,
      })) as VinUnit[];
    },
    enabled: !!categoryId,
  });
}

// Create category
export function useCreateFleetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .insert({
          name: input.name,
          description: input.description || null,
          image_url: input.image_url || null,
          daily_rate: input.daily_rate,
          seats: input.seats || 5,
          fuel_type: input.fuel_type || 'Gas',
          transmission: input.transmission || 'Automatic',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      toast.success("Category created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create category: " + error.message);
    },
  });
}

// Update category
export function useUpdateFleetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FleetCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      toast.success("Category updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update category: " + error.message);
    },
  });
}

// Delete category
export function useDeleteFleetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      // First unassign all VINs from this category
      await supabase
        .from("vehicle_units")
        .update({ category_id: null })
        .eq("category_id", categoryId);

      const { error } = await supabase
        .from("vehicle_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      toast.success("Category deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete category: " + error.message);
    },
  });
}

// Add VIN to category
export function useAddVinToCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVinInput) => {
      // Check for duplicate VIN
      const { data: existing } = await supabase
        .from("vehicle_units")
        .select("id")
        .eq("vin", input.vin.toUpperCase())
        .maybeSingle();

      if (existing) {
        throw new Error("A vehicle with this VIN already exists");
      }

      // Get category info for vehicle creation
      const { data: category } = await supabase
        .from("vehicle_categories")
        .select("name, daily_rate")
        .eq("id", input.category_id)
        .single();

      // Create a vehicle entry (for backwards compatibility)
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .insert({
          make: input.make || "Various",
          model: input.model || category?.name || "Fleet Vehicle",
          year: input.year || new Date().getFullYear(),
          daily_rate: category?.daily_rate || 100,
          category: category?.name || "General",
          is_available: true,
        })
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      // Create vehicle unit
      const { data, error } = await supabase
        .from("vehicle_units")
        .insert({
          vehicle_id: vehicle.id,
          category_id: input.category_id,
          vin: input.vin.toUpperCase(),
          license_plate: input.license_plate.toUpperCase(),
          location_id: input.location_id,
          status: input.status || 'available',
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      toast.success("Vehicle added to category");
    },
    onError: (error: Error) => {
      toast.error("Failed to add vehicle: " + error.message);
    },
  });
}

// Update VIN status
export function useUpdateVinStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: VinUnit['status']; notes?: string }) => {
      const { error } = await supabase
        .from("vehicle_units")
        .update({ status, notes: notes || null, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      toast.success("Vehicle status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
}

// Delete VIN
export function useDeleteVin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vinId: string) => {
      const { error } = await supabase
        .from("vehicle_units")
        .delete()
        .eq("id", vinId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      toast.success("Vehicle removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove vehicle: " + error.message);
    },
  });
}

// Atomic VIN assignment for booking
export function useAssignVinToBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, bookingId, locationId }: { 
      categoryId: string; 
      bookingId: string; 
      locationId: string;
    }) => {
      const { data, error } = await supabase
        .rpc("assign_vin_to_booking", {
          p_category_id: categoryId,
          p_booking_id: bookingId,
          p_location_id: locationId,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Vehicle assigned to booking");
    },
    onError: (error: Error) => {
      toast.error("Failed to assign vehicle: " + error.message);
    },
  });
}

// Release VIN from booking
export function useReleaseVinFromBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, newStatus = 'available' }: { 
      bookingId: string; 
      newStatus?: string;
    }) => {
      const { error } = await supabase
        .rpc("release_vin_from_booking", {
          p_booking_id: bookingId,
          p_new_status: newStatus,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Vehicle released");
    },
    onError: (error: Error) => {
      toast.error("Failed to release vehicle: " + error.message);
    },
  });
}
