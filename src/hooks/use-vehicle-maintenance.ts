import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetMaintenanceParams {
  vehicleId: string;
  reason: string;
  maintenanceUntil?: string;
}

export function useSetVehicleMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, reason, maintenanceUntil }: SetMaintenanceParams) => {
      const { error } = await supabase
        .from("vehicles")
        .update({
          status: "maintenance",
          is_available: false,
          maintenance_reason: reason,
          maintenance_until: maintenanceUntil || null,
        })
        .eq("id", vehicleId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle marked for maintenance");
    },
    onError: (error: Error) => {
      toast.error("Failed to update vehicle: " + error.message);
    },
  });
}

export function useClearVehicleMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from("vehicles")
        .update({
          status: "available",
          is_available: true,
          maintenance_reason: null,
          maintenance_until: null,
        })
        .eq("id", vehicleId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle maintenance cleared");
    },
    onError: (error: Error) => {
      toast.error("Failed to update vehicle: " + error.message);
    },
  });
}
