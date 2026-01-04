import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Real-time hook for pending alerts count
 * Subscribes to changes on admin_alerts table
 */
export function usePendingAlertsCount() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-alerts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admin_alerts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching pending alerts count:", error);
        return 0;
      }

      return count || 0;
    },
    staleTime: 10000, // 10 seconds
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const channel = supabase
      .channel("pending-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_alerts",
        },
        () => {
          // Invalidate the count query on any change
          queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
          queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
  };
}
