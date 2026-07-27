/**
 * Server-side availability guard — the authoritative gate before a booking row
 * is created. Uses the same DB function that customer search reads from, so
 * search results and booking creation can never disagree.
 */
export interface AvailabilityGuardResult {
  available: boolean;
  availableCount: number;
  totalCount: number;
}

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
  return {
    available: Boolean(row?.available),
    availableCount: Number(row?.available_count ?? 0),
    totalCount: Number(row?.total_count ?? 0),
  };
}

export const CATEGORY_UNAVAILABLE_MESSAGE =
  "Sorry — this vehicle class just sold out for your dates at this location. Please pick another class or adjust your dates.";
