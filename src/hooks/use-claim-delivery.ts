import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useClaimDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke("claim-delivery", {
        body: { bookingId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to claim delivery");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
      toast.success("Delivery claimed");
    },
    onError: (error) => {
      console.error("Failed to claim delivery:", error);
      toast.error("Failed to claim delivery");
    },
  });
}
