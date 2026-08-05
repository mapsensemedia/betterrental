import { useQuery } from "@tanstack/react-query";
import { fetchPickupProgress, type PickupProgress } from "@/lib/pickup-progress";

/**
 * Batch progress lookup for a set of pickup bookings.
 * Keyed on the sorted id list so it refetches when the pickup list changes.
 */
export function usePickupProgress(bookingIds: string[]) {
  const key = [...bookingIds].sort().join(",");

  return useQuery<Map<string, PickupProgress>>({
    queryKey: ["pickup-progress", key],
    queryFn: () => fetchPickupProgress(bookingIds),
    enabled: bookingIds.length > 0,
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });
}
