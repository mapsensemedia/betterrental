/**
 * Fleet Domain - Query Functions
 */

import { supabase } from "@/integrations/supabase/client";
import type { FleetCategory, VehicleUnit } from "./types";

/**
 * List all fleet categories with unit counts
 */
export async function listCategories(): Promise<FleetCategory[]> {
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
    if (u.status === "available") {
      entry.available++;
    }
  });

  return (categories || []).map((cat): FleetCategory => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    imageUrl: cat.image_url,
    dailyRate: Number(cat.daily_rate),
    seats: cat.seats,
    fuelType: cat.fuel_type,
    transmission: cat.transmission,
    isActive: cat.is_active,
    sortOrder: cat.sort_order,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
    totalCount: countMap.get(cat.id)?.total || 0,
    availableCount: countMap.get(cat.id)?.available || 0,
  }));
}

/**
 * Get available categories for a location (customer-facing)
 */
export async function listAvailableCategories(locationId: string): Promise<FleetCategory[]> {
  if (!locationId) return [];

  // Use DB function for consistency
  const { data, error } = await supabase.rpc("get_available_categories", {
    p_location_id: locationId,
  });

  if (error) {
    console.error("Error fetching available categories:", error);
    // Fallback
    const { data: cats } = await supabase
      .from("vehicle_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    const { data: units } = await supabase
      .from("vehicle_units")
      .select("category_id")
      .eq("location_id", locationId)
      .eq("status", "available");

    const availableSet = new Set(units?.map((u) => u.category_id) || []);

    return (cats || [])
      .filter((c) => availableSet.has(c.id))
      .map((c): FleetCategory => ({
        id: c.id,
        name: c.name,
        description: c.description,
        imageUrl: c.image_url,
        dailyRate: Number(c.daily_rate),
        seats: c.seats,
        fuelType: c.fuel_type,
        transmission: c.transmission,
        isActive: c.is_active,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        availableCount: units?.filter((u) => u.category_id === c.id).length || 0,
      }));
  }

  return (data || []).map((c: any): FleetCategory => ({
    id: c.id,
    name: c.name,
    description: c.description,
    imageUrl: c.image_url,
    dailyRate: Number(c.daily_rate),
    seats: c.seats,
    fuelType: c.fuel_type,
    transmission: c.transmission,
    isActive: true,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    availableCount: Number(c.available_count) || 0,
  }));
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<FleetCategory | null> {
  const { data, error } = await supabase
    .from("vehicle_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Get unit counts
  const { data: units } = await supabase
    .from("vehicle_units")
    .select("status")
    .eq("category_id", id);

  const total = units?.length || 0;
  const available = units?.filter((u) => u.status === "available").length || 0;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
    dailyRate: Number(data.daily_rate),
    seats: data.seats,
    fuelType: data.fuel_type,
    transmission: data.transmission,
    isActive: data.is_active,
    sortOrder: data.sort_order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    totalCount: total,
    availableCount: available,
  };
}

/**
 * List units for a category
 */
export async function listCategoryUnits(categoryId: string): Promise<VehicleUnit[]> {
  const { data, error } = await supabase
    .from("vehicle_units")
    .select(`
      *,
      location:locations(name)
    `)
    .eq("category_id", categoryId)
    .order("status")
    .order("vin");

  if (error) throw error;

  return (data || []).map((u): VehicleUnit => ({
    id: u.id,
    vin: u.vin,
    licensePlate: u.license_plate,
    year: null,
    make: null,
    model: null,
    status: u.status as VehicleUnit["status"],
    locationId: u.location_id,
    locationName: u.location?.name || null,
    categoryId: u.category_id,
    notes: u.notes,
    currentMileage: u.current_mileage,
    acquisitionCost: u.acquisition_cost ? Number(u.acquisition_cost) : null,
    acquisitionDate: u.acquisition_date,
    tankCapacityLiters: u.tank_capacity_liters,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));
}

/**
 * Get unit by ID with category info
 */
export async function getUnitById(id: string): Promise<VehicleUnit | null> {
  const { data, error } = await supabase
    .from("vehicle_units")
    .select(`
      *,
      location:locations(name),
      category:vehicle_categories(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    vin: data.vin,
    licensePlate: data.license_plate,
    year: null,
    make: null,
    model: null,
    status: data.status as VehicleUnit["status"],
    locationId: data.location_id,
    locationName: data.location?.name || null,
    categoryId: data.category_id,
    categoryName: data.category?.name || null,
    notes: data.notes,
    currentMileage: data.current_mileage,
    acquisitionCost: data.acquisition_cost ? Number(data.acquisition_cost) : null,
    acquisitionDate: data.acquisition_date,
    tankCapacityLiters: data.tank_capacity_liters,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * List all units (admin fleet view)
 */
export async function listAllUnits(filters?: {
  status?: string;
  locationId?: string;
  categoryId?: string;
  search?: string;
}): Promise<VehicleUnit[]> {
  let query = supabase
    .from("vehicle_units")
    .select(`
      *,
      location:locations(name),
      category:vehicle_categories(name)
    `)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters?.search) {
    query = query.or(
      `vin.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((u): VehicleUnit => ({
    id: u.id,
    vin: u.vin,
    licensePlate: u.license_plate,
    year: null,
    make: null,
    model: null,
    status: u.status as VehicleUnit["status"],
    locationId: u.location_id,
    locationName: u.location?.name || null,
    categoryId: u.category_id,
    categoryName: u.category?.name || null,
    notes: u.notes,
    currentMileage: u.current_mileage,
    acquisitionCost: u.acquisition_cost ? Number(u.acquisition_cost) : null,
    acquisitionDate: u.acquisition_date,
    tankCapacityLiters: u.tank_capacity_liters,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  }));
}
