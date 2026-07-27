/**
 * Category capacity helper.
 *
 * C2C allows overbooking at the CATEGORY level: a customer may book any class
 * that is offered at the location, even when every unit of that class is
 * already assigned for the window. Staff assign a specific vehicle later.
 *
 * This module therefore reports capacity (and whether the reservation is an
 * overbooking) instead of blocking the booking. Only a category that is not
 * offered at the location at all (zero usable units) is refused.
 */
export interface AvailabilityGuardResult {
  available: boolean;
  availableCount: number;
  totalCount: number;
}

export interface CategoryCapacity extends AvailabilityGuardResult {
  /** Category exists and is offered at this location (has usable units). */
  offered: boolean;
  /** Booking would exceed free inventory for the window. */
  overbooked: boolean;
}

export async function getCategoryCapacity(
  supabaseAdmin: any,
  params: {
    categoryId: string;
    locationId: string;
    startAt: string;
    endAt: string;
    excludeBookingId?: string | null;
  },
): Promise<CategoryCapacity> {
  const { data, error } = await supabaseAdmin.rpc("check_category_availability", {
    p_category_id: params.categoryId,
    p_location_id: params.locationId,
    p_start_at: params.startAt,
    p_end_at: params.endAt,
    p_exclude_hold: null,
    p_exclude_booking: params.excludeBookingId ?? null,
  });

  if (error) {
    throw new Error(`AVAILABILITY_CHECK_FAILED: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const availableCount = Number(row?.available_count ?? 0);
  const totalCount = Number(row?.total_count ?? 0);

  return {
    available: Boolean(row?.available),
    availableCount,
    totalCount,
    offered: totalCount > 0,
    overbooked: availableCount <= 0,
  };
}

/** @deprecated kept for compatibility — capacity no longer blocks bookings. */
export async function assertCategoryAvailable(
  supabaseAdmin: any,
  params: {
    categoryId: string;
    locationId: string;
    startAt: string;
    endAt: string;
    excludeBookingId?: string | null;
  },
): Promise<AvailabilityGuardResult> {
  return await getCategoryCapacity(supabaseAdmin, params);
}

export const CATEGORY_NOT_OFFERED_MESSAGE =
  "This vehicle class isn't offered at the selected pickup location. Please choose another class or location.";

export const CATEGORY_UNAVAILABLE_MESSAGE = CATEGORY_NOT_OFFERED_MESSAGE;
