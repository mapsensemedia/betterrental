import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  checkDispatchReadiness, 
  getDispatchBlockerMessage,
  type BookingForDispatchCheck 
} from "@/lib/dispatch-readiness";

interface AssignDriverParams {
  bookingId: string;
  driverId: string;
  bypassChecks?: boolean; // For admin override with explicit acknowledgment
}

/**
 * Assign a driver to a delivery booking
 * Validates dispatch readiness before allowing assignment
 */
export function useAssignDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, driverId, bypassChecks }: AssignDriverParams) => {
      // Fetch booking details for readiness check
      const { data: booking, error: bookingFetchError } = await supabase
        .from("bookings")
        .select("id, deposit_status, assigned_unit_id, stripe_deposit_pi_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (bookingFetchError || !booking) {
        throw new Error("Booking not found");
      }

      // Fetch prep photo count
      const { count: photoCount } = await supabase
        .from("condition_photos")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .eq("phase", "pre_delivery");

      const bookingData: BookingForDispatchCheck = {
        id: booking.id,
        depositStatus: booking.deposit_status,
        assignedUnitId: booking.assigned_unit_id,
        stripeDepositPiId: booking.stripe_deposit_pi_id,
      };

      const readiness = checkDispatchReadiness(bookingData, photoCount || 0);

      // Block dispatch if not ready (unless explicitly bypassed)
      if (!readiness.isReady && !bypassChecks) {
        throw new Error(getDispatchBlockerMessage(readiness));
      }

      // Update booking with assigned driver
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ 
          assigned_driver_id: driverId,
          updated_at: new Date().toISOString()
        })
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      // Log if bypass was used
      if (!readiness.isReady && bypassChecks) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("audit_logs").insert({
          action: "dispatch_bypass",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: user?.id,
          new_data: {
            driverId,
            bypassedRequirements: readiness.missingRequirements,
          },
        });
        
        // Create admin alert for bypass
        await supabase.from("admin_alerts").insert({
          alert_type: "verification_pending" as const,
          title: "Dispatch bypass used",
          message: `Booking dispatched without: ${readiness.missingRequirements.join(", ")}`,
          booking_id: bookingId,
        });
      }

      return { bookingId, driverId, readiness };
    },
    onSuccess: (data) => {
      // Invalidate all delivery-related queries
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["unassigned-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["all-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-readiness"] });
      
      if (data.readiness.isReady) {
        toast.success("Driver assigned successfully");
      } else {
        toast.warning("Driver assigned with bypass - dispatch prerequisites were not met");
      }
    },
    onError: (error) => {
      console.error("Failed to assign driver:", error);
      toast.error(error.message || "Failed to assign driver");
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
