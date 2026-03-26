/**
 * Shared Collected Revenue Hook
 * Single source of truth for actual collected revenue across Finance and Reports.
 * Mirrors the Finance module's payment-based calculation with dedup + WL supplement + unrecorded revenue.
 */
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CollectedRevenueResult {
  collected: number;
  pending: number;
  failed: number;
  completedCount: number;
  typeBreakdown: { rental: number; deposit: number; other: number };
  isLoading: boolean;
}

export function useCollectedRevenue(startDate: Date, endDate: Date): CollectedRevenueResult {
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  // Source A — payments table
  const { data: paymentsOnly = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["collected-revenue-payments", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, booking_id, amount, payment_type, status, transaction_id, created_at")
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) throw error;
      return (data || []).map((p) => ({
        ...p,
        amount: Number(p.amount),
        unreconciled: false,
      }));
    },
    staleTime: 30_000,
  });

  // Source B — WL supplement (bookings with WL txn not in payments)
  const { data: wlSupplement = [] } = useQuery({
    queryKey: ["collected-revenue-wl", start, end],
    queryFn: async () => {
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("booking_id, transaction_id, payment_type")
        .gte("created_at", start)
        .lte("created_at", end);

      const paidRentalBookingIds = new Set(
        (existingPayments || []).filter((p) => ["rental", "PAC", "P"].includes(p.payment_type)).map((p) => p.booking_id)
      );
      const paidDepositBookingIds = new Set(
        (existingPayments || []).filter((p) => p.payment_type === "deposit").map((p) => p.booking_id)
      );
      const paidRentalTxnIds = new Set(
        (existingPayments || []).filter((p) => p.transaction_id && ["rental", "PAC", "P"].includes(p.payment_type)).map((p) => p.transaction_id)
      );
      const paidDepositTxnIds = new Set(
        (existingPayments || []).filter((p) => p.transaction_id && p.payment_type === "deposit").map((p) => p.transaction_id)
      );

      const { data: wlRentals } = await supabase
        .from("bookings")
        .select("id, total_amount, wl_transaction_id, wl_auth_status, created_at, start_at")
        .not("wl_transaction_id", "is", null)
        .or(`created_at.gte.${start},start_at.gte.${start}`)
        .or(`created_at.lte.${end},start_at.lte.${end}`);

      const { data: wlDeposits } = await supabase
        .from("bookings")
        .select("id, deposit_amount, wl_deposit_transaction_id, wl_deposit_auth_status, deposit_status, deposit_authorized_at, created_at, start_at")
        .not("wl_deposit_transaction_id", "is", null)
        .or(`created_at.gte.${start},start_at.gte.${start}`)
        .or(`created_at.lte.${end},start_at.lte.${end}`);

      const rentalEntries = (wlRentals || []).filter(
        (b) => !paidRentalBookingIds.has(b.id) && !paidRentalTxnIds.has(b.wl_transaction_id!)
      );
      const depositEntries = (wlDeposits || []).filter(
        (b) => !paidDepositBookingIds.has(b.id) && !paidDepositTxnIds.has(b.wl_deposit_transaction_id!)
      );

      const records: Array<{ id: string; booking_id: string; amount: number; payment_type: string; status: string; transaction_id: string | null; created_at: string; unreconciled: boolean }> = [];

      for (const b of rentalEntries) {
        const effectiveDate = b.start_at || b.created_at;
        const d = new Date(effectiveDate);
        if (d < new Date(start) || d > new Date(end)) continue;
        records.push({
          id: `wl-rental-${b.id}`,
          booking_id: b.id,
          amount: Number(b.total_amount),
          payment_type: "rental",
          status: b.wl_auth_status === "completed" ? "completed" : b.wl_auth_status || "pending",
          transaction_id: b.wl_transaction_id,
          created_at: effectiveDate,
          unreconciled: true,
        });
      }

      for (const b of depositEntries) {
        const effectiveDate = b.deposit_authorized_at || b.start_at || b.created_at;
        const d = new Date(effectiveDate);
        if (d < new Date(start) || d > new Date(end)) continue;
        records.push({
          id: `wl-deposit-${b.id}`,
          booking_id: b.id,
          amount: Number(b.deposit_amount || 0),
          payment_type: "deposit",
          status: b.deposit_status === "captured" ? "completed" : b.wl_deposit_auth_status === "authorized" ? "authorized" : b.deposit_status || "pending",
          transaction_id: b.wl_deposit_transaction_id,
          created_at: effectiveDate,
          unreconciled: true,
        });
      }

      return records;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Source C — Unrecorded revenue
  const { data: unrecordedTotal = 0 } = useQuery({
    queryKey: ["collected-revenue-unrecorded", start, end],
    queryFn: async () => {
      const { data: allBookings, error } = await supabase
        .from("bookings")
        .select("id, total_amount, wl_transaction_id")
        .in("status", ["confirmed", "active", "completed"])
        .gte("start_at", start)
        .lte("start_at", end);
      if (error) throw error;
      if (!allBookings?.length) return 0;

      const noWl = allBookings.filter((b) => !b.wl_transaction_id);
      if (!noWl.length) return 0;

      const ids = noWl.map((b) => b.id);
      const { data: paidRows } = await supabase
        .from("payments")
        .select("booking_id")
        .in("booking_id", ids)
        .eq("status", "completed");
      const paidSet = new Set((paidRows || []).map((p) => p.booking_id));

      return noWl.filter((b) => !paidSet.has(b.id)).reduce((s, b) => s + Number(b.total_amount), 0);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  // Merge + dedup
  const payments = useMemo(() => {
    if (!wlSupplement.length) return paymentsOnly;
    const existingKeys = new Set(paymentsOnly.map((p) => `${p.booking_id}::${p.payment_type}`));
    const unique = wlSupplement.filter((w) => !existingKeys.has(`${w.booking_id}::${w.payment_type}`));
    return [...paymentsOnly, ...unique];
  }, [paymentsOnly, wlSupplement]);

  const result = useMemo(() => {
    const seen = new Set<string>();
    let collected = 0;
    let completedCount = 0;
    for (const p of payments) {
      if (p.status === "completed") {
        const dedupeKey = p.transaction_id || p.id;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          collected += p.amount;
          completedCount++;
        }
      }
    }
    collected += unrecordedTotal;

    const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);

    // Type breakdown with dedup
    const seenRental = new Set<string>();
    const seenDeposit = new Set<string>();
    const seenOther = new Set<string>();
    let rental = 0, deposit = 0, other = 0;
    for (const p of payments) {
      if (p.status !== "completed") continue;
      const key = p.transaction_id || p.id;
      if (p.payment_type === "rental" || p.payment_type === "P" || p.payment_type === "PAC") {
        if (!seenRental.has(key)) { seenRental.add(key); rental += p.amount; }
      } else if (p.payment_type === "deposit") {
        if (!seenDeposit.has(key)) { seenDeposit.add(key); deposit += p.amount; }
      } else {
        if (!seenOther.has(key)) { seenOther.add(key); other += p.amount; }
      }
    }

    return { collected, pending, failed, completedCount, typeBreakdown: { rental, deposit, other } };
  }, [payments, unrecordedTotal]);

  return { ...result, isLoading: loadingPayments };
}
