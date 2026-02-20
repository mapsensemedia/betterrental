/**
 * Canonical rental locations - single source of truth
 * Used across customer UI and admin operations
 */
export interface RentalLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  /** Toggle to true to re-enable a location for customers */
  isActive: boolean;
}

export const RENTAL_LOCATIONS: RentalLocation[] = [
  {
    id: "a1b2c3d4-1111-4000-8000-000000000001",
    name: "Surrey Newton",
    address: "6786 King George Blvd, Surrey, BC V3W 4Z5",
    city: "Surrey",
    lat: 49.1280,
    lng: -122.8465,
    isActive: true, // Toggle to true to re-enable this location
  },
  {
    id: "a1b2c3d4-2222-4000-8000-000000000002",
    name: "Langley Centre",
    address: "5933 200 St, Langley, BC V3A 1N2",
    city: "Langley",
    lat: 49.1042,
    lng: -122.6604,
    isActive: false, // Toggle to true to re-enable this location
  },
  {
    id: "a1b2c3d4-3333-4000-8000-000000000003",
    name: "Abbotsford Centre",
    address: "32835 South Fraser Way, Abbotsford, BC",
    city: "Abbotsford",
    lat: 49.0504,
    lng: -122.3045,
    isActive: false, // Toggle to true to re-enable this location
  },
];

/**
 * Active (customer-visible) locations only.
 * Toggle isActive on any entry above to re-enable it.
 */
export const ACTIVE_RENTAL_LOCATIONS = RENTAL_LOCATIONS.filter((loc) => loc.isActive);

/**
 * Get a location by ID
 */
export function getLocationById(id: string): RentalLocation | undefined {
  return RENTAL_LOCATIONS.find((loc) => loc.id === id);
}

/**
 * Calculate haversine distance between two coordinates in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the closest rental location to given coordinates
 */
export function findClosestLocation(
  lat: number,
  lng: number
): { location: RentalLocation; distanceKm: number } {
  // Only consider active (customer-visible) locations as delivery origins
  const candidates = ACTIVE_RENTAL_LOCATIONS.length > 0 ? ACTIVE_RENTAL_LOCATIONS : RENTAL_LOCATIONS;
  let closest = candidates[0];
  let minDistance = haversineDistance(lat, lng, closest.lat, closest.lng);

  for (const loc of candidates.slice(1)) {
    const dist = haversineDistance(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = loc;
    }
  }

  return { location: closest, distanceKm: minDistance };
}

/**
 * Delivery fee calculation based on distance
 * Pricing tiers:
 * - Free for ≤10km
 * - $49 for 10-50km
 * - Not available beyond 50km
 */
export interface DeliveryFeeResult {
  fee: number;
  eligible: boolean;
  exceeds50km: boolean;
  bracket: string;
}

export function calculateDeliveryFee(distanceKm: number): DeliveryFeeResult {
  if (distanceKm <= 10) {
    return { fee: 0, eligible: true, exceeds50km: false, bracket: "≤10km (Free)" };
  }
  if (distanceKm <= 50) {
    return { fee: 49, eligible: true, exceeds50km: false, bracket: "10-50km ($49)" };
  }
  return { fee: 0, eligible: false, exceeds50km: true, bracket: "50km+ (Not available)" };
}
