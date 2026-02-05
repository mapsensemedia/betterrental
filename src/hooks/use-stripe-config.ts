/**
 * Hook for fetching Stripe configuration
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StripeConfig {
  publishableKey: string;
}

export function useStripeConfig() {
  return useQuery({
    queryKey: ["stripe-config"],
    queryFn: async (): Promise<StripeConfig> => {
      const { data, error } = await supabase.functions.invoke("get-stripe-config");
      
      if (error) throw new Error(error.message);
      if (!data?.publishableKey) throw new Error("No publishable key returned");
      
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1,
  });
}
