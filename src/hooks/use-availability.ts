import { useQuery } from "@tanstack/react-query";
import {
  getAvailableVehicles,
  getVehiclesByLocation,
  isVehicleAvailable,
  type AvailabilityQuery,
  type AvailableVehicle,
} from "@/lib/availability";

export function useAvailableVehicles(query: AvailabilityQuery | null) {
  return useQuery<AvailableVehicle[]>({
    queryKey: ["available-vehicles", query],
    queryFn: () => (query ? getAvailableVehicles(query) : Promise.resolve([])),
    enabled: !!query,
    staleTime: 30000, // 30 seconds
  });
}

export function useVehiclesByLocation(locationId: string | null) {
  return useQuery<AvailableVehicle[]>({
    queryKey: ["location-vehicles", locationId],
    queryFn: () =>
      locationId ? getVehiclesByLocation(locationId) : Promise.resolve([]),
    enabled: !!locationId,
    staleTime: 60000, // 1 minute
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
    staleTime: 15000, // 15 seconds
  });
}
