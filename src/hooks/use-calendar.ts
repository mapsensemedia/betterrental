import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";

export interface CalendarVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  imageUrl: string | null;
  locationId: string | null;
  locationName: string | null;
  cleaningBufferHours: number;
}

export interface CalendarBooking {
  id: string;
  bookingCode: string;
  status: string;
  startAt: string;
  endAt: string;
  vehicleId: string;
  customerName: string | null;
  customerEmail: string | null;
}

export interface CalendarData {
  vehicles: CalendarVehicle[];
  bookings: CalendarBooking[];
  weekStart: Date;
  weekEnd: Date;
  days: Date[];
}

export function useCalendarData(weekOffset: number = 0, locationId: string | null = null) {
  return useQuery<CalendarData>({
    queryKey: ["admin-calendar", weekOffset, locationId ?? "all"],
    queryFn: async () => {
      const baseDate = addDays(new Date(), weekOffset * 7);
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
      
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }

      // Fetch vehicle categories (bookings.vehicle_id points to vehicle_categories)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("vehicle_categories")
        .select("id, name, image_url, daily_rate, seats, fuel_type, transmission")
        .eq("is_active", true)
        .order("name");

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        throw categoriesError;
      }

      // Fetch bookings for the week — include completed for past weeks
      let bookingsQuery = supabase
        .from("bookings")
        .select("id, booking_code, status, start_at, end_at, vehicle_id, user_id, customer_id")
        .gte("end_at", weekStart.toISOString())
        .lte("start_at", weekEnd.toISOString())
        .in("status", ["pending", "confirmed", "active", "completed"]);
      if (locationId) bookingsQuery = bookingsQuery.eq("location_id", locationId);
      const { data: bookingsData, error: bookingsError } = await bookingsQuery;

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      // Batch-fetch customers for bookings with customer_id
      const customerIds = [...new Set((bookingsData || []).filter(b => b.customer_id).map(b => b.customer_id!))];
      const { data: customersData } = customerIds.length > 0
        ? await supabase.from("customers").select("id, full_name, email").in("id", customerIds)
        : { data: [] };
      const customersMap = new Map((customersData || []).map(c => [c.id, c]));

      // Fetch profiles as fallback for bookings without customer_id
      const userIds = [...new Set((bookingsData || []).filter(b => !b.customer_id).map(b => b.user_id))];
      const { data: profilesData } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] };
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const vehicles: CalendarVehicle[] = (categoriesData || []).map((c: any) => ({
        id: c.id,
        make: "",
        model: c.name,
        year: new Date().getFullYear(),
        category: c.name,
        imageUrl: c.image_url,
        locationId: null,
        locationName: null,
        cleaningBufferHours: 2,
      }));

      const bookings: CalendarBooking[] = (bookingsData || []).map((b: any) => {
        // Prefer customers table over profiles
        const customer = b.customer_id ? customersMap.get(b.customer_id) : null;
        const profile = !customer ? profilesMap.get(b.user_id) : null;
        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          vehicleId: b.vehicle_id,
          customerName: customer?.full_name || profile?.full_name || null,
          customerEmail: customer?.email || profile?.email || null,
        };
      });

      return {
        vehicles,
        bookings,
        weekStart,
        weekEnd,
        days,
      };
    },
    staleTime: 30000,
  });
}
