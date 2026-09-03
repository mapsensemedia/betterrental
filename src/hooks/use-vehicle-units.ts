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
  category_id: string | null;
  notes: string | null;
  status: string;
  tank_capacity_liters: number | null;
  location_id: string | null;
  location_name?: string | null;
  is_temporary?: boolean;
  temp_source?: string | null;
  temp_start_date?: string | null;
  temp_end_date?: string | null;
  temp_daily_cost?: number | null;
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
  isTemporary?: boolean;
  locationId?: string;
  categoryId?: string;
}

export function useVehicleUnits(filters: VehicleUnitFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: ["vehicle-units", filters],
    queryFn: async () => {
      let query = supabase
        .from("vehicle_units")
        .select(`
          *,
          vehicle:vehicles(id, make, model, year, category),
          location:locations(id, name)
        `)
        .order("created_at", { ascending: false });

      if (filters.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (typeof filters.isTemporary === "boolean") {
        query = query.eq("is_temporary", filters.isTemporary);
      }

      if (filters.locationId && filters.locationId !== "all") {
        query = query.eq("location_id", filters.locationId);
      }

      if (filters.categoryId && filters.categoryId !== "all") {
        query = query.eq("category_id", filters.categoryId);
      }

      // Note: search is applied client-side below so it can match joined vehicle fields (make/model/year)

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Batch fetch all expenses in a single query - fixes N+1 issue
      const unitIds = data.map(u => u.id);
      const { data: allExpenses } = await supabase
        .from("vehicle_expenses")
        .select("vehicle_unit_id, amount")
        .in("vehicle_unit_id", unitIds);

      // Aggregate expenses by unit
      const expenseMap = new Map<string, number>();
      (allExpenses || []).forEach(e => {
        const total = expenseMap.get(e.vehicle_unit_id) || 0;
        expenseMap.set(e.vehicle_unit_id, total + Number(e.amount));
      });

      let results = data.map((unit: any) => ({
        ...unit,
        location_name: unit.location?.name || null,
        total_expenses: expenseMap.get(unit.id) || 0,
      } as VehicleUnit));

      if (filters.search) {
        const q = filters.search.trim().toLowerCase();
        if (q) {
          results = results.filter((u: any) => {
            const v = u.vehicle || {};
            const hay = [
              u.vin,
              u.license_plate,
              v.make,
              v.model,
              v.year != null ? String(v.year) : "",
              v.category,
              [v.year, v.make, v.model].filter(Boolean).join(" "),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            return hay.includes(q);
          });
        }
      }

      return results;
    },
    staleTime: 30000,
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

      if (error) {
        if (error.code === "23505") {
          throw new Error("A vehicle with that VIN or license plate already exists.");
        }
        if (error.code === "42501") {
          throw new Error("You don't have permission to edit this vehicle. Admin/staff role required.");
        }
        throw new Error(error.message || "Update failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });
      queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-cost-timeline", data.id] });
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
    mutationFn: async (id: string): Promise<{ archived: boolean }> => {
      // 1. Block delete if there's an ACTIVE/PENDING/CONFIRMED booking on this unit
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("booking_code, status")
        .eq("assigned_unit_id", id)
        .in("status", ["pending", "confirmed", "active"]);

      if (activeBookings && activeBookings.length > 0) {
        const codes = activeBookings.map((b: any) => b.booking_code).filter(Boolean).join(", ");
        throw new Error(
          `Cannot delete: vehicle is on ${activeBookings.length} active/upcoming booking(s)${codes ? ` (${codes})` : ""}. Cancel or complete those bookings first.`
        );
      }

      // 2. Detach historical references that would block a hard delete.
      //    Past bookings (completed/cancelled) keep their financial history but
      //    no longer point at the deleted VIN.
      const { error: detachErr } = await supabase
        .from("bookings")
        .update({ assigned_unit_id: null })
        .eq("assigned_unit_id", id);
      if (detachErr) throw new Error(`Failed to detach bookings: ${detachErr.message}`);

      // Damage reports are tied to the physical unit – remove them.
      const { error: damageErr } = await supabase
        .from("damage_reports")
        .delete()
        .eq("vehicle_unit_id", id);
      if (damageErr) throw new Error(`Failed to remove damage reports: ${damageErr.message}`);

      // 3. Hard delete. Remaining FKs cascade (vehicle_expenses, fleet_cost_cache,
      //    maintenance_logs) or set null (incident_cases) automatically.
      const { error } = await supabase.from("vehicle_units").delete().eq("id", id);
      if (error) throw error;

      return { archived: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      toast({
        title: result.archived
          ? "Vehicle archived"
          : "Vehicle unit deleted successfully",
        description: result.archived
          ? "Kept for historical records — won't appear in active fleet."
          : undefined,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove vehicle",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Returns active/upcoming bookings blocking a status change (retire / return).
 */
export async function getBlockingBookings(unitId: string) {
  const { data } = await supabase
    .from("bookings")
    .select("booking_code, status")
    .eq("assigned_unit_id", unitId)
    .in("status", ["pending", "confirmed", "active"]);
  return data ?? [];
}

interface SetStatusInput {
  id: string;
  status: string;
  /** Block the change when the unit still has active/upcoming bookings. */
  guardBookings?: boolean;
  /** Stamp actual_disposal_date (temporary vehicle returned / retired). */
  stampDisposalDate?: boolean;
  successTitle?: string;
}

export function useSetVehicleUnitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, guardBookings, stampDisposalDate }: SetStatusInput) => {
      if (guardBookings) {
        const blocking = await getBlockingBookings(id);
        if (blocking.length > 0) {
          const codes = blocking.map((b: any) => b.booking_code).filter(Boolean).join(", ");
          throw new Error(
            `Vehicle is on ${blocking.length} active/upcoming booking(s)${codes ? ` (${codes})` : ""}. Complete or cancel those first.`,
          );
        }
      }

      const updates: Record<string, unknown> = { status };
      if (stampDisposalDate) {
        updates.actual_disposal_date = new Date().toISOString().slice(0, 10);
      }

      const { data, error } = await supabase
        .from("vehicle_units")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "42501") {
          throw new Error("You don't have permission to change this vehicle. Admin/staff role required.");
        }
        throw new Error(error.message || "Status change failed");
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit", data.id] });
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      toast({ title: variables.successTitle ?? "Vehicle status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Status change failed", description: error.message, variant: "destructive" });
    },
  });
}
