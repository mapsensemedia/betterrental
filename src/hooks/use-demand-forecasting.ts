/**
 * Demand Forecasting Hook
 * Rental frequency analysis by location, category, and time period
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, getDay } from "date-fns";

export interface DemandHeatmapCell {
  label: string; // e.g. "Mon", "Jan"
  value: number; // booking count
}

export interface LocationDemand {
  locationId: string;
  locationName: string;
  totalBookings: number;
  avgDailyRate: number;
}

export interface CategoryDemand {
  categoryId: string;
  categoryName: string;
  totalBookings: number;
  avgDuration: number;
}

export interface SeasonalTrend {
  month: string;
  bookings: number;
  revenue: number;
}

export function useDemandForecasting(months: number = 12) {
  const startDate = useMemo(() => startOfMonth(subMonths(new Date(), months - 1)), [months]);
  const endDate = useMemo(() => endOfMonth(new Date()), []);

  const bookingsQuery = useQuery({
    queryKey: ["demand-forecasting", months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, total_days, daily_rate, total_amount, location_id, vehicle_id, status")
        .gte("start_at", startDate.toISOString())
        .lte("start_at", endDate.toISOString())
        .in("status", ["confirmed", "active", "completed"]);

      if (error) throw error;
      return data || [];
    },
    staleTime: 300000,
  });

  const locationsQuery = useQuery({
    queryKey: ["demand-locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 600000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["demand-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicle_categories").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 600000,
  });

  const vehiclesQuery = useQuery({
    queryKey: ["demand-vehicles-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, category");
      if (error) throw error;
      return new Map((data || []).map((v) => [v.id, v.category]));
    },
    staleTime: 600000,
  });

  const metrics = useMemo(() => {
    const bookings = bookingsQuery.data || [];
    const locations = locationsQuery.data || [];
    const categories = categoriesQuery.data || [];
    const vehicleCategoryMap = vehiclesQuery.data || new Map();

    // Day-of-week heatmap (0=Sun, 6=Sat)
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayOfWeekCounts = new Array(7).fill(0);
    bookings.forEach((b) => {
      const day = getDay(new Date(b.start_at));
      dayOfWeekCounts[day]++;
    });
    const dayOfWeekHeatmap: DemandHeatmapCell[] = dayNames.map((label, i) => ({
      label,
      value: dayOfWeekCounts[i],
    }));

    // Monthly heatmap
    const monthInterval = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyBookings = new Map<string, number>();
    bookings.forEach((b) => {
      const key = format(new Date(b.start_at), "yyyy-MM");
      monthlyBookings.set(key, (monthlyBookings.get(key) || 0) + 1);
    });
    const monthlyHeatmap: DemandHeatmapCell[] = monthInterval.map((m) => ({
      label: format(m, "MMM yy"),
      value: monthlyBookings.get(format(m, "yyyy-MM")) || 0,
    }));

    // Location demand
    const locationDemand: LocationDemand[] = locations.map((loc) => {
      const locBookings = bookings.filter((b) => b.location_id === loc.id);
      return {
        locationId: loc.id,
        locationName: loc.name,
        totalBookings: locBookings.length,
        avgDailyRate: locBookings.length > 0
          ? locBookings.reduce((s, b) => s + b.daily_rate, 0) / locBookings.length
          : 0,
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings);

    // Category demand
    const categoryDemand: CategoryDemand[] = categories.map((cat) => {
      const catBookings = bookings.filter((b) => vehicleCategoryMap.get(b.vehicle_id) === cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalBookings: catBookings.length,
        avgDuration: catBookings.length > 0
          ? catBookings.reduce((s, b) => s + b.total_days, 0) / catBookings.length
          : 0,
      };
    }).sort((a, b) => b.totalBookings - a.totalBookings);

    // Seasonal trend (monthly revenue + bookings)
    const seasonalTrend: SeasonalTrend[] = monthInterval.map((m) => {
      const key = format(m, "yyyy-MM");
      const monthBookings = bookings.filter((b) => format(new Date(b.start_at), "yyyy-MM") === key);
      return {
        month: format(m, "MMM yy"),
        bookings: monthBookings.length,
        revenue: monthBookings.reduce((s, b) => s + b.total_amount, 0),
      };
    });

    return {
      dayOfWeekHeatmap,
      monthlyHeatmap,
      locationDemand,
      categoryDemand,
      seasonalTrend,
      totalBookings: bookings.length,
    };
  }, [bookingsQuery.data, locationsQuery.data, categoriesQuery.data, vehiclesQuery.data, startDate, endDate]);

  return {
    ...metrics,
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
  };
}
