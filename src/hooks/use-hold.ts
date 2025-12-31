import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const HOLD_DURATION_MINUTES = 15;

export interface CreateHoldParams {
  vehicleId: string;
  startAt: Date;
  endAt: Date;
}

export interface Hold {
  id: string;
  vehicleId: string;
  userId: string;
  startAt: Date;
  endAt: Date;
  expiresAt: Date;
  status: "active" | "expired" | "converted";
}

/**
 * Creates a reservation hold for a vehicle
 */
export function useCreateHold() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, startAt, endAt }: CreateHoldParams) => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("Please sign in to reserve a vehicle");
      }

      // Check if vehicle is still available (race condition guard)
      const { data: existingHolds } = await supabase
        .from("reservation_holds")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .or(
          `and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`
        )
        .limit(1);

      if (existingHolds && existingHolds.length > 0) {
        throw new Error("This vehicle is currently being reserved by another customer");
      }

      // Check for overlapping bookings
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .in("status", ["pending", "confirmed", "active"])
        .or(
          `and(start_at.lte.${endAt.toISOString()},end_at.gte.${startAt.toISOString()})`
        )
        .limit(1);

      if (existingBookings && existingBookings.length > 0) {
        throw new Error("This vehicle is already booked for the selected dates");
      }

      // Create the hold
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + HOLD_DURATION_MINUTES);

      const { data: hold, error } = await supabase
        .from("reservation_holds")
        .insert({
          vehicle_id: vehicleId,
          user_id: user.id,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating hold:", error);
        throw new Error("Failed to reserve vehicle. Please try again.");
      }

      return hold;
    },
    onSuccess: (hold, variables) => {
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-availability"] });
      
      // Navigate to checkout with hold ID
      const params = new URLSearchParams();
      params.set("holdId", hold.id);
      params.set("vehicleId", variables.vehicleId);
      params.set("startAt", variables.startAt.toISOString());
      params.set("endAt", variables.endAt.toISOString());
      
      navigate(`/checkout?${params.toString()}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Reservation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Fetches a hold by ID
 */
export function useHold(holdId: string | null) {
  return useQuery({
    queryKey: ["hold", holdId],
    queryFn: async () => {
      if (!holdId) return null;

      const { data, error } = await supabase
        .from("reservation_holds")
        .select("*")
        .eq("id", holdId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching hold:", error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        vehicleId: data.vehicle_id,
        userId: data.user_id,
        startAt: new Date(data.start_at),
        endAt: new Date(data.end_at),
        expiresAt: new Date(data.expires_at),
        status: data.status,
      } as Hold;
    },
    enabled: !!holdId,
    refetchInterval: 5000, // Refresh every 5 seconds to keep timer accurate
  });
}

/**
 * Expires a hold (mark as expired)
 */
export function useExpireHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holdId: string) => {
      const { error } = await supabase
        .from("reservation_holds")
        .update({ status: "expired" })
        .eq("id", holdId);

      if (error) {
        console.error("Error expiring hold:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hold"] });
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
    },
  });
}
