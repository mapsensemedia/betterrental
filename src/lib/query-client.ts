/**
 * Optimized QueryClient configuration for better performance
 * 
 * PR7: Performance optimization - enhanced caching and deduplication
 */
import { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Query key prefixes for different data freshness requirements
 */
export const QUERY_STALE_TIMES = {
  // Real-time data - keep fresh
  realtime: 5 * 1000,           // 5 seconds
  
  // Frequently changing data
  bookings: 30 * 1000,          // 30 seconds
  availability: 15 * 1000,      // 15 seconds
  
  // Moderately static data
  categories: 60 * 1000,        // 1 minute
  locations: 5 * 60 * 1000,     // 5 minutes
  addOns: 5 * 60 * 1000,        // 5 minutes
  
  // Rarely changing data
  static: 30 * 60 * 1000,       // 30 minutes
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time for general queries
      staleTime: 30 * 1000, // 30 seconds
      
      // Keep cached data for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests once
      retry: 1,
      retryDelay: 1000,
      
      // Don't refetch on window focus (realtime handles this for admin)
      refetchOnWindowFocus: false,
      
      // Enable structural sharing for better performance
      structuralSharing: true,
      
      // Reduce refetch interval for background updates
      refetchInterval: false,
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
export function prefetchBookingData(client: QueryClient, bookingId: string) {
  client.prefetchQuery({
    queryKey: ["booking", bookingId],
    staleTime: QUERY_STALE_TIMES.bookings,
  });
}

/**
 * Prefetch category data for faster browsing
 */
export function prefetchCategoryData(client: QueryClient) {
  client.prefetchQuery({
    queryKey: ["browse-categories"],
    staleTime: QUERY_STALE_TIMES.categories,
  });
}

/**
 * Invalidate booking-related queries after mutations
 */
export function invalidateBookingQueries(client: QueryClient, bookingId?: string) {
  const keys: QueryKey[] = [
    ["bookings"],
    ["active-rentals"],
    ["admin-bookings"],
  ];
  
  if (bookingId) {
    keys.push(["booking", bookingId]);
  }
  
  keys.forEach(key => client.invalidateQueries({ queryKey: key }));
}

/**
 * Invalidate vehicle/category queries after fleet changes
 */
export function invalidateFleetQueries(client: QueryClient) {
  client.invalidateQueries({ queryKey: ["browse-categories"] });
  client.invalidateQueries({ queryKey: ["fleet-categories"] });
  client.invalidateQueries({ queryKey: ["vehicle-categories"] });
  client.invalidateQueries({ queryKey: ["vehicle-units"] });
}
