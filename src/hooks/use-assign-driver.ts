import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignDriverParams {
  bookingId: string;
  driverId: string;
}

/**
 * Assign a driver to a delivery booking
 */
export function useAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, driverId }: AssignDriverParams) => {
      // Update booking with assigned driver
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ 
          assigned_driver_id: driverId,
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      return { bookingId, driverId };
    },
    onSuccess: () => {
      // Invalidate all delivery-related queries
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
      toast.success("Driver assigned successfully");
    },
    onError: (error) => {
      console.error("Failed to assign driver:", error);
      toast.error("Failed to assign driver");
    },
  });
}

/**
 * Unassign a driver from a delivery booking
 */
export function useUnassignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bookings")
        .update({ 
          assigned_driver_id: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (error) throw error;
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
      toast.success("Driver unassigned");
    },
    onError: (error) => {
      console.error("Failed to unassign driver:", error);
      toast.error("Failed to unassign driver");
    },
  });
}
