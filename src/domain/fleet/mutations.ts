/**
 * Fleet Domain - Mutation Functions
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateUnitInput,
  UpdateUnitInput,
  MoveUnitInput,
} from "./types";

/**
 * Create audit log entry
 */
async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  panelSource: "admin" | "ops" = "admin"
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert([{
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData as any,
    new_data: { ...newData, panel_source: panelSource } as any,
  }]);
}

/**
 * Create a new category
 */
export async function createCategory(input: CreateCategoryInput): Promise<string> {
  const { data, error } = await supabase
    .from("vehicle_categories")
    .insert({
      name: input.name,
      description: input.description || null,
      image_url: input.imageUrl || null,
      daily_rate: input.dailyRate,
      seats: input.seats || 5,
      fuel_type: input.fuelType || "Gas",
      transmission: input.transmission || "Automatic",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  await createAuditLog("category_created", "vehicle_category", data.id, null, input as unknown as Record<string, unknown>, "admin");

  return data.id;
}

/**
 * Update a category
 */
export async function updateCategory(input: UpdateCategoryInput): Promise<void> {
  const { id, ...updates } = input;

  // Get current state for audit
  const { data: current } = await supabase
    .from("vehicle_categories")
    .select("*")
    .eq("id", id)
    .single();

  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.dailyRate !== undefined) dbUpdates.daily_rate = updates.dailyRate;
  if (updates.seats !== undefined) dbUpdates.seats = updates.seats;
  if (updates.fuelType !== undefined) dbUpdates.fuel_type = updates.fuelType;
  if (updates.transmission !== undefined) dbUpdates.transmission = updates.transmission;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

  const { error } = await supabase
    .from("vehicle_categories")
    .update(dbUpdates)
    .eq("id", id);

  if (error) throw error;

  await createAuditLog(
    "category_updated",
    "vehicle_category",
    id,
    current as Record<string, unknown>,
    updates as Record<string, unknown>,
    "admin"
  );
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  // First unassign all VINs
  await supabase
    .from("vehicle_units")
    .update({ category_id: null })
    .eq("category_id", categoryId);

  const { error } = await supabase
    .from("vehicle_categories")
    .delete()
    .eq("id", categoryId);

  if (error) throw error;

  await createAuditLog("category_deleted", "vehicle_category", categoryId, null, null, "admin");
}

/**
 * Add a vehicle unit to category
 */
export async function createUnit(input: CreateUnitInput): Promise<string> {
  // Check for duplicate VIN
  const { data: existing } = await supabase
    .from("vehicle_units")
    .select("id")
    .eq("vin", input.vin.toUpperCase())
    .maybeSingle();

  if (existing) {
    throw new Error("A vehicle with this VIN already exists");
  }

  // Get category info
  const { data: category } = await supabase
    .from("vehicle_categories")
    .select("name, daily_rate")
    .eq("id", input.categoryId)
    .single();

  // Create legacy vehicle entry
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
    .select("id")
    .single();

  if (vehicleError) throw vehicleError;

  // Create vehicle unit
  const { data, error } = await supabase
    .from("vehicle_units")
    .insert({
      vehicle_id: vehicle.id,
      category_id: input.categoryId,
      vin: input.vin.toUpperCase(),
      license_plate: input.licensePlate.toUpperCase(),
      location_id: input.locationId,
      status: input.status || "available",
      tank_capacity_liters: input.tankCapacityLiters || null,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  await createAuditLog("unit_created", "vehicle_unit", data.id, null, input as unknown as Record<string, unknown>, "admin");

  return data.id;
}

/**
 * Update a vehicle unit
 */
export async function updateUnit(input: UpdateUnitInput): Promise<void> {
  const { id, ...updates } = input;

  // Get current state
  const { data: current } = await supabase
    .from("vehicle_units")
    .select("*")
    .eq("id", id)
    .single();

  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.locationId !== undefined) dbUpdates.location_id = updates.locationId;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.currentMileage !== undefined) dbUpdates.current_mileage = updates.currentMileage;

  const { error } = await supabase
    .from("vehicle_units")
    .update(dbUpdates)
    .eq("id", id);

  if (error) throw error;

  await createAuditLog(
    "unit_updated",
    "vehicle_unit",
    id,
    { status: current?.status, location_id: current?.location_id },
    updates as Record<string, unknown>,
    "ops"
  );
}

/**
 * Move vehicle unit to another location (admin only via edge function)
 */
export async function moveUnit(input: MoveUnitInput): Promise<void> {
  const { unitId, targetLocationId, reason, panelSource } = input;

  // Get current state
  const { data: current } = await supabase
    .from("vehicle_units")
    .select("location_id")
    .eq("id", unitId)
    .single();

  // Call edge function for secure move
  const { error } = await supabase.functions.invoke("move-vehicle-unit", {
    body: {
      unitId,
      targetLocationId,
      reason,
      panelSource,
    },
  });

  if (error) {
    // Fallback to direct update if edge function doesn't exist
    const { error: updateError } = await supabase
      .from("vehicle_units")
      .update({
        location_id: targetLocationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", unitId);

    if (updateError) throw updateError;
  }

  await createAuditLog(
    "unit_moved",
    "vehicle_unit",
    unitId,
    { location_id: current?.location_id },
    { location_id: targetLocationId, reason },
    panelSource
  );
}

/**
 * Delete a vehicle unit
 */
export async function deleteUnit(unitId: string): Promise<void> {
  const { error } = await supabase.from("vehicle_units").delete().eq("id", unitId);

  if (error) throw error;

  await createAuditLog("unit_deleted", "vehicle_unit", unitId, null, null, "admin");
}
