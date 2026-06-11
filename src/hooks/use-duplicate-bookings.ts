/**
 * Detects other bookings for the same customer + vehicle with overlapping dates
 * that already have a completed Worldline rental authorization.
 *
 * Used by the Ops Payment screen to warn staff before they take a second card
 * payment from a customer who has already paid on a parallel duplicate booking.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DuplicateBookingSuspect {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  totalAmount: number;
  wlAuthStatus: string | null;
  createdAt: string;
}

export function useDuplicateBookings(bookingId: string | null | undefined) {
  return useQuery<DuplicateBookingSuspect[]>({
    queryKey: ["duplicate-bookings", bookingId],
    enabled: !!bookingId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: current, error: currentErr } = await supabase
        .from("bookings")
        .select("user_id, vehicle_id, start_at, end_at")
        .eq("id", bookingId!)
        .maybeSingle();
      if (currentErr || !current?.user_id || !current?.vehicle_id) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, status, start_at, end_at, total_amount, wl_auth_status, created_at")
        .eq("user_id", current.user_id)
        .eq("vehicle_id", current.vehicle_id)
        .neq("id", bookingId!)
        .in("status", ["draft", "pending", "confirmed", "active", "completed"])
        .lt("start_at", current.end_at)
        .gt("end_at", current.start_at)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.warn("[use-duplicate-bookings] query failed", error);
        return [];
      }

      return (data ?? []).map((r: any) => ({
        id: r.id,
        bookingCode: r.booking_code,
        status: r.status,
        startAt: r.start_at,
        endAt: r.end_at,
        totalAmount: Number(r.total_amount ?? 0),
        wlAuthStatus: r.wl_auth_status,
        createdAt: r.created_at,
      }));
    },
  });
}
