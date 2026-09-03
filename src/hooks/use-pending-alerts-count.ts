import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isLifecycleNotice } from "./use-alerts";
import { useEffectiveLocationId, useStaffLocation } from "./use-staff-location";

/**
 * Real-time count of pending alerts that actually need attention.
 *
 * Lifecycle notices (rental activated, booking completed, cancellations) are
 * excluded, and the count is scoped to the acting user's branch: a manager only
 * counts alerts for their own branch, a super admin counts the selected branch
 * (or all branches when none is selected).
 */
export function usePendingAlertsCount() {
  const queryClient = useQueryClient();
  const { locationId, isReady, isUnassignedManager } = useEffectiveLocationId();
  const { isSuperAdmin } = useStaffLocation();

  const query = useQuery({
    queryKey: ["pending-alerts-count", locationId, isSuperAdmin],
    enabled: isReady && !isUnassignedManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_alerts")
        .select("id, title, message, booking_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching pending alerts count:", error);
        return 0;
      }

      const actionable = (data ?? []).filter((a) => !isLifecycleNotice(a));
      if (!locationId) return isSuperAdmin ? actionable.length : 0;

      const bookingIds = [...new Set(actionable.map((a) => a.booking_id).filter(Boolean))] as string[];
      if (bookingIds.length === 0) return 0;

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id")
        .in("id", bookingIds)
        .eq("location_id", locationId);

      const branchBookings = new Set((bookings ?? []).map((b) => b.id));
      return actionable.filter((a) => a.booking_id && branchBookings.has(a.booking_id)).length;
    },
    staleTime: 10000,
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
