import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_QUERY_KEYS } from "../constants/delivery-status";

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME DELIVERY SUBSCRIPTION
// ─────────────────────────────────────────────────────────────────────────────

interface UseRealtimeDeliveryOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useRealtimeDelivery(options: UseRealtimeDeliveryOptions = {}) {
  const { enabled = true, debounceMs = 500 } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const invalidateQueries = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: DELIVERY_QUERY_KEYS.all });
      }, debounceMs);
    };

    // Subscribe to delivery_statuses changes
    const statusChannel = supabase
      .channel('delivery-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_statuses',
        },
        () => {
          invalidateQueries();
        }
      )
      .subscribe();

    // Subscribe to bookings changes (for driver assignment)
    const bookingChannel = supabase
      .channel('delivery-booking-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: 'pickup_address=neq.null', // Only delivery bookings
        },
        () => {
          invalidateQueries();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [enabled, debounceMs, queryClient]);
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME SINGLE DELIVERY (For detail page)
// ─────────────────────────────────────────────────────────────────────────────

export function useRealtimeDeliveryDetail(bookingId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`delivery-detail-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_statuses',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: DELIVERY_QUERY_KEYS.detail(bookingId) 
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: DELIVERY_QUERY_KEYS.detail(bookingId) 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);
}
