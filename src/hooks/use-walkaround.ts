import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScratchDent {
  id: string;
  location: string;
  description: string;
  severity: "minor" | "moderate" | "major";
}

export interface WalkaroundInspection {
  id: string;
  booking_id: string;
  exterior_notes: string | null;
  scratches_dents: ScratchDent[];
  interior_notes: string | null;
  interior_condition: "excellent" | "good" | "acceptable" | "needs_attention" | null;
  odometer_reading: number | null;
  fuel_level: number | null;
  conducted_by: string;
  conducted_at: string;
  customer_acknowledged: boolean;
  customer_acknowledged_at: string | null;
  customer_signature: string | null;
  inspection_complete: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch walkaround for a booking
export function useWalkaroundInspection(bookingId: string | null) {
  return useQuery({
    queryKey: ["walkaround-inspection", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from("walkaround_inspections")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const scratches = Array.isArray(data.scratches_dents) 
          ? (data.scratches_dents as unknown as ScratchDent[]) 
          : [];
        return {
          ...data,
          scratches_dents: scratches,
        } as WalkaroundInspection;
      }
      return null;
    },
    enabled: !!bookingId,
    staleTime: 15000, // 15 seconds - operational data tier
    gcTime: 60000,    // Keep cached for 1 minute
  });
}

export interface StartWalkaroundParams {
  bookingId: string;
  odometerReading?: number;
  fuelLevel?: number;
}

// Start a new walkaround inspection
export function useStartWalkaround() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, odometerReading, fuelLevel }: StartWalkaroundParams) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Check if one already exists
      const { data: existing } = await supabase
        .from("walkaround_inspections")
        .select("id")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (existing) {
        return { id: existing.id, alreadyExists: true };
      }

      const { data, error } = await supabase
        .from("walkaround_inspections")
        .insert({
          booking_id: bookingId,
          conducted_by: user.user.id,
          odometer_reading: odometerReading,
          fuel_level: fuelLevel,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        entity_type: "walkaround_inspection",
        entity_id: data.id,
        action: "walkaround_started",
        user_id: user.user.id,
        new_data: { booking_id: bookingId },
      });

      return { id: data.id, alreadyExists: false };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection", variables.bookingId] });
      if (!data.alreadyExists) {
        toast.success("Walkaround inspection started");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to start walkaround: ${error.message}`);
    },
  });
}

export interface UpdateWalkaroundParams {
  inspectionId: string;
  exteriorNotes?: string;
  scratchesDents?: ScratchDent[];
  interiorNotes?: string;
  interiorCondition?: "excellent" | "good" | "acceptable" | "needs_attention";
  odometerReading?: number;
  fuelLevel?: number;
}

// Update walkaround details
export function useUpdateWalkaround() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      exteriorNotes,
      scratchesDents,
      interiorNotes,
      interiorCondition,
      odometerReading,
      fuelLevel,
    }: UpdateWalkaroundParams) => {
      const updateData: Record<string, unknown> = {};
      if (exteriorNotes !== undefined) updateData.exterior_notes = exteriorNotes;
      if (scratchesDents !== undefined) updateData.scratches_dents = scratchesDents;
      if (interiorNotes !== undefined) updateData.interior_notes = interiorNotes;
      if (interiorCondition !== undefined) updateData.interior_condition = interiorCondition;
      if (odometerReading !== undefined) updateData.odometer_reading = odometerReading;
      if (fuelLevel !== undefined) updateData.fuel_level = fuelLevel;

      const { error } = await supabase
        .from("walkaround_inspections")
        .update(updateData)
        .eq("id", inspectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update walkaround: ${error.message}`);
    },
  });
}

// Customer acknowledges condition
export function useCustomerAcknowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      signature,
    }: {
      inspectionId: string;
      signature: string;
    }) => {
      const { error } = await supabase
        .from("walkaround_inspections")
        .update({
          customer_acknowledged: true,
          customer_acknowledged_at: new Date().toISOString(),
          customer_signature: signature,
        })
        .eq("id", inspectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"] });
      toast.success("Customer acknowledged vehicle condition");
    },
    onError: (error: Error) => {
      toast.error(`Failed to record acknowledgement: ${error.message}`);
    },
  });
}

// Complete the walkaround inspection (staff-only, no customer signature needed)
export function useCompleteWalkaround() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { data: user } = await supabase.auth.getUser();

      // Get the inspection
      const { data: inspection, error: fetchError } = await supabase
        .from("walkaround_inspections")
        .select("booking_id")
        .eq("id", inspectionId)
        .single();

      if (fetchError) throw fetchError;

      // Staff-only completion - mark as complete without requiring customer acknowledgement
      const { error } = await supabase
        .from("walkaround_inspections")
        .update({
          inspection_complete: true,
          completed_at: new Date().toISOString(),
          // Mark as staff-verified (no customer signature needed)
          customer_acknowledged: true,
          customer_acknowledged_at: new Date().toISOString(),
          customer_signature: "Staff Verified (In-Person)",
        })
        .eq("id", inspectionId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        entity_type: "walkaround_inspection",
        entity_id: inspectionId,
        action: "walkaround_completed",
        user_id: user.user?.id,
        new_data: { booking_id: inspection.booking_id, staff_verified: true },
      });

      // Send notification to customer
      if (inspection.booking_id) {
        try {
          await supabase.functions.invoke("send-booking-notification", {
            body: { bookingId: inspection.booking_id, stage: "walkaround_complete" },
          });
        } catch (e) {
          console.error("Failed to send walkaround notification:", e);
        }
      }

      return { bookingId: inspection.booking_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Walkaround completed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Admin override - complete walkaround without customer acknowledgement
export function useAdminCompleteWalkaround() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { data: user } = await supabase.auth.getUser();

      // Get the inspection
      const { data: inspection, error: fetchError } = await supabase
        .from("walkaround_inspections")
        .select("booking_id")
        .eq("id", inspectionId)
        .single();

      if (fetchError) throw fetchError;

      // Update inspection - mark as complete with admin override
      const { error } = await supabase
        .from("walkaround_inspections")
        .update({
          inspection_complete: true,
          completed_at: new Date().toISOString(),
          customer_acknowledged: true,
          customer_acknowledged_at: new Date().toISOString(),
          customer_signature: "Admin Override",
        })
        .eq("id", inspectionId);

      if (error) throw error;

      // Log to audit with admin override note
      await supabase.from("audit_logs").insert({
        entity_type: "walkaround_inspection",
        entity_id: inspectionId,
        action: "walkaround_admin_override",
        user_id: user.user?.id,
        new_data: { booking_id: inspection.booking_id, admin_override: true },
      });

      return { bookingId: inspection.booking_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Walkaround completed (admin override)");
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete walkaround: ${error.message}`);
    },
  });
}

// Re-open a completed walkaround for editing
export function useReopenWalkaround() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      const { data: user } = await supabase.auth.getUser();

      // Get the inspection for audit log
      const { data: inspection, error: fetchError } = await supabase
        .from("walkaround_inspections")
        .select("booking_id")
        .eq("id", inspectionId)
        .single();

      if (fetchError) throw fetchError;

      // Re-open the inspection
      const { error } = await supabase
        .from("walkaround_inspections")
        .update({
          inspection_complete: false,
          completed_at: null,
        })
        .eq("id", inspectionId);

      if (error) throw error;

      // Log to audit
      await supabase.from("audit_logs").insert({
        entity_type: "walkaround_inspection",
        entity_id: inspectionId,
        action: "walkaround_reopened",
        user_id: user.user?.id,
        new_data: { booking_id: inspection.booking_id, reopened_for_edit: true },
      });

      return { bookingId: inspection.booking_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walkaround-inspection"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      toast.success("Walkaround reopened for editing");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reopen walkaround: ${error.message}`);
    },
  });
}
