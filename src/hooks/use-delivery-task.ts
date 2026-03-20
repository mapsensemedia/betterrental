/**
 * Hook to manage delivery_tasks for "Bring Car to Me" flow.
 * Tracks the full lifecycle: Intake → Payment → ReadyLine → Dispatch → Execution → Activation
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeliveryTask {
  id: string;
  bookingId: string;
  status: string;
  assignedDriverId: string | null;

  // Ops pipeline
  intakeCompletedAt: string | null;
  intakeCompletedBy: string | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  readyLineCompletedAt: string | null;
  readyLineCompletedBy: string | null;
  dispatchedAt: string | null;
  dispatchedBy: string | null;
  dispatchWindowStart: string | null;
  dispatchWindowEnd: string | null;

  // Delivery execution
  driverPickedUpAt: string | null;
  driverEnRouteAt: string | null;
  driverArrivedAt: string | null;
  handoverCompletedAt: string | null;
  handoverCompletedBy: string | null;

  // Evidence
  handoverPhotosCount: number;
  fuelLevelRecorded: boolean;
  odometerRecorded: boolean;
  idCheckResult: string | null;
  idCheckRequired: boolean;

  // Activation audit
  activatedAt: string | null;
  activatedBy: string | null;
  activationSource: string | null;
  activationReason: string | null;

  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): DeliveryTask {
  return {
    id: row.id,
    bookingId: row.booking_id,
    status: row.status,
    assignedDriverId: row.assigned_driver_id,
    intakeCompletedAt: row.intake_completed_at,
    intakeCompletedBy: row.intake_completed_by,
    paymentVerifiedAt: row.payment_verified_at,
    paymentVerifiedBy: row.payment_verified_by,
    readyLineCompletedAt: row.ready_line_completed_at,
    readyLineCompletedBy: row.ready_line_completed_by,
    dispatchedAt: row.dispatched_at,
    dispatchedBy: row.dispatched_by,
    dispatchWindowStart: row.dispatch_window_start,
    dispatchWindowEnd: row.dispatch_window_end,
    driverPickedUpAt: row.driver_picked_up_at,
    driverEnRouteAt: row.driver_en_route_at,
    driverArrivedAt: row.driver_arrived_at,
    handoverCompletedAt: row.handover_completed_at,
    handoverCompletedBy: row.handover_completed_by,
    handoverPhotosCount: row.handover_photos_count || 0,
    fuelLevelRecorded: row.fuel_level_recorded || false,
    odometerRecorded: row.odometer_recorded || false,
    idCheckResult: row.id_check_result,
    idCheckRequired: row.id_check_required ?? true,
    activatedAt: row.activated_at,
    activatedBy: row.activated_by,
    activationSource: row.activation_source,
    activationReason: row.activation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fetch delivery task for a booking */
export function useDeliveryTask(bookingId: string | undefined) {
  return useQuery({
    queryKey: ["delivery-task", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from("delivery_tasks")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching delivery task:", error);
        return null;
      }
      return data ? mapRow(data) : null;
    },
    enabled: !!bookingId,
    staleTime: 10_000,
  });
}

/** Create delivery task when delivery booking is confirmed */
export function useCreateDeliveryTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("delivery_tasks")
        .upsert({
          booking_id: bookingId,
          status: "pending",
        }, { onConflict: "booking_id" })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Failed to create delivery task");

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "delivery_task_created",
        entity_type: "delivery_task",
        entity_id: data.id,
        user_id: user.id,
        new_data: { booking_id: bookingId },
      });

      return mapRow(data);
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });
      toast.success("Delivery task created");
    },
    onError: () => {
      toast.error("Failed to create delivery task. Please try again.");
    },
  });
}

/** Update delivery task fields (generic) */
export function useUpdateDeliveryTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      updates,
      auditAction,
    }: {
      bookingId: string;
      updates: Record<string, unknown>;
      auditAction?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try update first
      let { data, error } = await supabase
        .from("delivery_tasks")
        .update(updates)
        .eq("booking_id", bookingId)
        .select()
        .maybeSingle();

      // If no row exists, create one with the updates applied
      if (!error && !data) {
        const upsertResult = await supabase
          .from("delivery_tasks")
          .upsert({
            booking_id: bookingId,
            status: "pending",
            ...updates,
          }, { onConflict: "booking_id" })
          .select()
          .maybeSingle();
        data = upsertResult.data;
        error = upsertResult.error;
      }

      if (error) throw error;
      if (!data) throw new Error("Failed to create or update delivery task");

      // Audit log
      if (auditAction) {
        await supabase.from("audit_logs").insert({
          action: auditAction,
          entity_type: "delivery_task",
          entity_id: data.id,
          user_id: user.id,
          new_data: { ...updates, booking_id: bookingId },
        });
      }

      return mapRow(data);
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-task", task.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", task.bookingId] });
    },
    onError: () => {
      toast.error("Failed to update delivery task. Please try again.");
    },
  });
}

/** Mark a specific ops pipeline stage as complete */
export function useCompleteDeliveryStage() {
  const updateTask = useUpdateDeliveryTask();

  const completeStage = async (bookingId: string, stage: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const now = new Date().toISOString();
    let updates: Record<string, unknown> = {};
    let auditAction = "";

    switch (stage) {
      case "intake":
        updates = { intake_completed_at: now, intake_completed_by: user.id, status: "intake_done" };
        auditAction = "delivery_intake_completed";
        break;
      case "payment":
        updates = { payment_verified_at: now, payment_verified_by: user.id, status: "payment_verified" };
        auditAction = "delivery_payment_verified";
        break;
      case "ready_line":
        updates = { ready_line_completed_at: now, ready_line_completed_by: user.id, status: "ready_for_dispatch" };
        auditAction = "delivery_ready_line_completed";
        break;
      case "dispatch":
        updates = { dispatched_at: now, dispatched_by: user.id, status: "dispatched" };
        auditAction = "delivery_dispatched";
        break;
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }

    return updateTask.mutateAsync({ bookingId, updates, auditAction });
  };

  return { completeStage, isPending: updateTask.isPending };
}

/** Lock pricing snapshot on booking */
export function useLockPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch current booking pricing data
      const { data: booking, error: fetchErr } = await supabase
        .from("bookings")
        .select(`
          daily_rate, total_days, subtotal, tax_amount, total_amount,
          deposit_amount, protection_plan, young_driver_fee,
          booking_add_ons (add_on_id, price, quantity)
        `)
        .eq("id", bookingId)
        .maybeSingle();

      if (fetchErr || !booking) throw fetchErr || new Error("Booking not found");

      const snapshot = {
        daily_rate: booking.daily_rate,
        total_days: booking.total_days,
        subtotal: booking.subtotal,
        tax_amount: booking.tax_amount,
        total_amount: booking.total_amount,
        deposit_amount: booking.deposit_amount,
        protection_plan: booking.protection_plan,
        young_driver_fee: booking.young_driver_fee,
        add_ons: booking.booking_add_ons || [],
        locked_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("bookings")
        .update({
          pricing_snapshot: snapshot,
          pricing_locked_at: new Date().toISOString(),
          pricing_locked_by: user.id,
        })
        .eq("id", bookingId);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "pricing_locked",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: user.id,
        new_data: snapshot,
      });

      return snapshot;
    },
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      toast.success("Pricing snapshot locked");
    },
    onError: () => {
      toast.error("Failed to lock pricing. Please try again.");
    },
  });
}

/** Ops backup activation - requires evidence + reason */
export function useOpsBackupActivation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      activationReason,
    }: {
      bookingId: string;
      activationReason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!activationReason || activationReason.trim().length < 10) {
        throw new Error("Activation reason must be at least 10 characters");
      }

      const now = new Date().toISOString();

      // Use edge function to bypass trg_block_sensitive_booking_updates trigger
      const { data: efResult, error: efError } = await supabase.functions.invoke(
        "update-booking-status",
        {
          body: {
            bookingId,
            newStatus: "active",
            activationSource: "ops_backup",
            activationReason: activationReason,
          },
        },
      );

      if (efError) throw efError;

      // Update delivery task
      await supabase
        .from("delivery_tasks")
        .upsert({
          booking_id: bookingId,
          activated_at: now,
          activated_by: user.id,
          activation_source: "ops_backup",
          activation_reason: activationReason,
          status: "activated",
        }, { onConflict: "booking_id" });

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "rental_activated_ops_backup",
        entity_type: "booking",
        entity_id: bookingId,
        user_id: user.id,
        new_data: {
          activation_source: "ops_backup",
          activation_reason: activationReason,
        },
      });

      return { success: true };
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["delivery-task", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });
      toast.success("Rental activated from Ops (backup)");
    },
    onError: () => {
      toast.error("Activation failed. Please check all prerequisites and try again.");
    },
  });
}
