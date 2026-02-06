/**
 * Global Realtime Subscriptions
 *
 * A single Supabase channel that listens to all operationally-critical tables
 * and invalidates the relevant React Query caches so every panel (Admin, Ops,
 * Delivery, Support) refreshes automatically when data changes.
 *
 * Each shell component calls the hook once — the hook is idempotent per
 * React component lifecycle (one channel per mount).
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Debounced invalidation helper — batches rapid-fire Postgres events
 * into a single cache bust per table within the debounce window.
 */
function useDebouncedInvalidator(delayMs = 300) {
  const queryClient = useQueryClient();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const invalidate = (keys: readonly string[][]) => {
    const tag = keys.map((k) => k.join("-")).join("|");
    if (timers.current[tag]) clearTimeout(timers.current[tag]);
    timers.current[tag] = setTimeout(() => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      delete timers.current[tag];
    }, delayMs);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return invalidate;
}

/**
 * Subscribe to all operationally-important tables and auto-refresh caches.
 *
 * Covers: bookings, admin_alerts, damage_reports, delivery_statuses,
 * support_tickets_v2, ticket_messages, incident_cases, payments,
 * condition_photos, checkin_records, vehicle_units, verification_requests,
 * deposit_ledger, deposit_jobs
 */
export function useGlobalRealtime() {
  const invalidate = useDebouncedInvalidator();

  useEffect(() => {
    const channel = supabase
      .channel("global-realtime")

      // ─── Bookings ───────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () =>
          invalidate([
            ["bookings"],
            ["admin-bookings"],
            ["active-rentals"],
            ["active-rental"],
            ["booking"],
            ["booking-stats"],
            ["handovers"],
            ["returns"],
            ["sidebar-counts"],
            ["my-bookings"],
            ["my-deliveries"],
            ["delivery-detail"],
          ])
      )

      // ─── Admin Alerts ──────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_alerts" },
        () =>
          invalidate([
            ["admin-alerts"],
            ["pending-alerts-count"],
            ["alerts"],
            ["sidebar-counts"],
          ])
      )

      // ─── Damage Reports ────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "damage_reports" },
        () => invalidate([["damage-reports"]])
      )

      // ─── Delivery Statuses ─────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_statuses" },
        () =>
          invalidate([
            ["my-deliveries"],
            ["delivery-detail"],
            ["delivery-list"],
            ["delivery-counts"],
            ["booking"],
            ["active-rentals"],
          ])
      )

      // ─── Support Tickets ───────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets_v2" },
        () =>
          invalidate([
            ["support-tickets"],
            ["support-ticket"],
            ["ticket-queue-counts"],
            ["sidebar-counts"],
          ])
      )

      // ─── Ticket Messages ───────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_messages" },
        () =>
          invalidate([
            ["ticket-messages"],
            ["support-tickets"],
            ["support-ticket"],
          ])
      )

      // ─── Incident Cases ────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incident_cases" },
        () =>
          invalidate([
            ["incidents"],
            ["incident"],
            ["sidebar-counts"],
          ])
      )

      // ─── Payments ──────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () =>
          invalidate([
            ["payments"],
            ["sidebar-counts"],
          ])
      )

      // ─── Condition Photos ──────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "condition_photos" },
        () => invalidate([["condition-photos"]])
      )

      // ─── Check-in Records ──────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkin_records" },
        () => invalidate([["checkin-record"], ["booking"]])
      )

      // ─── Vehicle Units ─────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_units" },
        () =>
          invalidate([
            ["vehicle-units"],
            ["vehicle-unit"],
            ["fleet-categories"],
            ["browse-categories"],
          ])
      )

      // ─── Verification Requests ─────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "verification_requests" },
        () =>
          invalidate([
            ["admin-verifications"],
            ["admin-verifications-overview"],
            ["my-verifications"],
            ["booking-verification"],
          ])
      )

      // ─── Deposit Ledger ────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposit_ledger" },
        () => invalidate([["deposit-ledger"]])
      )

      // ─── Deposit Jobs ──────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deposit_jobs" },
        () => invalidate([["deposit-jobs"]])
      )

      // ─── Rental Agreements ─────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rental_agreements" },
        () =>
          invalidate([
            ["rental-agreement"],
            ["my-agreements"],
          ])
      )

      // ─── Delivery Status Log ───────────────────────────────────
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_status_log" },
        () => invalidate([["delivery-detail"], ["delivery-status-log"]])
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidate]);
}
