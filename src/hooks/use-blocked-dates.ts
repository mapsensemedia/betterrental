import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addHours, isWithinInterval, eachDayOfInterval, startOfDay } from "date-fns";

interface BlockedRange {
  start: Date;
  end: Date;
  reason: "booking" | "hold" | "buffer";
}

interface BlockedDatesResult {
  blockedRanges: BlockedRange[];
  blockedDates: Date[];
  isDateBlocked: (date: Date) => boolean;
}

export function useBlockedDates(
  vehicleId: string | null,
  fromDate: Date,
  toDate: Date
) {
  return useQuery<BlockedDatesResult>({
    queryKey: ["blocked-dates", vehicleId, fromDate.toISOString(), toDate.toISOString()],
    queryFn: async () => {
      if (!vehicleId) {
        return { blockedRanges: [], blockedDates: [], isDateBlocked: () => false };
      }

      // Get vehicle cleaning buffer
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("cleaning_buffer_hours")
        .eq("id", vehicleId)
        .single();

      const bufferHours = vehicle?.cleaning_buffer_hours || 2;

      // Fetch bookings that overlap with the date range
      const { data: bookings } = await supabase
        .from("bookings")
        .select("start_at, end_at, status")
        .eq("vehicle_id", vehicleId)
        .in("status", ["pending", "confirmed", "active"])
        .gte("end_at", fromDate.toISOString())
        .lte("start_at", toDate.toISOString());

      // Fetch active holds
      const { data: holds } = await supabase
        .from("reservation_holds")
        .select("start_at, end_at, expires_at")
        .eq("vehicle_id", vehicleId)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .gte("end_at", fromDate.toISOString())
        .lte("start_at", toDate.toISOString());

      const blockedRanges: BlockedRange[] = [];

      // Add booking ranges (with buffer)
      (bookings || []).forEach((booking) => {
        const start = new Date(booking.start_at);
        const end = addHours(new Date(booking.end_at), bufferHours);
        blockedRanges.push({ start, end, reason: "booking" });
      });

      // Add hold ranges
      (holds || []).forEach((hold) => {
        const start = new Date(hold.start_at);
        const end = new Date(hold.end_at);
        blockedRanges.push({ start, end, reason: "hold" });
      });

      // Generate list of blocked dates
      const blockedDatesSet = new Set<string>();
      blockedRanges.forEach((range) => {
        try {
          const days = eachDayOfInterval({ start: range.start, end: range.end });
          days.forEach((day) => blockedDatesSet.add(startOfDay(day).toISOString()));
        } catch {
          // Invalid interval
        }
      });

      const blockedDates = Array.from(blockedDatesSet).map((d) => new Date(d));

      const isDateBlocked = (date: Date): boolean => {
        const dayStart = startOfDay(date);
        return blockedRanges.some((range) => {
          try {
            return isWithinInterval(dayStart, { start: startOfDay(range.start), end: startOfDay(range.end) });
          } catch {
            return false;
          }
        });
      };

      return { blockedRanges, blockedDates, isDateBlocked };
    },
    enabled: !!vehicleId,
    staleTime: 30000,
  });
}
