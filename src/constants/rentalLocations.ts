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
}

export const RENTAL_LOCATIONS: RentalLocation[] = [
  {
    id: "surrey",
    name: "Surrey Centre",
    address: "6734 King George Blvd, Surrey, BC",
    city: "Surrey",
    lat: 49.125002,
    lng: -122.845219,
  },
  {
    id: "langley",
    name: "Langley Centre",
    address: "5933 200 St, Langley, BC V3A 1N2",
    city: "Langley",
    lat: 49.102,
    lng: -122.659,
  },
  {
    id: "abbotsford",
    name: "Abbotsford Centre",
    address: "32835 South Fraser Way, Abbotsford, BC",
    city: "Abbotsford",
    lat: 49.052,
    lng: -122.287,
  },
];

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
  let closest = RENTAL_LOCATIONS[0];
  let minDistance = haversineDistance(lat, lng, closest.lat, closest.lng);

  for (const loc of RENTAL_LOCATIONS.slice(1)) {
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
 */
export interface DeliveryFeeResult {
  fee: number;
  eligible: boolean;
  exceeds50km: boolean;
  bracket: string;
}

export function calculateDeliveryFee(distanceKm: number): DeliveryFeeResult {
  if (distanceKm <= 5) {
    return { fee: 0, eligible: true, exceeds50km: false, bracket: "0-5km (Free)" };
  }
  if (distanceKm <= 20) {
    return { fee: 29, eligible: true, exceeds50km: false, bracket: "5-20km ($29)" };
  }
  if (distanceKm <= 30) {
    return { fee: 49, eligible: true, exceeds50km: false, bracket: "20-30km ($49)" };
  }
  if (distanceKm <= 50) {
    return { fee: 99, eligible: true, exceeds50km: false, bracket: "30-50km ($99)" };
  }
  return { fee: 0, eligible: false, exceeds50km: true, bracket: "50km+ (Not available)" };
}
