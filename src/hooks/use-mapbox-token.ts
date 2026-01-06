/**
 * Hook to fetch Mapbox token from edge function
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMapboxToken() {
  return useQuery({
    queryKey: ["mapbox-token"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token");
      
      if (error) {
        console.error("Failed to fetch Mapbox token:", error);
        throw new Error("Failed to fetch Mapbox token");
      }
      
      return data.token as string;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 2,
  });
}
