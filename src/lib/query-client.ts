/**
 * Optimized QueryClient configuration for better performance
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce stale time for better caching
      staleTime: 30 * 1000, // 30 seconds - data stays fresh longer
      
      // Keep cached data for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
      
      // Retry failed requests
      retry: 1,
      retryDelay: 1000,
      
      // Don't refetch on window focus for admin pages (realtime handles this)
      refetchOnWindowFocus: false,
      
      // Enable structural sharing for better performance
      structuralSharing: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * Prefetch booking data for faster navigation
 */
export function prefetchBookingData(queryClient: QueryClient, bookingId: string) {
  // This can be called before navigation to preload data
  queryClient.prefetchQuery({
    queryKey: ["booking", bookingId],
    staleTime: 60 * 1000,
  });
}
