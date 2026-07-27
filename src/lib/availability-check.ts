/**
 * Availability — single source of truth.
 *
 * All availability answers come from the backend RPCs
 * `get_category_availability` / `check_category_availability`.
 * Never compute availability from client-side table reads: guests cannot read
 * `vehicle_units` / `bookings` under RLS and would see everything as available.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CategoryAvailability {
  available: boolean;
  availableCount: number;
  totalCount: number;
}

/** Friendly, customer-facing messages for availability failures. */
export const AVAILABILITY_MESSAGES = {
  CATEGORY_UNAVAILABLE:
    "Sorry — this vehicle class just sold out for your dates at this location. Please pick another class or adjust your dates.",
  NO_LOCATION:
    "Please choose a pickup location and dates so we can show what's actually available.",
  CHECK_FAILED:
    "We couldn't confirm availability just now. Please try again in a moment.",
} as const;

export function mapAvailabilityError(code?: string | null, fallback?: string) {
  if (code && code in AVAILABILITY_MESSAGES) {
    return AVAILABILITY_MESSAGES[code as keyof typeof AVAILABILITY_MESSAGES];
  }
  return fallback || AVAILABILITY_MESSAGES.CHECK_FAILED;
}

/**
 * Authoritative check for one category over an exact rental window.
 * Throws on RPC failure — callers must NOT treat a failure as "available".
 */
export async function checkCategoryAvailability(params: {
  categoryId: string;
  locationId: string;
  startAt: Date | string;
  endAt: Date | string;
  excludeBookingId?: string | null;
  excludeHoldId?: string | null;
}): Promise<CategoryAvailability> {
  const startAt =
    params.startAt instanceof Date ? params.startAt.toISOString() : params.startAt;
  const endAt =
    params.endAt instanceof Date ? params.endAt.toISOString() : params.endAt;

  const { data, error } = await supabase.rpc("check_category_availability", {
    p_category_id: params.categoryId,
    p_location_id: params.locationId,
    p_start_at: startAt,
    p_end_at: endAt,
    p_exclude_hold: params.excludeHoldId ?? null,
    p_exclude_booking: params.excludeBookingId ?? null,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    available: Boolean(row?.available),
    availableCount: Number(row?.available_count ?? 0),
    totalCount: Number(row?.total_count ?? 0),
  };
}
