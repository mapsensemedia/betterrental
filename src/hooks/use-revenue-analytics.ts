/**
 * Revenue & Add-On Analytics Hook
 * Fetches and calculates rental pricing and add-on metrics
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";

export type BookingChannel = "all" | "online" | "walk_in";
export type PaymentType = "all" | "pay_now" | "pay_later";
export type BookingType = "all" | "pickup" | "delivery";

export interface RevenueFilters {
  startDate: Date;
  endDate: Date;
  channel: BookingChannel;
  locationId: string | null;
  categoryId: string | null;
  bookingType: BookingType;
  paymentType: PaymentType;
}

export interface RentalPriceMetrics {
  averageRentalPrice: number;
  totalBookings: number;
  totalRentalBaseRevenue: number;
  medianRentalPrice: number;
}

export interface AddOnMetrics {
  averageAddOnSpend: number;
  attachRate: number;
  bookingsWithAddOns: number;
  totalAddOnRevenue: number;
}

export interface AddOnBreakdown {
  id: string;
  name: string;
  bookingsAdded: number;
  attachRate: number;
  totalRevenue: number;
  avgPrice: number;
  last30DaysTrend: number; // percentage change
}

export interface ChannelComparison {
  channel: "online" | "walk_in";
  avgRentalPrice: number;
  avgAddOnSpend: number;
  attachRate: number;
  totalRevenue: number;
  bookingCount: number;
}

export interface TrendDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

interface BookingRow {
  id: string;
  daily_rate: number;
  total_days: number;
  booking_source: string | null;
  created_at: string;
  location_id: string;
  vehicle_id: string;
  pickup_address: string | null;
  status: string;
}

interface BookingAddOnRow {
  id: string;
  booking_id: string;
  add_on_id: string;
  price: number;
  add_ons: { id: string; name: string } | null;
}

interface PaymentRow {
  booking_id: string;
  payment_type: string;
}

export function useRevenueAnalytics(filters: RevenueFilters) {
  // Fetch all bookings within the date range
  const bookingsQuery = useQuery({
    queryKey: ["revenue-analytics-bookings", filters.startDate.toISOString(), filters.endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, daily_rate, total_days, booking_source, created_at, location_id, vehicle_id, pickup_address, status")
        .gte("created_at", startOfDay(filters.startDate).toISOString())
        .lte("created_at", endOfDay(filters.endDate).toISOString())
        .in("status", ["confirmed", "active", "completed"]);

      if (error) throw error;
      return (data || []) as BookingRow[];
    },
    staleTime: 60000,
  });

  // Fetch all booking add-ons for the bookings
  const addOnsQuery = useQuery({
    queryKey: ["revenue-analytics-addons", filters.startDate.toISOString(), filters.endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_add_ons")
        .select(`
          id,
          booking_id,
          add_on_id,
          price,
          add_ons!inner(id, name)
        `);

      if (error) throw error;
      return (data || []) as BookingAddOnRow[];
    },
    staleTime: 60000,
    enabled: !!bookingsQuery.data,
  });

  // Fetch payments to determine pay now vs pay later
  const paymentsQuery = useQuery({
    queryKey: ["revenue-analytics-payments", filters.startDate.toISOString(), filters.endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("booking_id, payment_type")
        .eq("status", "completed");

      if (error) throw error;
      return (data || []) as PaymentRow[];
    },
    staleTime: 60000,
    enabled: !!bookingsQuery.data,
  });

  // Fetch vehicles to get category info
  const vehiclesQuery = useQuery({
    queryKey: ["revenue-analytics-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, category");

      if (error) throw error;
      return new Map((data || []).map(v => [v.id, v.category]));
    },
    staleTime: 300000,
  });

  // Calculate all metrics
  const metrics = useMemo(() => {
    if (!bookingsQuery.data) {
      return {
        rentalMetrics: { averageRentalPrice: 0, totalBookings: 0, totalRentalBaseRevenue: 0, medianRentalPrice: 0 },
        addOnMetrics: { averageAddOnSpend: 0, attachRate: 0, bookingsWithAddOns: 0, totalAddOnRevenue: 0 },
        addOnBreakdown: [] as AddOnBreakdown[],
        channelComparison: [] as ChannelComparison[],
        revenueTrend: [] as TrendDataPoint[],
        addOnTrend: [] as TrendDataPoint[],
        exportData: [] as any[],
      };
    }

    const bookings = bookingsQuery.data;
    const addOns = addOnsQuery.data || [];
    const payments = paymentsQuery.data || [];
    const vehicleCategories = vehiclesQuery.data || new Map();

    // Create payment lookup
    const paymentByBooking = new Map<string, string>();
    payments.forEach(p => {
      if (!paymentByBooking.has(p.booking_id)) {
        paymentByBooking.set(p.booking_id, p.payment_type);
      }
    });

    // Filter bookings based on filters
    let filteredBookings = bookings.filter(b => {
      // Channel filter
      if (filters.channel !== "all") {
        const source = b.booking_source || "online";
        if (filters.channel === "online" && source !== "online") return false;
        if (filters.channel === "walk_in" && source !== "walk_in") return false;
      }

      // Location filter
      if (filters.locationId && b.location_id !== filters.locationId) return false;

      // Category filter
      if (filters.categoryId) {
        const category = vehicleCategories.get(b.vehicle_id);
        if (category !== filters.categoryId) return false;
      }

      // Booking type (pickup vs delivery)
      if (filters.bookingType !== "all") {
        const isDelivery = !!b.pickup_address;
        if (filters.bookingType === "delivery" && !isDelivery) return false;
        if (filters.bookingType === "pickup" && isDelivery) return false;
      }

      // Payment type
      if (filters.paymentType !== "all") {
        const paymentType = paymentByBooking.get(b.id);
        if (filters.paymentType === "pay_now" && paymentType !== "deposit") return false;
        if (filters.paymentType === "pay_later" && paymentType === "deposit") return false;
      }

      return true;
    });

    // Create add-on lookup by booking
    const addOnsByBooking = new Map<string, BookingAddOnRow[]>();
    addOns.forEach(ao => {
      const existing = addOnsByBooking.get(ao.booking_id) || [];
      existing.push(ao);
      addOnsByBooking.set(ao.booking_id, existing);
    });

    // Calculate rental base amounts
    const rentalBases = filteredBookings.map(b => b.daily_rate * b.total_days);
    const totalRentalBaseRevenue = rentalBases.reduce((sum, v) => sum + v, 0);
    const averageRentalPrice = filteredBookings.length > 0 ? totalRentalBaseRevenue / filteredBookings.length : 0;

    // Calculate median
    const sortedBases = [...rentalBases].sort((a, b) => a - b);
    const medianRentalPrice = sortedBases.length > 0
      ? sortedBases.length % 2 === 0
        ? (sortedBases[sortedBases.length / 2 - 1] + sortedBases[sortedBases.length / 2]) / 2
        : sortedBases[Math.floor(sortedBases.length / 2)]
      : 0;

    // Calculate add-on metrics
    const bookingIds = new Set(filteredBookings.map(b => b.id));
    const relevantAddOns = addOns.filter(ao => bookingIds.has(ao.booking_id));
    const totalAddOnRevenue = relevantAddOns.reduce((sum, ao) => sum + ao.price, 0);
    const bookingsWithAddOns = new Set(relevantAddOns.map(ao => ao.booking_id)).size;
    const averageAddOnSpend = filteredBookings.length > 0 ? totalAddOnRevenue / filteredBookings.length : 0;
    const attachRate = filteredBookings.length > 0 ? (bookingsWithAddOns / filteredBookings.length) * 100 : 0;

    // Add-on breakdown
    const addOnStats = new Map<string, { name: string; count: number; revenue: number; bookings: Set<string>; last30Revenue: number; prior30Revenue: number }>();
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);

    relevantAddOns.forEach(ao => {
      const booking = filteredBookings.find(b => b.id === ao.booking_id);
      if (!booking || !ao.add_ons) return;

      const existing = addOnStats.get(ao.add_on_id) || { 
        name: ao.add_ons.name, 
        count: 0, 
        revenue: 0, 
        bookings: new Set<string>(),
        last30Revenue: 0,
        prior30Revenue: 0
      };
      existing.count++;
      existing.revenue += ao.price;
      existing.bookings.add(ao.booking_id);

      const bookingDate = new Date(booking.created_at);
      if (bookingDate >= thirtyDaysAgo) {
        existing.last30Revenue += ao.price;
      } else if (bookingDate >= sixtyDaysAgo) {
        existing.prior30Revenue += ao.price;
      }

      addOnStats.set(ao.add_on_id, existing);
    });

    const addOnBreakdown: AddOnBreakdown[] = Array.from(addOnStats.entries()).map(([id, stats]) => ({
      id,
      name: stats.name,
      bookingsAdded: stats.bookings.size,
      attachRate: filteredBookings.length > 0 ? (stats.bookings.size / filteredBookings.length) * 100 : 0,
      totalRevenue: stats.revenue,
      avgPrice: stats.count > 0 ? stats.revenue / stats.count : 0,
      last30DaysTrend: stats.prior30Revenue > 0 
        ? ((stats.last30Revenue - stats.prior30Revenue) / stats.prior30Revenue) * 100 
        : stats.last30Revenue > 0 ? 100 : 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Channel comparison
    const channelStats = { online: { revenue: 0, addOnRevenue: 0, bookings: 0, withAddOns: 0 }, walk_in: { revenue: 0, addOnRevenue: 0, bookings: 0, withAddOns: 0 } };
    
    filteredBookings.forEach(b => {
      const channel = (b.booking_source || "online") as "online" | "walk_in";
      const key = channel === "walk_in" ? "walk_in" : "online";
      const rentalBase = b.daily_rate * b.total_days;
      channelStats[key].revenue += rentalBase;
      channelStats[key].bookings++;

      const bookingAddOns = addOnsByBooking.get(b.id) || [];
      if (bookingAddOns.length > 0) {
        channelStats[key].withAddOns++;
        channelStats[key].addOnRevenue += bookingAddOns.reduce((s, ao) => s + ao.price, 0);
      }
    });

    const channelComparison: ChannelComparison[] = [
      {
        channel: "online",
        avgRentalPrice: channelStats.online.bookings > 0 ? channelStats.online.revenue / channelStats.online.bookings : 0,
        avgAddOnSpend: channelStats.online.bookings > 0 ? channelStats.online.addOnRevenue / channelStats.online.bookings : 0,
        attachRate: channelStats.online.bookings > 0 ? (channelStats.online.withAddOns / channelStats.online.bookings) * 100 : 0,
        totalRevenue: channelStats.online.revenue + channelStats.online.addOnRevenue,
        bookingCount: channelStats.online.bookings,
      },
      {
        channel: "walk_in",
        avgRentalPrice: channelStats.walk_in.bookings > 0 ? channelStats.walk_in.revenue / channelStats.walk_in.bookings : 0,
        avgAddOnSpend: channelStats.walk_in.bookings > 0 ? channelStats.walk_in.addOnRevenue / channelStats.walk_in.bookings : 0,
        attachRate: channelStats.walk_in.bookings > 0 ? (channelStats.walk_in.withAddOns / channelStats.walk_in.bookings) * 100 : 0,
        totalRevenue: channelStats.walk_in.revenue + channelStats.walk_in.addOnRevenue,
        bookingCount: channelStats.walk_in.bookings,
      },
    ];

    // Revenue trend (daily or weekly based on date range)
    const daysDiff = Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const useWeekly = daysDiff > 30;

    let revenueTrend: TrendDataPoint[] = [];
    let addOnTrend: TrendDataPoint[] = [];

    if (useWeekly) {
      const weeks = eachWeekOfInterval({ start: filters.startDate, end: filters.endDate }, { weekStartsOn: 1 });
      weeks.forEach(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekBookings = filteredBookings.filter(b => {
          const d = new Date(b.created_at);
          return d >= weekStart && d <= weekEnd;
        });
        const weekRevenue = weekBookings.reduce((s, b) => s + b.daily_rate * b.total_days, 0);
        const weekAddOnRevenue = relevantAddOns
          .filter(ao => weekBookings.some(b => b.id === ao.booking_id))
          .reduce((s, ao) => s + ao.price, 0);

        revenueTrend.push({ date: format(weekStart, "MMM d"), revenue: weekRevenue, bookings: weekBookings.length });
        addOnTrend.push({ date: format(weekStart, "MMM d"), revenue: weekAddOnRevenue, bookings: weekBookings.length });
      });
    } else {
      const days = eachDayOfInterval({ start: filters.startDate, end: filters.endDate });
      days.forEach(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayBookings = filteredBookings.filter(b => {
          const d = new Date(b.created_at);
          return d >= dayStart && d <= dayEnd;
        });
        const dayRevenue = dayBookings.reduce((s, b) => s + b.daily_rate * b.total_days, 0);
        const dayAddOnRevenue = relevantAddOns
          .filter(ao => dayBookings.some(b => b.id === ao.booking_id))
          .reduce((s, ao) => s + ao.price, 0);

        revenueTrend.push({ date: format(day, "MMM d"), revenue: dayRevenue, bookings: dayBookings.length });
        addOnTrend.push({ date: format(day, "MMM d"), revenue: dayAddOnRevenue, bookings: dayBookings.length });
      });
    }

    // Export data
    const exportData = filteredBookings.map(b => {
      const bookingAddOns = addOnsByBooking.get(b.id) || [];
      const addOnTotal = bookingAddOns.reduce((s, ao) => s + ao.price, 0);
      return {
        booking_id: b.id,
        created_at: b.created_at,
        channel: b.booking_source || "online",
        daily_rate: b.daily_rate,
        total_days: b.total_days,
        rental_base: b.daily_rate * b.total_days,
        addon_count: bookingAddOns.length,
        addon_total: addOnTotal,
        addons: bookingAddOns.map(ao => ao.add_ons?.name).filter(Boolean).join(", "),
      };
    });

    return {
      rentalMetrics: {
        averageRentalPrice,
        totalBookings: filteredBookings.length,
        totalRentalBaseRevenue,
        medianRentalPrice,
      },
      addOnMetrics: {
        averageAddOnSpend,
        attachRate,
        bookingsWithAddOns,
        totalAddOnRevenue,
      },
      addOnBreakdown,
      channelComparison,
      revenueTrend,
      addOnTrend,
      exportData,
    };
  }, [bookingsQuery.data, addOnsQuery.data, paymentsQuery.data, vehiclesQuery.data, filters]);

  return {
    ...metrics,
    isLoading: bookingsQuery.isLoading || addOnsQuery.isLoading,
    error: bookingsQuery.error || addOnsQuery.error,
  };
}

// CSV export helper
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? "";
    }).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
}
