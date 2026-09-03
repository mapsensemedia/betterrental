/**
 * Shared Collected Revenue Hook
 * Single source of truth for actual collected revenue.
 * Only counts money from the payments table with status completed/captured.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CollectedRevenueResult {
  collected: number;
  pending: number;
  failed: number;
  completedCount: number;
  typeBreakdown: { rental: number; deposit: number; other: number };
  isLoading: boolean;
}

export function useCollectedRevenue(
  startDate: Date,
  endDate: Date,
  locationId?: string | null,
): CollectedRevenueResult {
  const start = startDate.toISOString();
  const end = endDate.toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["collected-revenue", start, end, locationId ?? "all"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("payments")
        .select("id, booking_id, amount, payment_type, payment_method, status, transaction_id, created_at")
        .gte("created_at", start)
        .lte("created_at", end);
      if (error) throw error;

      let scopedRows = rows || [];
      if (locationId && scopedRows.length) {
        const bookingIds = [...new Set(scopedRows.map((p) => p.booking_id).filter(Boolean))] as string[];
        const { data: scopedBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("location_id", locationId)
          .in("id", bookingIds);
        const allowed = new Set((scopedBookings || []).map((b) => b.id));
        scopedRows = scopedRows.filter((p) => p.booking_id && allowed.has(p.booking_id));
      }


      const payments = scopedRows.map(p => ({ ...p, amount: Number(p.amount) }));

      const completedRows = payments.filter(p => p.status === "completed" || p.status === "captured");
      const collected = completedRows.reduce((sum, p) => sum + p.amount, 0);
      const completedCount = completedRows.length;

      const pending = payments
        .filter(p => p.status === "pending" || p.status === "authorized")
        .reduce((sum, p) => sum + p.amount, 0);

      const failed = payments
        .filter(p => p.status === "failed")
        .reduce((sum, p) => sum + p.amount, 0);

      const rental = completedRows
        .filter(p => p.payment_type === "rental" || p.payment_type === "extension" || p.payment_type === "P" || p.payment_type === "PAC")
        .reduce((sum, p) => sum + p.amount, 0);

      const deposit = completedRows
        .filter(p => p.payment_type === "deposit")
        .reduce((sum, p) => sum + p.amount, 0);

      const other = completedRows
        .filter(p => p.payment_type !== "rental" && p.payment_type !== "extension" && p.payment_type !== "P" && p.payment_type !== "PAC" && p.payment_type !== "deposit")
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        collected,
        pending,
        failed,
        completedCount,
        typeBreakdown: { rental, deposit, other },
      };
    },
    staleTime: 30_000,
  });

  return {
    collected: data?.collected ?? 0,
    pending: data?.pending ?? 0,
    failed: data?.failed ?? 0,
    completedCount: data?.completedCount ?? 0,
    typeBreakdown: data?.typeBreakdown ?? { rental: 0, deposit: 0, other: 0 },
    isLoading,
  };
}
