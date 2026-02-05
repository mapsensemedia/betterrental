/**
 * Deposit Hold Hooks
 * 
 * Hooks for managing Stripe authorization holds on security deposits
 * - Create deposit holds (customer flow)
 * - Capture deposits (ops flow)
 * - Release deposits (ops flow)
 * - Query deposit status
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export type DepositHoldStatus = 
  | "none" 
  | "requires_payment" 
  | "authorizing" 
  | "authorized" 
  | "capturing" 
  | "captured" 
  | "releasing" 
  | "released" 
  | "failed" 
  | "expired" 
  | "canceled";

export interface DepositHoldInfo {
  bookingId: string;
  bookingCode: string;
  status: DepositHoldStatus;
  amount: number;
  authorizedAt: string | null;
  capturedAt: string | null;
  releasedAt: string | null;
  expiresAt: string | null;
  capturedAmount: number | null;
  captureReason: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripePaymentMethodId: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
}

interface CreateHoldResult {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  expiresAt: string;
  alreadyAuthorized?: boolean;
}

interface CaptureResult {
  success: boolean;
  chargeId: string;
  capturedAmount: number;
  releasedAmount: number;
}

interface ReleaseResult {
  success: boolean;
  canceled: boolean;
  paymentIntentId: string;
  releasedAmount: number;
  alreadyReleased?: boolean;
}

/**
 * Query deposit hold status for a booking
 */
export function useDepositHoldStatus(bookingId: string | null) {
  return useQuery({
    queryKey: ["deposit-hold-status", bookingId],
    queryFn: async (): Promise<DepositHoldInfo | null> => {
      if (!bookingId) return null;

      const { data: booking, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          deposit_status,
          deposit_amount,
          deposit_authorized_at,
          deposit_captured_at,
          deposit_released_at,
          deposit_expires_at,
          deposit_captured_amount,
          deposit_capture_reason,
          stripe_deposit_pi_id,
          stripe_deposit_pm_id,
          stripe_deposit_charge_id,
          card_last_four,
          card_type
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      if (!booking) return null;

      // Calculate expiry info
      const expiresAt = booking.deposit_expires_at 
        ? new Date(booking.deposit_expires_at) 
        : null;
      const now = new Date();
      const daysUntilExpiry = expiresAt 
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        status: (booking.deposit_status as DepositHoldStatus) || "none",
        amount: Number(booking.deposit_amount) || 0,
        authorizedAt: booking.deposit_authorized_at,
        capturedAt: booking.deposit_captured_at,
        releasedAt: booking.deposit_released_at,
        expiresAt: booking.deposit_expires_at,
        capturedAmount: booking.deposit_captured_amount 
          ? booking.deposit_captured_amount / 100 
          : null,
        captureReason: booking.deposit_capture_reason,
        stripePaymentIntentId: booking.stripe_deposit_pi_id,
        stripeChargeId: booking.stripe_deposit_charge_id,
        stripePaymentMethodId: booking.stripe_deposit_pm_id,
        cardLast4: booking.card_last_four,
        cardBrand: booking.card_type,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 2,
      };
    },
    enabled: !!bookingId,
    staleTime: 10000,
    refetchInterval: (query) => {
      // Refetch more frequently for pending states
      const status = query.state.data?.status;
      if (status === "authorizing" || status === "capturing" || status === "releasing") {
        return 3000; // Every 3 seconds
      }
      return false;
    },
  });
}

/**
 * Create a deposit authorization hold
 */
export function useCreateDepositHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      amount 
    }: { 
      bookingId: string; 
      amount?: number;
    }): Promise<CreateHoldResult> => {
      const { data, error } = await supabase.functions.invoke("create-deposit-hold", {
        body: { bookingId, amount },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to create deposit hold");
      
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-hold-status", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["booking", variables.bookingId] 
      });
      
      if (result.alreadyAuthorized) {
        toast.info("Deposit hold already authorized");
      } else {
        toast.success("Deposit hold created - ready for card authorization");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to create deposit hold: " + error.message);
    },
  });
}

/**
 * Capture an authorized deposit (full or partial)
 */
export function useCaptureDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      amount, 
      reason 
    }: { 
      bookingId: string; 
      amount?: number;
      reason: string;
    }): Promise<CaptureResult> => {
      const { data, error } = await supabase.functions.invoke("capture-deposit", {
        body: { bookingId, amount, reason },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to capture deposit");
      
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-hold-status", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-ledger", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["booking", variables.bookingId] 
      });
      
      if (result.releasedAmount > 0) {
        toast.success(
          `Captured $${result.capturedAmount.toFixed(2)}, released $${result.releasedAmount.toFixed(2)}`
        );
      } else {
        toast.success(`Captured full deposit: $${result.capturedAmount.toFixed(2)}`);
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to capture deposit: " + error.message);
    },
  });
}

/**
 * Release a deposit authorization hold
 */
export function useReleaseDepositHold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      reason,
      bypassStatusCheck 
    }: { 
      bookingId: string; 
      reason: string;
      bypassStatusCheck?: boolean;
    }): Promise<ReleaseResult> => {
      const { data, error } = await supabase.functions.invoke("release-deposit-hold", {
        body: { bookingId, reason, bypassStatusCheck },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to release deposit hold");
      
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-hold-status", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-ledger", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["booking", variables.bookingId] 
      });
      
      if (result.alreadyReleased) {
        toast.info("Deposit hold was already released");
      } else {
        toast.success(`Deposit hold released: $${result.releasedAmount.toFixed(2)}`);
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to release deposit: " + error.message);
    },
  });
}

/**
 * Close account with final settlement
 */
export function useCloseAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      additionalCharges,
      notes 
    }: { 
      bookingId: string; 
      additionalCharges?: Array<{
        description: string;
        amount: number;
        type: "late_fee" | "damage" | "fee" | "other";
      }>;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("close-account", {
        body: { bookingId, additionalCharges, notes },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || "Failed to close account");
      
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["deposit-hold-status", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["booking", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["final-invoice", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["admin-bookings"] 
      });
      
      toast.success(`Account closed - Invoice ${result.invoiceNumber} generated`);
    },
    onError: (error: Error) => {
      toast.error("Failed to close account: " + error.message);
    },
  });
}

/**
 * Subscribe to real-time deposit status changes
 */
export function useRealtimeDepositStatus(
  bookingId: string | null,
  onStatusChange?: (status: DepositHoldStatus) => void
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["deposit-realtime-sub", bookingId],
    queryFn: () => {
      if (!bookingId) return null;

      const channel = supabase
        .channel(`deposit-${bookingId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `id=eq.${bookingId}`,
          },
          (payload) => {
            const newStatus = payload.new.deposit_status as DepositHoldStatus;
            const oldStatus = payload.old?.deposit_status as DepositHoldStatus;
            
            if (newStatus !== oldStatus) {
              // Invalidate query to trigger re-fetch
              queryClient.invalidateQueries({ 
                queryKey: ["deposit-hold-status", bookingId] 
              });
              
              // Call callback if provided
              onStatusChange?.(newStatus);
              
              // Show toast for important transitions
              if (newStatus === "authorized") {
                toast.success("Deposit authorization confirmed");
              } else if (newStatus === "captured") {
                toast.info("Deposit has been captured");
              } else if (newStatus === "released") {
                toast.success("Deposit hold released");
              } else if (newStatus === "failed") {
                toast.error("Deposit authorization failed");
              } else if (newStatus === "expired") {
                toast.warning("Deposit authorization has expired");
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    enabled: !!bookingId,
    staleTime: Infinity, // Subscription doesn't need refetching
  });
}
