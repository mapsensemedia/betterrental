/**
 * Real-time sidebar notification counts for admin panel
 * Provides unified counts for all sections requiring attention
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SidebarCounts {
  alerts: number;
  operations: number; // Legacy - kept for compatibility
  incidents: number; // Open incidents
  support: number; // Open tickets
  billing: number; // Pending payments
  // Ops panel specific counts
  pickups: number; // Confirmed bookings ready for handover
  active: number; // Active rentals count
  returns: number; // Returns expected today/tomorrow
}

/**
 * Fetch all sidebar counts in a single query batch
 */
export function useSidebarCounts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sidebar-counts"],
    queryFn: async (): Promise<SidebarCounts> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();

      // Run all count queries in parallel
      const [
        alertsResult,
        pickupsResult,
        overdueRentalsResult,
        incidentsResult,
        ticketsResult,
        pendingPaymentsResult,
        activeRentalsResult,
        returnsResult,
      ] = await Promise.all([
        // Pending alerts
        supabase
          .from("admin_alerts")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Pickups: confirmed bookings starting today or later
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "confirmed")
          .gte("start_at", todayStart)
          .lt("start_at", tomorrowEnd),
        
        // Overdue rentals (active bookings past end date)
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .lt("end_at", now.toISOString()),
        
        // Open incidents (not resolved or closed)
        supabase
          .from("incident_cases")
          .select("*", { count: "exact", head: true })
          .not("status", "in", '("resolved","closed")'),
        
        // Open support tickets
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", "open"),
        
        // Pending payments
        supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Active rentals (all)
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        
        // Returns expected today/tomorrow
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .gte("end_at", todayStart)
          .lt("end_at", tomorrowEnd),
      ]);

      const alerts = alertsResult.count ?? 0;
      const pickups = pickupsResult.count ?? 0;
      const overdueRentals = overdueRentalsResult.count ?? 0;
      const incidents = incidentsResult.count ?? 0;
      const tickets = ticketsResult.count ?? 0;
      const pendingPayments = pendingPaymentsResult.count ?? 0;
      const activeRentals = activeRentalsResult.count ?? 0;
      const returns = (returnsResult.count ?? 0) + overdueRentals;

      return {
        alerts,
        operations: pickups + overdueRentals,
        incidents,
        support: tickets,
        billing: pendingPayments,
        pickups,
        active: activeRentals,
        returns,
      };
    },
    staleTime: 15000, // 15 seconds - realtime handles updates
    refetchInterval: 60000, // Fallback refetch every minute
  });

  // Subscribe to real-time changes on relevant tables
  useEffect(() => {
    const channel = supabase
      .channel("sidebar-counts-realtime")
      // Alerts changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_alerts" },
        () => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })
      )
      // Booking changes (for operations)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })
      )
      // Incident changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incident_cases" },
        () => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })
      )
      // Ticket changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })
      )
      // Payment changes
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => queryClient.invalidateQueries({ queryKey: ["sidebar-counts"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    counts: query.data ?? {
      alerts: 0,
      operations: 0,
      incidents: 0,
      support: 0,
      billing: 0,
      pickups: 0,
      active: 0,
      returns: 0,
    },
    isLoading: query.isLoading,
  };
}
