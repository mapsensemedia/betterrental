/**
 * Vehicle Categories Hook
 * CRUD operations for fleet categories with VIN assignment
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VehicleCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  vehicle_count?: number;
  vehicles?: Array<{
    id: string;
    vin: string;
    license_plate: string | null;
    vehicle: {
      make: string;
      model: string;
      year: number;
    };
  }>;
}

export function useVehicleCategories() {
  return useQuery({
    queryKey: ["vehicle-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as VehicleCategory[];
    },
  });
}

export function useVehicleCategoryWithUnits(categoryId: string | null) {
  return useQuery({
    queryKey: ["vehicle-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;

      const { data: category, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .eq("id", categoryId)
        .maybeSingle();

      if (error) throw error;
      if (!category) return null;

      // Get units in this category
      const { data: units } = await supabase
        .from("vehicle_units")
        .select(`
          id,
          vin,
          license_plate,
          vehicle:vehicles(make, model, year)
        `)
        .eq("category_id", categoryId);

      return {
        ...category,
        vehicles: units || [],
        vehicle_count: units?.length || 0,
      } as VehicleCategory;
    },
    enabled: !!categoryId,
  });
}

export function useCategoriesWithCounts() {
  return useQuery({
    queryKey: ["vehicle-categories-with-counts"],
    queryFn: async () => {
      // Get all categories
      const { data: categories, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .order("name");

      if (error) throw error;

      // Get count of units per category in a single query
      const { data: units } = await supabase
        .from("vehicle_units")
        .select("category_id, id, vin, vehicle:vehicles(make, model, year)")
        .not("category_id", "is", null);

      const countMap = new Map<string, { count: number; models: Set<string> }>();
      (units || []).forEach((u: any) => {
        const catId = u.category_id;
        if (!countMap.has(catId)) {
          countMap.set(catId, { count: 0, models: new Set() });
        }
        const entry = countMap.get(catId)!;
        entry.count++;
        if (u.vehicle) {
          entry.models.add(`${u.vehicle.year} ${u.vehicle.make} ${u.vehicle.model}`);
        }
      });

      return (categories || []).map((cat) => ({
        ...cat,
        vehicle_count: countMap.get(cat.id)?.count || 0,
        models: Array.from(countMap.get(cat.id)?.models || []),
      }));
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("vehicle_categories")
        .insert({
          name: params.name,
          description: params.description || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      toast.success("Category created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create category: " + error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string }) => {
      const { id, ...updates } = params;
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      toast.success("Category updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update category: " + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      // First unassign all units from this category
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete category: " + error.message);
    },
  });
}

export function useAssignVehiclesToCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { categoryId: string; unitIds: string[] }) => {
      // Unassign units currently in other categories
      // Then assign to new category
      const { error } = await supabase
        .from("vehicle_units")
        .update({ category_id: params.categoryId })
        .in("id", params.unitIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      toast.success("Vehicles assigned to category");
    },
    onError: (error: Error) => {
      toast.error("Failed to assign vehicles: " + error.message);
    },
  });
}

export function useUnassignVehiclesFromCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unitIds: string[]) => {
      const { error } = await supabase
        .from("vehicle_units")
        .update({ category_id: null })
        .in("id", unitIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      toast.success("Vehicles unassigned from category");
    },
    onError: (error: Error) => {
      toast.error("Failed to unassign vehicles: " + error.message);
    },
  });
}
