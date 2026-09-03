/**
 * Branch resolution for tables that have no `location_id` of their own.
 *
 * Incidents and support tickets are attributed to a branch through:
 *   1. the linked booking's `location_id`, else
 *   2. the vehicle unit's branch (`vehicle_units.location_id`, falling back to
 *      `vehicles.location_id`).
 *
 * Tickets that resolve to no branch are "unassigned branch" and are only shown
 * to Super Admins, or to the manager who created / is assigned to them.
 */
import { supabase } from "@/integrations/supabase/client";
import { unitBranchId } from "./location-scope";

/** unit id -> branch id (null when the unit has no branch). */
export async function fetchUnitLocationMap(): Promise<Map<string, string | null>> {
  const { data } = await supabase
    .from("vehicle_units")
    .select("id, location_id, vehicle:vehicles(location_id)");

  return new Map((data || []).map((u: any) => [u.id as string, unitBranchId(u)]));
}

/** booking id -> branch id. */
export async function fetchBookingLocationMap(
  bookingIds: string[]
): Promise<Map<string, string | null>> {
  const ids = [...new Set(bookingIds.filter(Boolean))];
  if (!ids.length) return new Map();

  const { data } = await supabase
    .from("bookings")
    .select("id, location_id")
    .in("id", ids);

  return new Map((data || []).map((b: any) => [b.id as string, b.location_id ?? null]));
}

/** Branch of an incident row using pre-fetched lookup maps. */
export function resolveIncidentBranch(
  incident: any,
  unitMap: Map<string, string | null>,
  bookingMap: Map<string, string | null>
): string | null {
  const fromBooking = incident?.booking_id ? bookingMap.get(incident.booking_id) ?? null : null;
  if (fromBooking) return fromBooking;
  if (incident?.vehicle_unit_id) return unitMap.get(incident.vehicle_unit_id) ?? null;
  return null;
}

/**
 * ticket id -> branch id (null = unattributable).
 * Resolves through booking, then the linked incident, then the linked damage report.
 */
export async function resolveTicketBranches(
  tickets: Array<{ id: string; booking_id?: string | null; incident_id?: string | null; damage_id?: string | null }>
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (!tickets.length) return result;

  const incidentIds = [...new Set(tickets.map((t) => t.incident_id).filter(Boolean))] as string[];
  const damageIds = [...new Set(tickets.map((t) => t.damage_id).filter(Boolean))] as string[];

  const [incidentsRes, damagesRes] = await Promise.all([
    incidentIds.length
      ? (supabase.from("incident_cases") as any)
          .select("id, booking_id, vehicle_unit_id")
          .in("id", incidentIds)
      : Promise.resolve({ data: [] }),
    damageIds.length
      ? supabase
          .from("damage_reports")
          .select("id, booking_id, vehicle_unit_id")
          .in("id", damageIds)
      : Promise.resolve({ data: [] }),
  ]);

  const incidents: any[] = incidentsRes.data || [];
  const damages: any[] = damagesRes.data || [];

  const bookingIds = [
    ...tickets.map((t) => t.booking_id),
    ...incidents.map((i) => i.booking_id),
    ...damages.map((d) => d.booking_id),
  ].filter(Boolean) as string[];

  const needsUnits = incidents.some((i) => i.vehicle_unit_id) || damages.some((d) => d.vehicle_unit_id);

  const [bookingMap, unitMap] = await Promise.all([
    fetchBookingLocationMap(bookingIds),
    needsUnits ? fetchUnitLocationMap() : Promise.resolve(new Map<string, string | null>()),
  ]);

  const incidentMap = new Map(incidents.map((i) => [i.id, i]));
  const damageMap = new Map(damages.map((d) => [d.id, d]));

  const branchOf = (row: any): string | null => {
    if (!row) return null;
    const fromBooking = row.booking_id ? bookingMap.get(row.booking_id) ?? null : null;
    if (fromBooking) return fromBooking;
    if (row.vehicle_unit_id) return unitMap.get(row.vehicle_unit_id) ?? null;
    return null;
  };

  tickets.forEach((t) => {
    const fromBooking = t.booking_id ? bookingMap.get(t.booking_id) ?? null : null;
    const branch =
      fromBooking ??
      branchOf(t.incident_id ? incidentMap.get(t.incident_id) : null) ??
      branchOf(t.damage_id ? damageMap.get(t.damage_id) : null);
    result.set(t.id, branch ?? null);
  });

  return result;
}

/**
 * Branch visibility rule for tickets.
 * `locationId === null` means all branches (Super Admin without a branch scope).
 */
export function isTicketVisibleForBranch(
  ticket: { id: string; created_by?: string | null; assigned_to?: string | null },
  branch: string | null,
  locationId: string | null,
  viewerUserId?: string | null
): boolean {
  if (!locationId) return true;
  if (branch === locationId) return true;
  if (branch === null) {
    // Unattributable tickets stay visible to the manager who owns them.
    return (
      (!!viewerUserId && ticket.created_by === viewerUserId) ||
      (!!viewerUserId && ticket.assigned_to === viewerUserId)
    );
  }
  return false;
}
