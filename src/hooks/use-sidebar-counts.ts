/**
 * Real-time sidebar notification counts for admin panel
 * Provides unified counts for all sections requiring attention
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SidebarCounts {
  alerts: number;
  operations: number; // Pickups pending + active rentals with issues
  incidents: number; // Open incidents
  support: number; // Open tickets
  billing: number; // Pending payments
}

/**
 * Fetch all sidebar counts in a single query batch
 */
export function useSidebarCounts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sidebar-counts"],
    queryFn: async (): Promise<SidebarCounts> => {
      // Run all count queries in parallel
      const [
        alertsResult,
        pickupsResult,
        overdueRentalsResult,
        incidentsResult,
        ticketsResult,
        pendingPaymentsResult,
      ] = await Promise.all([
        // Pending alerts
        supabase
          .from("admin_alerts")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        
        // Pickups due today or earlier (confirmed bookings awaiting handover)
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "confirmed")
          .lte("start_at", new Date().toISOString()),
        
        // Overdue rentals (active bookings past end date)
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .lt("end_at", new Date().toISOString()),
        
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
      ]);

      const alerts = alertsResult.count ?? 0;
      const pickups = pickupsResult.count ?? 0;
      const overdueRentals = overdueRentalsResult.count ?? 0;
      const incidents = incidentsResult.count ?? 0;
      const tickets = ticketsResult.count ?? 0;
      const pendingPayments = pendingPaymentsResult.count ?? 0;

      return {
        alerts,
        operations: pickups + overdueRentals,
        incidents,
        support: tickets,
        billing: pendingPayments,
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
    },
    isLoading: query.isLoading,
  };
}
