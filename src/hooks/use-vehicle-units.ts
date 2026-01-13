import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface VehicleUnit {
  id: string;
  vehicle_id: string;
  vin: string;
  acquisition_cost: number;
  acquisition_date: string | null;
  license_plate: string | null;
  color: string | null;
  mileage_at_acquisition: number | null;
  current_mileage: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    category: string;
  };
  total_expenses?: number;
}

export interface VehicleUnitFilters {
  vehicleId?: string;
  status?: string;
  search?: string;
}

export function useVehicleUnits(filters: VehicleUnitFilters = {}) {
  return useQuery({
    queryKey: ["vehicle-units", filters],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_units")
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, category)
        `)
        .order("created_at", { ascending: false });

      if (filters.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.search) {
        query = query.or(`vin.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch total expenses for each unit
      const unitsWithExpenses = await Promise.all(
        (data || []).map(async (unit) => {
          const { data: expenseData } = await supabase
            .from("vehicle_expenses")
            .select("amount")
            .eq("vehicle_unit_id", unit.id);

          const totalExpenses = (expenseData || []).reduce(
            (sum, exp) => sum + Number(exp.amount),
            0
          );

          return {
            ...unit,
            total_expenses: totalExpenses,
          } as VehicleUnit;
        })
      );

      return unitsWithExpenses;
    },
  });
}

export function useVehicleUnit(id: string | null) {
  return useQuery({
    queryKey: ["vehicle-unit", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, category)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get total expenses
      const { data: expenseData } = await supabase
        .from("vehicle_expenses")
        .select("amount")
        .eq("vehicle_unit_id", id);

      const totalExpenses = (expenseData || []).reduce(
        (sum, exp) => sum + Number(exp.amount),
        0
      );

      return {
        ...data,
        total_expenses: totalExpenses,
      } as VehicleUnit;
    },
    enabled: !!id,
  });
}

export function useCreateVehicleUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unit: Omit<VehicleUnit, "id" | "created_at" | "updated_at" | "vehicle" | "total_expenses">) => {
      const { data, error } = await supabase
        .from("vehicle_units")
        .insert(unit)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      toast({ title: "Vehicle unit added successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add vehicle unit",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateVehicleUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VehicleUnit> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicle_units")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });
      toast({ title: "Vehicle unit updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update vehicle unit",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteVehicleUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_units")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      toast({ title: "Vehicle unit deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete vehicle unit",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
