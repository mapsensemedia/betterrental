/**
 * Revenue & Add-On Analytics Hook
 * Fetches and calculates rental pricing and add-on metrics
 * Includes booking-level extras (protection, upgrades, young driver fees)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval, eachWeekOfInterval, endOfWeek } from "date-fns";
import { getProtectionRateForCategory } from "@/lib/protection-groups";

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
  averageDays: number;
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
  last30DaysTrend: number;
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
  total_amount: number;
  booking_source: string | null;
  start_at: string;
  created_at: string;
  location_id: string;
  vehicle_id: string;
  pickup_address: string | null;
  status: string;
  wl_transaction_id: string | null;
  protection_plan: string | null;
  young_driver_fee: number | null;
  upgrade_daily_fee: number | null;
}

interface BookingAddOnRow {
  id: string;
  booking_id: string;
  add_on_id: string;
  price: number;
  add_ons: { id: string; name: string } | null;
}

interface VehicleCategoryRow {
  id: string;
  name: string;
}

export function useRevenueAnalytics(filters: RevenueFilters) {
  // Fetch all bookings within the date range (by start_at)
  const bookingsQuery = useQuery({
    queryKey: [
      "revenue-analytics-bookings",
      filters.startDate.toISOString(),
      filters.endDate.toISOString(),
      filters.channel,
      filters.locationId,
      filters.categoryId,
      filters.bookingType,
      filters.paymentType,
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, daily_rate, total_days, total_amount, booking_source, start_at, created_at, location_id, vehicle_id, pickup_address, status, wl_transaction_id, protection_plan, young_driver_fee, upgrade_daily_fee")
        .gte("start_at", startOfDay(filters.startDate).toISOString())
        .lte("start_at", endOfDay(filters.endDate).toISOString())
        .in("status", ["confirmed", "active", "completed"]);

      if (error) throw error;
      const bookings = (data || []) as BookingRow[];

      // Fetch actual payments for these bookings
      if (bookings.length === 0) return { bookings, paidMap: new Map<string, number>() };

      const bookingIds = bookings.map(b => b.id);
      // Batch in chunks of 200 to avoid query limits
      const paidMap = new Map<string, number>();
      for (let i = 0; i < bookingIds.length; i += 200) {
        const chunk = bookingIds.slice(i, i + 200);
        const { data: paymentRows } = await supabase
          .from("payments")
          .select("booking_id, amount")
          .in("booking_id", chunk)
          .in("status", ["completed", "captured"]);

        (paymentRows || []).forEach(p => {
          paidMap.set(p.booking_id, (paidMap.get(p.booking_id) || 0) + Number(p.amount));
        });
      }

      return { bookings, paidMap };
    },
    staleTime: 60000,
  });

  // Fetch vehicle categories for protection rate lookups
  const categoriesQuery = useQuery({
    queryKey: ["revenue-analytics-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("id, name");
      if (error) throw error;
      return (data || []) as VehicleCategoryRow[];
    },
    staleTime: 300000,
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

  // Calculate all metrics
  const metrics = useMemo(() => {
    if (!bookingsQuery.data) {
      return {
        rentalMetrics: { averageRentalPrice: 0, totalBookings: 0, totalRentalBaseRevenue: 0, medianRentalPrice: 0, averageDays: 0 },
        addOnMetrics: { averageAddOnSpend: 0, attachRate: 0, bookingsWithAddOns: 0, totalAddOnRevenue: 0 },
        addOnBreakdown: [] as AddOnBreakdown[],
        channelComparison: [] as ChannelComparison[],
        revenueTrend: [] as TrendDataPoint[],
        addOnTrend: [] as TrendDataPoint[],
        exportData: [] as any[],
      };
    }

    const bookings = bookingsQuery.data.bookings;
    const paidMap = bookingsQuery.data.paidMap;
    const addOns = addOnsQuery.data || [];
    const categories = categoriesQuery.data || [];

    // Build category name lookup
    const categoryNameMap = new Map<string, string>();
    categories.forEach(c => categoryNameMap.set(c.id, c.name));

    // Filter bookings based on filters
    const filteredBookings = bookings.filter(b => {
      if (filters.channel !== "all") {
        const source = b.booking_source || "online";
        if (filters.channel === "online" && source !== "online") return false;
        if (filters.channel === "walk_in" && source !== "walk_in") return false;
      }
      if (filters.locationId && b.location_id !== filters.locationId) return false;
      if (filters.categoryId && b.vehicle_id !== filters.categoryId) return false;
      if (filters.bookingType !== "all") {
        const isDelivery = !!b.pickup_address;
        if (filters.bookingType === "delivery" && !isDelivery) return false;
        if (filters.bookingType === "pickup" && isDelivery) return false;
      }
      if (filters.paymentType !== "all") {
        const isPaidViaGateway = !!b.wl_transaction_id;
        if (filters.paymentType === "pay_now" && !isPaidViaGateway) return false;
        if (filters.paymentType === "pay_later" && isPaidViaGateway) return false;
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

    // --- Rental Revenue Metrics ---
    const rentalBases = filteredBookings.map(b => paidMap.get(b.id) || 0);
    const totalRentalBaseRevenue = rentalBases.reduce((sum, v) => sum + v, 0);
    const averageRentalPrice = filteredBookings.length > 0 ? totalRentalBaseRevenue / filteredBookings.length : 0;
    const sortedBases = [...rentalBases].sort((a, b) => a - b);
    const medianRentalPrice = sortedBases.length > 0
      ? sortedBases.length % 2 === 0
        ? (sortedBases[sortedBases.length / 2 - 1] + sortedBases[sortedBases.length / 2]) / 2
        : sortedBases[Math.floor(sortedBases.length / 2)]
      : 0;
    const averageDays = filteredBookings.length > 0
      ? filteredBookings.reduce((sum, b) => sum + b.total_days, 0) / filteredBookings.length
      : 0;

    // --- Compute booking-level extras as "virtual" add-on revenue ---
    // Track which bookings have ANY extras (booking_add_ons OR booking-level fields)
    const bookingIds = new Set(filteredBookings.map(b => b.id));
    const relevantAddOns = addOns.filter(ao => bookingIds.has(ao.booking_id));

    // Compute per-booking extras revenue from booking-level fields
    interface BookingExtras {
      protectionRevenue: number;
      protectionName: string;
      upgradeRevenue: number;
      youngDriverRevenue: number;
    }
    const bookingExtrasMap = new Map<string, BookingExtras>();
    const bookingsWithAnyExtras = new Set<string>();

    filteredBookings.forEach(b => {
      let protectionRevenue = 0;
      let protectionName = "";
      const upgradeRevenue = (b.upgrade_daily_fee || 0) * b.total_days;
      const youngDriverRevenue = b.young_driver_fee || 0;

      if (b.protection_plan && b.protection_plan !== "none") {
        const categoryName = categoryNameMap.get(b.vehicle_id) || "";
        const { name, rate } = getProtectionRateForCategory(b.protection_plan, categoryName);
        protectionRevenue = rate * b.total_days;
        protectionName = name;
      }

      const hasExtras = protectionRevenue > 0 || upgradeRevenue > 0 || youngDriverRevenue > 0;
      if (hasExtras) bookingsWithAnyExtras.add(b.id);

      bookingExtrasMap.set(b.id, { protectionRevenue, protectionName, upgradeRevenue, youngDriverRevenue });
    });

    // Also mark bookings that have booking_add_ons rows
    relevantAddOns.forEach(ao => bookingsWithAnyExtras.add(ao.booking_id));

    // Total add-on revenue = booking_add_ons + booking-level extras
    const tableAddOnRevenue = relevantAddOns.reduce((sum, ao) => sum + ao.price, 0);
    let totalProtectionRevenue = 0;
    let totalUpgradeRevenue = 0;
    let totalYoungDriverRevenue = 0;
    bookingExtrasMap.forEach(ext => {
      totalProtectionRevenue += ext.protectionRevenue;
      totalUpgradeRevenue += ext.upgradeRevenue;
      totalYoungDriverRevenue += ext.youngDriverRevenue;
    });
    const totalExtrasRevenue = tableAddOnRevenue + totalProtectionRevenue + totalUpgradeRevenue + totalYoungDriverRevenue;

    const averageAddOnSpend = filteredBookings.length > 0 ? totalExtrasRevenue / filteredBookings.length : 0;
    const attachRate = filteredBookings.length > 0 ? (bookingsWithAnyExtras.size / filteredBookings.length) * 100 : 0;

    // --- Add-on Breakdown: combine booking_add_ons rows + virtual extras ---
    const addOnStats = new Map<string, { name: string; count: number; revenue: number; bookings: Set<string>; last30Revenue: number; prior30Revenue: number }>();
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sixtyDaysAgo = subDays(new Date(), 60);

    // Helper to upsert stats
    const upsertStat = (key: string, name: string, bookingId: string, revenue: number, bookingDate: Date) => {
      const existing = addOnStats.get(key) || { name, count: 0, revenue: 0, bookings: new Set<string>(), last30Revenue: 0, prior30Revenue: 0 };
      existing.count++;
      existing.revenue += revenue;
      existing.bookings.add(bookingId);
      if (bookingDate >= thirtyDaysAgo) existing.last30Revenue += revenue;
      else if (bookingDate >= sixtyDaysAgo) existing.prior30Revenue += revenue;
      addOnStats.set(key, existing);
    };

    // From booking_add_ons table
    relevantAddOns.forEach(ao => {
      const booking = filteredBookings.find(b => b.id === ao.booking_id);
      if (!booking || !ao.add_ons) return;
      upsertStat(ao.add_on_id, ao.add_ons.name, ao.booking_id, ao.price, new Date(booking.start_at));
    });

    // Virtual: Protection Plans
    filteredBookings.forEach(b => {
      const ext = bookingExtrasMap.get(b.id);
      if (!ext || ext.protectionRevenue <= 0) return;
      upsertStat("virtual-protection", ext.protectionName || "Protection Plan", b.id, ext.protectionRevenue, new Date(b.start_at));
    });

    // Virtual: Vehicle Upgrades
    filteredBookings.forEach(b => {
      const ext = bookingExtrasMap.get(b.id);
      if (!ext || ext.upgradeRevenue <= 0) return;
      upsertStat("virtual-upgrade", "Vehicle Upgrade", b.id, ext.upgradeRevenue, new Date(b.start_at));
    });

    // Virtual: Young Driver Fee
    filteredBookings.forEach(b => {
      const ext = bookingExtrasMap.get(b.id);
      if (!ext || ext.youngDriverRevenue <= 0) return;
      upsertStat("virtual-young-driver", "Young Driver Fee", b.id, ext.youngDriverRevenue, new Date(b.start_at));
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

    // --- Channel Comparison (including booking-level extras) ---
    const channelStats = { online: { revenue: 0, extrasRevenue: 0, bookings: 0, withExtras: 0 }, walk_in: { revenue: 0, extrasRevenue: 0, bookings: 0, withExtras: 0 } };

    filteredBookings.forEach(b => {
      const channel = (b.booking_source || "online") as "online" | "walk_in";
      const key = channel === "walk_in" ? "walk_in" : "online";
      channelStats[key].revenue += paidMap.get(b.id) || 0;
      channelStats[key].bookings++;

      const tableAddOns = addOnsByBooking.get(b.id) || [];
      const ext = bookingExtrasMap.get(b.id);
      const bookingExtrasTotal = (ext?.protectionRevenue || 0) + (ext?.upgradeRevenue || 0) + (ext?.youngDriverRevenue || 0)
        + tableAddOns.reduce((s, ao) => s + ao.price, 0);

      if (bookingExtrasTotal > 0) {
        channelStats[key].withExtras++;
        channelStats[key].extrasRevenue += bookingExtrasTotal;
      }
    });

    const channelComparison: ChannelComparison[] = [
      {
        channel: "online",
        avgRentalPrice: channelStats.online.bookings > 0 ? channelStats.online.revenue / channelStats.online.bookings : 0,
        avgAddOnSpend: channelStats.online.bookings > 0 ? channelStats.online.extrasRevenue / channelStats.online.bookings : 0,
        attachRate: channelStats.online.bookings > 0 ? (channelStats.online.withExtras / channelStats.online.bookings) * 100 : 0,
        totalRevenue: channelStats.online.revenue + channelStats.online.extrasRevenue,
        bookingCount: channelStats.online.bookings,
      },
      {
        channel: "walk_in",
        avgRentalPrice: channelStats.walk_in.bookings > 0 ? channelStats.walk_in.revenue / channelStats.walk_in.bookings : 0,
        avgAddOnSpend: channelStats.walk_in.bookings > 0 ? channelStats.walk_in.extrasRevenue / channelStats.walk_in.bookings : 0,
        attachRate: channelStats.walk_in.bookings > 0 ? (channelStats.walk_in.withExtras / channelStats.walk_in.bookings) * 100 : 0,
        totalRevenue: channelStats.walk_in.revenue + channelStats.walk_in.extrasRevenue,
        bookingCount: channelStats.walk_in.bookings,
      },
    ];

    // --- Revenue trend (daily or weekly) ---
    const daysDiff = Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const useWeekly = daysDiff > 30;

    const computeExtrasForBookings = (bks: BookingRow[]) => {
      let total = 0;
      bks.forEach(b => {
        const ext = bookingExtrasMap.get(b.id);
        total += (ext?.protectionRevenue || 0) + (ext?.upgradeRevenue || 0) + (ext?.youngDriverRevenue || 0);
        total += relevantAddOns.filter(ao => ao.booking_id === b.id).reduce((s, ao) => s + ao.price, 0);
      });
      return total;
    };

    let revenueTrend: TrendDataPoint[] = [];
    let addOnTrend: TrendDataPoint[] = [];

    if (useWeekly) {
      const weeks = eachWeekOfInterval({ start: filters.startDate, end: filters.endDate }, { weekStartsOn: 1 });
      weeks.forEach(weekStart => {
        const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekBookings = filteredBookings.filter(b => {
          const d = new Date(b.start_at);
          return d >= weekStart && d <= weekEndDate;
        });
        revenueTrend.push({ date: format(weekStart, "MMM d"), revenue: weekBookings.reduce((s, b) => s + (paidMap.get(b.id) || 0), 0), bookings: weekBookings.length });
        addOnTrend.push({ date: format(weekStart, "MMM d"), revenue: computeExtrasForBookings(weekBookings), bookings: weekBookings.length });
      });
    } else {
      const days = eachDayOfInterval({ start: filters.startDate, end: filters.endDate });
      days.forEach(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayBookings = filteredBookings.filter(b => {
          const d = new Date(b.start_at);
          return d >= dayStart && d <= dayEnd;
        });
        revenueTrend.push({ date: format(day, "MMM d"), revenue: dayBookings.reduce((s, b) => s + (paidMap.get(b.id) || 0), 0), bookings: dayBookings.length });
        addOnTrend.push({ date: format(day, "MMM d"), revenue: computeExtrasForBookings(dayBookings), bookings: dayBookings.length });
      });
    }

    // Export data
    const exportData = filteredBookings.map(b => {
      const tableAOs = addOnsByBooking.get(b.id) || [];
      const ext = bookingExtrasMap.get(b.id);
      const addOnTotal = tableAOs.reduce((s, ao) => s + ao.price, 0)
        + (ext?.protectionRevenue || 0) + (ext?.upgradeRevenue || 0) + (ext?.youngDriverRevenue || 0);
      const addonNames = [
        ...tableAOs.map(ao => ao.add_ons?.name).filter(Boolean),
        ...(ext?.protectionRevenue ? [ext.protectionName] : []),
        ...(ext?.upgradeRevenue ? ["Vehicle Upgrade"] : []),
        ...(ext?.youngDriverRevenue ? ["Young Driver Fee"] : []),
      ].join(", ");
      return {
        booking_id: b.id,
        start_at: b.start_at,
        channel: b.booking_source || "online",
        daily_rate: b.daily_rate,
        total_days: b.total_days,
        total_amount: paidMap.get(b.id) || 0,
        addon_count: tableAOs.length + (ext?.protectionRevenue ? 1 : 0) + (ext?.upgradeRevenue ? 1 : 0) + (ext?.youngDriverRevenue ? 1 : 0),
        addon_total: addOnTotal,
        addons: addonNames,
      };
    });

    return {
      rentalMetrics: { averageRentalPrice, totalBookings: filteredBookings.length, totalRentalBaseRevenue, medianRentalPrice, averageDays },
      addOnMetrics: { averageAddOnSpend, attachRate, bookingsWithAddOns: bookingsWithAnyExtras.size, totalAddOnRevenue: totalExtrasRevenue },
      addOnBreakdown,
      channelComparison,
      revenueTrend,
      addOnTrend,
      exportData,
    };
  }, [bookingsQuery.data, addOnsQuery.data, categoriesQuery.data, filters]);

  return {
    ...metrics,
    isLoading: bookingsQuery.isLoading || addOnsQuery.isLoading || categoriesQuery.isLoading,
    error: bookingsQuery.error || addOnsQuery.error || categoriesQuery.error,
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
