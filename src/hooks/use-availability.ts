/**
 * Availability Hooks
 * 
 * PR7: Performance optimization - centralized stale times
 */
import { useQuery } from "@tanstack/react-query";
import {
  getAvailableVehicles,
  isVehicleAvailable,
  type AvailabilityQuery,
  type AvailableVehicle,
} from "@/lib/availability";
import { QUERY_STALE_TIMES } from "@/lib/query-client";

export function useAvailableVehicles(query: AvailabilityQuery | null) {
  return useQuery<AvailableVehicle[]>({
    queryKey: ["available-vehicles", query],
    queryFn: () => (query ? getAvailableVehicles(query) : Promise.resolve([])),
    enabled: !!query,
    staleTime: QUERY_STALE_TIMES.availability,
  });
}

export function useVehicleAvailability(
  vehicleId: string | null,
  startAt: Date | null,
  endAt: Date | null
) {
  return useQuery<boolean>({
    queryKey: ["vehicle-availability", vehicleId, startAt, endAt],
    queryFn: () =>
      vehicleId && startAt && endAt
        ? isVehicleAvailable(vehicleId, startAt, endAt)
        : Promise.resolve(false),
    enabled: !!(vehicleId && startAt && endAt),
    staleTime: QUERY_STALE_TIMES.availability,
  });
}
