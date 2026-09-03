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
  tank_capacity_liters?: number;
  notes?: string;
}

// Get all categories with counts for admin (optionally scoped to one branch)
export function useFleetCategories(locationId?: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: ["fleet-categories", locationId ?? "all"],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from("vehicle_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name");

      if (error) throw error;

      // Get unit counts per category (branch-scoped when a location is selected)
      let unitsQuery = supabase
        .from("vehicle_units")
        .select("id, category_id, status")
        .not("category_id", "is", null);

      if (locationId) {
        unitsQuery = unitsQuery.eq("location_id", locationId);
      }

      const { data: units } = await unitsQuery;

      // Fetch active bookings to derive real on_rent status
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .eq("status", "active")
        .not("assigned_unit_id", "is", null);

      const activeUnitIds = new Set((activeBookings || []).map(b => b.assigned_unit_id));

      const countMap = new Map<string, { total: number; available: number; onRent: number; maintenance: number }>();
      (units || []).forEach((u) => {
        const catId = u.category_id!;
        if (!countMap.has(catId)) {
          countMap.set(catId, { total: 0, available: 0, onRent: 0, maintenance: 0 });
        }
        const entry = countMap.get(catId)!;
        entry.total++;
        // Derive on_rent from active bookings, not unit status
        const isOnRent = activeUnitIds.has(u.id);
        const isMaintenance = u.status === 'maintenance' || u.status === 'damage';
        if (isOnRent) {
          entry.onRent++;
        } else if (isMaintenance) {
          entry.maintenance++;
        } else {
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

/**
 * Customer-facing availability for a location + exact rental window.
 * Backend RPC is the single source of truth — there is deliberately NO
 * client-side fallback (guests cannot read units/bookings under RLS, so a
 * fallback would wrongly report everything as available).
 */
export function useAvailableCategories(
  locationId: string | null,
  startAt?: Date | null,
  endAt?: Date | null,
) {
  const startIso = startAt ? new Date(startAt).toISOString() : null;
  const endIso = endAt ? new Date(endAt).toISOString() : null;

  return useQuery({
    queryKey: ["available-categories", locationId, startIso, endIso],
    queryFn: async () => {
      if (!locationId || !startIso || !endIso) return [];

      const { data, error } = await supabase.rpc("get_category_availability", {
        p_location_id: locationId,
        p_start_at: startIso,
        p_end_at: endIso,
        p_exclude_hold: null,
        p_exclude_booking: null,
      });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        is_active: true,
        available_count: Number(c.available_count ?? 0),
        total_count: Number(c.total_count ?? 0),
      })) as FleetCategory[];
    },
    enabled: !!locationId && !!startIso && !!endIso,
    staleTime: 0,
    gcTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Get VINs for a category
export function useCategoryVins(categoryId: string | null, locationId?: string | null) {
  return useQuery({
    queryKey: ["category-vins", categoryId, locationId ?? "all"],
    queryFn: async () => {
      if (!categoryId) return [];

      // Fetch units with location AND linked vehicle for year/make/model
      let unitsQuery = supabase
        .from("vehicle_units")
        .select(`
          id, vin, license_plate, status, location_id, notes, current_mileage, acquisition_cost, category_id, created_at,
          location:locations(name),
          vehicle:vehicles!vehicle_units_vehicle_id_fkey(year, make, model)
        `)
        .eq("category_id", categoryId)
        .order("status")
        .order("vin");

      if (locationId) {
        unitsQuery = unitsQuery.eq("location_id", locationId);
      }

      const { data, error } = await unitsQuery;

      if (error) throw error;

      return (data || []).map((unit) => ({
        id: unit.id,
        vin: unit.vin,
        license_plate: unit.license_plate,
        year: (unit as any).vehicle?.year ?? null,
        make: (unit as any).vehicle?.make ?? null,
        model: (unit as any).vehicle?.model ?? null,
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

      // Coerce empty string → null so Postgres doesn't reject as invalid UUID
      const categoryId = input.category_id && input.category_id.trim() ? input.category_id : null;

      // Get category info for vehicle creation (only if a category is selected)
      const { data: category } = categoryId
        ? await supabase
            .from("vehicle_categories")
            .select("name, daily_rate")
            .eq("id", categoryId)
            .single()
        : { data: null as { name: string; daily_rate: number } | null };

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
          category_id: categoryId,
          vin: input.vin.toUpperCase(),
          license_plate: input.license_plate.toUpperCase(),
          location_id: input.location_id,
          status: input.status || 'available',
          tank_capacity_liters: input.tank_capacity_liters || null,
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

// Delete VIN (with soft-archive fallback for units referenced by historical bookings)
export function useDeleteVin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vinId: string): Promise<{ archived: boolean }> => {
      // 1. Block if active/upcoming booking holds this unit
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("booking_code, status")
        .eq("assigned_unit_id", vinId)
        .in("status", ["pending", "confirmed", "active"]);

      if (activeBookings && activeBookings.length > 0) {
        const codes = activeBookings.map((b: any) => b.booking_code).filter(Boolean).join(", ");
        throw new Error(
          `Cannot delete: vehicle is on ${activeBookings.length} active/upcoming booking(s)${codes ? ` (${codes})` : ""}. Cancel or complete those bookings first.`
        );
      }

      // 2. Hard delete
      const { error } = await supabase.from("vehicle_units").delete().eq("id", vinId);
      if (!error) return { archived: false };

      // 3. Fallback: soft-archive on FK violation (historical bookings still reference it)
      if (error.code === "23503") {
        const archiveNote = `Archived ${new Date().toISOString().slice(0, 10)} – sold/removed from active fleet`;
        const { error: archiveErr } = await supabase
          .from("vehicle_units")
          .update({
            status: "retired",
            location_id: null,
            notes: archiveNote,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vinId);
        if (archiveErr) throw new Error(`Failed to archive vehicle: ${archiveErr.message}`);
        return { archived: true };
      }

      throw error;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fleet-categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-vins"] });
      queryClient.invalidateQueries({ queryKey: ["available-categories"] });
      toast.success(
        result.archived
          ? "Vehicle archived (kept for historical records)"
          : "Vehicle removed"
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
