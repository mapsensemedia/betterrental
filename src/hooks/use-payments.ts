import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "./use-admin";
import { toast } from "sonner";

export type PaymentMethod = "cash" | "card_terminal" | "e_transfer" | "card" | "other";

interface RecordPaymentParams {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ bookingId, amount, method, reference, notes }: RecordPaymentParams) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get booking to determine amount_due
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("total_amount, user_id")
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Get existing payments to calculate total paid
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("booking_id", bookingId)
        .eq("status", "completed");

      const totalPaid = (existingPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const newTotalPaid = totalPaid + amount;
      const amountDue = Number(booking.total_amount);

      // Determine payment status
      const status = newTotalPaid >= amountDue ? "completed" : "pending";

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: bookingId,
          user_id: booking.user_id,
          amount: amount,
          payment_type: "rental",
          payment_method: method,
          status: "completed",
          transaction_id: reference || `in_person_${Date.now()}`,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Log the action
      await logAction("payment_recorded", "payment", payment.id, {
        booking_id: bookingId,
        amount,
        method,
        reference,
        notes,
        recorded_by: user.id,
      });

      // Resolve any pending payment alerts for this booking
      const { data: pendingAlerts } = await supabase
        .from("admin_alerts")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("alert_type", "payment_pending")
        .eq("status", "pending");

      if (pendingAlerts && pendingAlerts.length > 0) {
        await supabase
          .from("admin_alerts")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
          })
          .in("id", pendingAlerts.map(a => a.id));

        await logAction("alert_auto_resolved", "admin_alerts", pendingAlerts[0].id, {
          reason: "payment_recorded",
          booking_id: bookingId,
        });
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-booking"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["handovers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error) => {
      console.error("Failed to record payment:", error);
      toast.error("Failed to record payment");
    },
  });
}

export function useBookingByCode(code: string | null) {
  return useMutation({
    mutationFn: async (searchCode: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          start_at,
          end_at,
          status,
          locations (id, name, address, city)
        `)
        .eq("booking_code", searchCode.toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
