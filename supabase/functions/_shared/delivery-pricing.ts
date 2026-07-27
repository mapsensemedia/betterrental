// Server-side delivery fee rules.
// Source of truth mirrored from src/lib/rental-rules.ts (DELIVERY_TIERS /
// calculateDeliveryFee). Edge functions cannot import from src/, so the tier
// table is duplicated here — keep both in sync.

import { getAdminClient } from "./auth.ts";

export interface DeliveryTier {
  maxKm: number;
  fee: number;
}

export const DELIVERY_TIERS: DeliveryTier[] = [
  { maxKm: 10, fee: 0 },
  { maxKm: 50, fee: 49 },
];

export const MAX_DELIVERY_DISTANCE_KM = 50;

/** Great-circle distance in km. Always <= real driving distance. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function feeForDistanceKm(distanceKm: number): number {
  for (const tier of DELIVERY_TIERS) {
    if (distanceKm <= tier.maxKm) return tier.fee;
  }
  return DELIVERY_TIERS[DELIVERY_TIERS.length - 1].fee;
}

/**
 * Derive the delivery fee from the branch → delivery-point distance.
 * Returns null when the booking is not a delivery booking or coordinates are
 * missing (in which case the caller keeps whatever fee it already had).
 */
export async function deriveDeliveryFee(params: {
  locationId?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}): Promise<number | null> {
  const lat = Number(params.deliveryLat);
  const lng = Number(params.deliveryLng);
  if (!params.locationId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat === 0 && lng === 0) return null;

  try {
    const supabase = getAdminClient();
    const { data: loc } = await supabase
      .from("locations")
      .select("id, lat, lng")
      .eq("id", params.locationId)
      .maybeSingle();

    const bLat = Number(loc?.lat);
    const bLng = Number(loc?.lng);
    if (!Number.isFinite(bLat) || !Number.isFinite(bLng)) return null;

    const distanceKm = haversineKm(bLat, bLng, lat, lng);
    return feeForDistanceKm(distanceKm);
  } catch (err) {
    console.error("[delivery-pricing] derive failed:", err);
    return null;
  }
}
