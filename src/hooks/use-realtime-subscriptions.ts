/**
 * Real-time subscriptions for active rentals and alerts
 * Uses Supabase Realtime to receive instant updates
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to real-time booking changes (for active rentals monitoring)
 */
export function useRealtimeBookings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("[Realtime] Booking change:", payload.eventType);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
          queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["bookings"] });
          
          // If status changed, also refresh stats
          const oldRecord = payload.old as Record<string, unknown> | null;
          const newRecord = payload.new as Record<string, unknown> | null;
          if (oldRecord?.status !== newRecord?.status) {
            queryClient.invalidateQueries({ queryKey: ["booking-stats"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time admin alerts
 */
export function useRealtimeAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("[Realtime] Setting up alerts subscription...");
    
    const channel = supabase
      .channel("realtime-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_alerts",
        },
        (payload) => {
          console.log("[Realtime] New alert:", payload.new);
          // Immediate refetch on new alerts
          queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
          queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_alerts",
        },
        (payload) => {
          console.log("[Realtime] Alert updated:", payload.new);
          queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
          queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "admin_alerts",
        },
        (payload) => {
          console.log("[Realtime] Alert deleted:", payload.old);
          queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
          queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Alerts subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Cleaning up alerts subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time damage reports
 */
export function useRealtimeDamages() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-damages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "damage_reports",
        },
        (payload) => {
          console.log("[Realtime] Damage change:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["damage-reports"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time verification requests
 */
export function useRealtimeVerifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-verifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_requests",
        },
        (payload) => {
          console.log("[Realtime] Verification change:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
          queryClient.invalidateQueries({ queryKey: ["admin-verifications-overview"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time delivery status updates
 * Invalidates BookingOps queries when driver updates status
 */
export function useRealtimeDeliveryStatuses(bookingId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("[Realtime] Setting up delivery statuses subscription...", bookingId ? `for booking ${bookingId}` : "global");
    
    const channel = supabase
      .channel(`realtime-delivery-statuses${bookingId ? `-${bookingId}` : ""}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_statuses",
          ...(bookingId ? { filter: `booking_id=eq.${bookingId}` } : {}),
        },
        (payload) => {
          console.log("[Realtime] Delivery status change:", payload.eventType, payload.new);
          
          // Invalidate booking queries to refresh ops step content
          queryClient.invalidateQueries({ queryKey: ["booking"] });
          queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
          queryClient.invalidateQueries({ queryKey: ["active-rentals"] });
          
          // If specific booking, also invalidate that exact query
          const newRecord = payload.new as Record<string, unknown> | null;
          if (newRecord?.booking_id) {
            queryClient.invalidateQueries({ queryKey: ["booking", newRecord.booking_id] });
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Delivery statuses subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Cleaning up delivery statuses subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient, bookingId]);
}

/**
 * Combined hook for admin dashboard - subscribes to all relevant real-time updates
 */
export function useAdminRealtimeSubscriptions() {
  useRealtimeBookings();
  useRealtimeAlerts();
  useRealtimeDamages();
  useRealtimeVerifications();
  useRealtimeDeliveryStatuses(); // Add global delivery status updates
}

/**
 * Subscribe to real-time delivery updates for driver portal
 * Listens to bookings and delivery_statuses tables
 */
export function useRealtimeDeliveries() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("[Realtime] Setting up deliveries subscription...");
    
    const channel = supabase
      .channel("realtime-deliveries")
      // Listen for booking changes (new assignments, status updates)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("[Realtime] Booking change for deliveries:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
        }
      )
      // Listen for delivery status updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_statuses",
        },
        (payload) => {
          console.log("[Realtime] Delivery status change:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
          queryClient.invalidateQueries({ queryKey: ["delivery-detail"] });
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Deliveries subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Cleaning up deliveries subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Subscribe to real-time booking updates for customer dashboard
 * Keeps customer's booking list fresh
 */
export function useCustomerRealtimeSubscriptions(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    
    console.log("[Realtime] Setting up customer subscriptions for user:", userId);
    
    const channel = supabase
      .channel(`customer-updates-${userId}`)
      // Listen for booking status changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[Realtime] Customer booking change:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
          queryClient.invalidateQueries({ queryKey: ["booking"] });
          queryClient.invalidateQueries({ queryKey: ["booking-pickup"] });
        }
      )
      // Listen for rental agreement updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rental_agreements",
        },
        (payload) => {
          console.log("[Realtime] Agreement change:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["rental-agreement"] });
          queryClient.invalidateQueries({ queryKey: ["my-agreements"] });
        }
      )
      // Listen for verification updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_requests",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[Realtime] Verification change:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["my-verifications"] });
          queryClient.invalidateQueries({ queryKey: ["booking-verification"] });
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Customer subscription status:", status);
      });

    return () => {
      console.log("[Realtime] Cleaning up customer subscriptions");
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);
}
