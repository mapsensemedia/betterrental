/**
 * Shared branch-scope helpers.
 *
 * Several operational tables (vehicle_units, maintenance_logs, vehicle_expenses,
 * incident_cases, support_tickets_v2) carry no `location_id` of their own, so a
 * row's branch is derived from its vehicle unit (`vehicle_units.location_id`,
 * falling back to the category-level `vehicles.location_id`) or from the linked
 * booking (`bookings.location_id`).
 */

/** Branch of a vehicle unit row, unit column first, vehicle column as fallback. */
export function unitBranchId(unit: any): string | null {
  return unit?.location_id ?? unit?.vehicle?.location_id ?? unit?.vehicles?.location_id ?? null;
}

/** Keep only units belonging to `locationId`; `null` means all branches. */
export function filterUnitsByBranch<T>(units: T[], locationId: string | null | undefined): T[] {
  if (!locationId) return units;
  return (units || []).filter((u) => unitBranchId(u) === locationId);
}
