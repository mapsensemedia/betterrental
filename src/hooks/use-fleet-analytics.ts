/**
 * Fleet Analytics Hook
 * Provides utilization, cost, and profitability data for vehicle units (VINs)
 * Tracks analytics per VIN using vehicle_units table only
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  // Utilization
  rentalCount: number;
  totalRentalDays: number;
  // Financials
  acquisitionCost: number;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  // Depreciation
  depreciationMethod?: string;
  annualDepreciation: number;
  currentValue: number;
  // Vendor
  vendorName?: string;
  vendorContact?: string;
  // Downtime tracking
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

export function useFleetAnalytics(filters?: {
  locationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["fleet-analytics", filters],
    queryFn: async (): Promise<VehicleAnalytics[]> => {
      // Get all vehicle units with their parent vehicles
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          vehicle:vehicles (
            id,
            make,
            model,
            year,
            daily_rate,
            status,
            location_id,
            locations (name)
          )
        `);

      if (unitsError) throw unitsError;

      // Get completed and active bookings for revenue and utilization
      let bookingsQuery = supabase
        .from("bookings")
        .select("vehicle_id, assigned_unit_id, total_amount, total_days, status")
        .in("status", ["completed", "active"]);

      if (filters?.dateFrom) {
        bookingsQuery = bookingsQuery.gte("end_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        bookingsQuery = bookingsQuery.lte("end_at", filters.dateTo);
      }

      const { data: bookings } = await bookingsQuery;

      // Get expenses per unit
      const { data: expenses } = await supabase
        .from("vehicle_expenses")
        .select("vehicle_unit_id, amount");

      // Build analytics array from vehicle units only
      const analytics: VehicleAnalytics[] = [];

      (units || []).forEach((unit: any) => {
        if (!unit.vehicle) return;

        // Filter by location/status if specified
        if (filters?.locationId && unit.vehicle.location_id !== filters.locationId) return;
        if (filters?.status && unit.status !== filters.status) return;

        // Get bookings assigned to this specific unit
        const unitBookings = bookings?.filter((b) => b.assigned_unit_id === unit.id) || [];
        // For bookings without unit assignment, match via category_id (bookings.vehicle_id stores category UUID)
        const categoryBookings = bookings?.filter(
          (b) => !b.assigned_unit_id && b.vehicle_id === unit.category_id
        ) || [];
        const allBookings = [...unitBookings, ...categoryBookings];

        const unitExpenses = expenses?.filter((e) => e.vehicle_unit_id === unit.id) || [];

        const rentalCount = allBookings.length;
        const totalRentalDays = allBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);
        const totalRevenue = allBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const acquisitionCost = unit.acquisition_cost || 0;
        const totalExpenses = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        // Calculate depreciation
        const annualDepreciation = unit.annual_depreciation_amount || 0;
        const acquisitionDate = unit.acquisition_date
          ? new Date(unit.acquisition_date)
          : new Date();
        const yearsOwned = (Date.now() - acquisitionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const totalDepreciation = annualDepreciation * yearsOwned;
        const currentValue = Math.max(0, acquisitionCost - totalDepreciation);

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
  });
}

export function useFleetSummary(filters?: {
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { data: analytics, isLoading } = useFleetAnalytics(filters);

  // Derive active rentals from actual bookings, not stale unit status
  const { data: activeBookingCount } = useQuery({
    queryKey: ["fleet-active-booking-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .not("assigned_unit_id", "is", null);
      if (error) throw error;
      return count || 0;
    },
  });

  const summary: FleetSummary | null = analytics ? {
    totalVehicles: analytics.length,
    totalUnits: analytics.length,
    activeRentals: activeBookingCount ?? 0,
    totalRevenue: analytics.reduce((sum, v) => sum + v.totalRevenue, 0),
    totalCosts: analytics.reduce((sum, v) => sum + v.totalExpenses, 0),
    totalProfit: analytics.reduce((sum, v) => sum + v.profit, 0),
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
