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

export function useCalendarData(weekOffset: number = 0, locationId?: string) {
  return useQuery<CalendarData>({
    queryKey: ["admin-calendar", weekOffset, locationId],
    queryFn: async () => {
      const baseDate = addDays(new Date(), weekOffset * 7);
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
      
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }

      // Fetch vehicles
      let vehiclesQuery = supabase
        .from("vehicles")
        .select(`
          id, make, model, year, category, image_url, location_id, cleaning_buffer_hours,
          locations (name)
        `)
        .eq("is_available", true)
        .order("make");

      if (locationId) {
        vehiclesQuery = vehiclesQuery.eq("location_id", locationId);
      }

      const { data: vehiclesData, error: vehiclesError } = await vehiclesQuery.limit(50);

      if (vehiclesError) {
        console.error("Error fetching vehicles:", vehiclesError);
        throw vehiclesError;
      }

      // Fetch bookings for the week
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, booking_code, status, start_at, end_at, vehicle_id, user_id")
        .gte("end_at", weekStart.toISOString())
        .lte("start_at", weekEnd.toISOString())
        .in("status", ["pending", "confirmed", "active"]);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        throw bookingsError;
      }

      // Fetch profiles for customer names
      const userIds = [...new Set((bookingsData || []).map(b => b.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const vehicles: CalendarVehicle[] = (vehiclesData || []).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        category: v.category || "Other",
        imageUrl: v.image_url,
        locationId: v.location_id,
        locationName: v.locations?.name || null,
        cleaningBufferHours: v.cleaning_buffer_hours || 2,
      }));

      const bookings: CalendarBooking[] = (bookingsData || []).map((b: any) => {
        const profile = profilesMap.get(b.user_id);
        return {
          id: b.id,
          bookingCode: b.booking_code,
          status: b.status,
          startAt: b.start_at,
          endAt: b.end_at,
          vehicleId: b.vehicle_id,
          customerName: profile?.full_name || null,
          customerEmail: profile?.email || null,
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
