/**
 * Fleet Analytics Hook
 * Provides utilization, cost, and profitability data for vehicle units (VINs)
 * Tracks analytics per VIN using vehicle_units table only
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unitBranchId } from "@/lib/location-scope";

export interface VehicleAnalytics {
  vehicleId: string;
  vehicleUnitId?: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate?: string;
  status: string;
  dailyRate: number;
  locationName?: string;
  rentalCount: number;
  totalRentalDays: number;
  acquisitionCost: number;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  depreciationMethod?: string;
  annualDepreciation: number;
  currentValue: number;
  vendorName?: string;
  vendorContact?: string;
  downtimeDays?: number;
}

export interface FleetSummary {
  totalVehicles: number;
  totalUnits: number;
  activeRentals: number;
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  avgUtilization: number;
  topPerformers: VehicleAnalytics[];
  underperformers: VehicleAnalytics[];
}

const REVENUE_STATUSES = ["confirmed", "active", "completed"] as const;

export function useFleetAnalytics(filters?: {
  locationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["fleet-analytics", filters],
    queryFn: async (): Promise<VehicleAnalytics[]> => {
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          vehicle:vehicles (
            id, make, model, year, daily_rate, status, location_id,
            locations (name)
          )
        `);

      if (unitsError) throw unitsError;

      // Only count bookings with assigned_unit_id for per-unit analytics
      // This prevents double-counting when multiple units share a category
      let bookingsQuery = supabase
        .from("bookings")
        .select("vehicle_id, assigned_unit_id, total_amount, total_days, status")
        .in("status", REVENUE_STATUSES)
        .not("assigned_unit_id", "is", null);

      if (filters?.locationId) {
        bookingsQuery = bookingsQuery.eq("location_id", filters.locationId);
      }
      if (filters?.dateFrom) {
        bookingsQuery = bookingsQuery.gte("end_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        bookingsQuery = bookingsQuery.lte("end_at", filters.dateTo);
      }

      const { data: bookings } = await bookingsQuery;

      const { data: expenses } = await supabase
        .from("vehicle_expenses")
        .select("vehicle_unit_id, amount");

      const analytics: VehicleAnalytics[] = [];

      (units || []).forEach((unit: any) => {
        if (!unit.vehicle) return;
        if (filters?.locationId && unitBranchId(unit) !== filters.locationId) return;
        if (filters?.status && unit.status !== filters.status) return;

        const unitBookings = bookings?.filter((b) => b.assigned_unit_id === unit.id) || [];
        const unitExpenses = expenses?.filter((e) => e.vehicle_unit_id === unit.id) || [];

        const rentalCount = unitBookings.length;
        const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);
        const totalRevenue = unitBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const acquisitionCost = unit.acquisition_cost || 0;
        const totalExpenses = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        const annualDepreciation = unit.annual_depreciation_amount || 0;
        const acquisitionDate = unit.acquisition_date ? new Date(unit.acquisition_date) : new Date();
        const yearsOwned = (Date.now() - acquisitionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const currentValue = Math.max(0, acquisitionCost - annualDepreciation * yearsOwned);

        analytics.push({
          vehicleId: unit.vehicle_id,
          vehicleUnitId: unit.id,
          make: unit.vehicle.make,
          model: unit.vehicle.model,
          year: unit.vehicle.year,
          vin: unit.vin,
          licensePlate: unit.license_plate,
          status: unit.status || unit.vehicle.status || "available",
          dailyRate: unit.vehicle.daily_rate,
          locationName: unit.vehicle.locations?.name,
          rentalCount,
          totalRentalDays,
          acquisitionCost,
          totalExpenses,
          totalRevenue,
          profit,
          profitMargin,
          depreciationMethod: unit.depreciation_method,
          annualDepreciation,
          currentValue,
          vendorName: unit.vendor_name,
          vendorContact: unit.vendor_contact,
          downtimeDays: 0,
        });
      });

      return analytics.sort((a, b) => b.rentalCount - a.rentalCount);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useFleetSummary(filters?: {
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}, options?: { enabled?: boolean }) {
  const { data: analytics, isLoading } = useFleetAnalytics(filters, options);

  // Fleet-level revenue: query bookings directly to avoid double-counting
  const { data: fleetRevenue } = useQuery({
    queryKey: ["fleet-total-revenue", filters],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("total_amount")
        .in("status", REVENUE_STATUSES);

      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters?.dateFrom) {
        query = query.gte("end_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("end_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).reduce((sum, b) => sum + (b.total_amount || 0), 0);
    },
    enabled: options?.enabled ?? true,
  });

  const { data: activeBookingCount } = useQuery({
    queryKey: ["fleet-active-booking-count", filters?.locationId ?? "all"],
    queryFn: async () => {
      let countQuery = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .not("assigned_unit_id", "is", null);

      if (filters?.locationId) {
        countQuery = countQuery.eq("location_id", filters.locationId);
      }

      const { count, error } = await countQuery;
      if (error) throw error;
      return count || 0;
    },
    enabled: options?.enabled ?? true,
  });

  const summary: FleetSummary | null = analytics ? {
    totalVehicles: analytics.length,
    totalUnits: analytics.length,
    activeRentals: activeBookingCount ?? 0,
    totalRevenue: fleetRevenue ?? 0,
    totalCosts: analytics.reduce((sum, v) => sum + v.totalExpenses, 0),
    totalProfit: (fleetRevenue ?? 0) - analytics.reduce((sum, v) => sum + v.totalExpenses, 0),
    avgUtilization: analytics.length > 0
      ? analytics.reduce((sum, v) => sum + v.rentalCount, 0) / analytics.length
      : 0,
    topPerformers: [...analytics].sort((a, b) => b.profit - a.profit).slice(0, 5),
    underperformers: [...analytics].sort((a, b) => a.profit - b.profit).slice(0, 5),
  } : null;

  return { summary, isLoading };
}

export function useVehiclePerformanceComparison(vehicleIds: string[]) {
  const { data: analytics } = useFleetAnalytics();
  const comparison = analytics?.filter((v) => vehicleIds.includes(v.vehicleId)) || [];
  return { comparison };
}
