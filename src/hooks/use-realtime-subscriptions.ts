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
 * Combined hook for admin dashboard - subscribes to all relevant real-time updates
 */
export function useAdminRealtimeSubscriptions() {
  useRealtimeBookings();
  useRealtimeAlerts();
  useRealtimeDamages();
  useRealtimeVerifications();
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
