/**
 * Location guard for Edge Functions
 *
 * Edge functions run with the service role, which bypasses RLS. Any staff-invoked
 * writer must therefore check branch scope explicitly.
 *
 * Role model (exactly two staff roles):
 *   - super_admin : every branch, may act anywhere
 *   - manager     : locked to their `staff_assignments.location_id`
 *
 * Usage:
 *   const scope = await getStaffScope(user.userId);
 *   requireStaffScope(scope);                        // must be active staff
 *   await requireBookingLocationAccess(scope, bookingId);
 */

import { getAdminClient, AuthError } from "./auth.ts";

/**
 * Extends AuthError so every existing `catch (err) { authErrorResponse(err, cors) }`
 * block in the edge functions returns the right HTTP status without modification.
 */
export class LocationAccessError extends AuthError {
  constructor(message: string, status = 403) {
    super(message, status);
  }
}

export interface StaffScope {
  userId: string;
  isSuperAdmin: boolean;
  /** Branch the manager is locked to; null for super admins. */
  locationId: string | null;
  isActive: boolean;
  role: string | null;
}

const SUPER_ADMIN_ROLES = ["super_admin", "admin"];
const STAFF_ROLES = [
  "super_admin",
  "manager",
  // legacy roles retained until every account is migrated
  "admin",
  "staff",
  "cleaner",
  "finance",
  "support",
];

/** Resolve the acting user's role + branch assignment. */
export async function getStaffScope(userId: string): Promise<StaffScope> {
  const supabase = getAdminClient();

  const [{ data: roles }, { data: assignment }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("staff_assignments")
      .select("location_id, is_active")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const roleList = (roles || []).map((r: { role: string }) => r.role);
  const isSuperAdmin = roleList.some((r) => SUPER_ADMIN_ROLES.includes(r));
  const staffRole = roleList.find((r) => STAFF_ROLES.includes(r)) ?? null;

  return {
    userId,
    isSuperAdmin,
    locationId: isSuperAdmin ? null : assignment?.location_id ?? null,
    // Super admins are always considered active; managers need an active assignment
    isActive: isSuperAdmin ? true : assignment?.is_active === true,
    role: staffRole,
  };
}

/** Throw unless the caller is active staff (super admin or assigned manager). */
export function requireStaffScope(scope: StaffScope): void {
  if (!scope.role) {
    throw new LocationAccessError("Staff access required", 403);
  }
  if (!scope.isActive) {
    throw new LocationAccessError("Your staff account is inactive", 403);
  }
  if (!scope.isSuperAdmin && !scope.locationId) {
    throw new LocationAccessError(
      "No branch is assigned to your account. Contact a super admin.",
      403,
    );
  }
}

/** Throw unless the caller may act on the given branch. */
export function requireLocationAccess(scope: StaffScope, locationId: string | null): void {
  if (scope.isSuperAdmin) return;
  if (!locationId) {
    throw new LocationAccessError("This record has no branch and cannot be modified", 403);
  }
  if (locationId !== scope.locationId) {
    throw new LocationAccessError("This record belongs to another branch", 403);
  }
}

/** Throw unless super admin. Use for company-wide or configuration actions. */
export function requireSuperAdmin(scope: StaffScope): void {
  if (!scope.isSuperAdmin) {
    throw new LocationAccessError("Super admin access required", 403);
  }
}

/**
 * Branch check for a booking.
 *
 * Write access follows the pickup branch (`location_id`). The drop-off branch of a
 * one-way rental gets read-only visibility, so it is deliberately NOT accepted here.
 */
export async function requireBookingLocationAccess(
  scope: StaffScope,
  bookingId: string,
): Promise<{ locationId: string | null; returnLocationId: string | null }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("location_id, return_location_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) {
    throw new LocationAccessError("Booking not found", 404);
  }

  requireLocationAccess(scope, data.location_id);
  return { locationId: data.location_id, returnLocationId: data.return_location_id };
}

/** Convenience wrapper: resolve scope, assert active staff, assert booking branch. */
export async function guardBookingWrite(
  userId: string,
  bookingId: string,
): Promise<StaffScope> {
  const scope = await getStaffScope(userId);
  requireStaffScope(scope);
  await requireBookingLocationAccess(scope, bookingId);
  return scope;
}

/** Map a guard failure to an HTTP response. Returns null for other errors. */
export function locationErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
): Response | null {
  if (err instanceof LocationAccessError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

/**
 * One-line drop-in for staff edge functions:
 *   await requireBookingLocationOrThrow(userId, bookingId);
 * Throws an AuthError subclass (403/404) handled by authErrorResponse().
 */
export async function requireBookingLocationOrThrow(
  userId: string,
  bookingId: string,
): Promise<StaffScope> {
  return await guardBookingWrite(userId, bookingId);
}

/**
 * Branch check for a bare location id (walk-in creation, fleet, reports).
 */
export async function requireLocationOrThrow(
  userId: string,
  locationId: string | null,
): Promise<StaffScope> {
  const scope = await getStaffScope(userId);
  requireStaffScope(scope);
  requireLocationAccess(scope, locationId);
  return scope;
}
