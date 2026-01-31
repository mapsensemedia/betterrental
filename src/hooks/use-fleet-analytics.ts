/**
 * Fleet Analytics Hook
 * Provides utilization, cost, and profitability data for vehicles
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
}

export interface FleetSummary {
  totalVehicles: number;
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
      // Get all vehicles with their units
      let vehicleQuery = supabase
        .from("vehicles")
        .select(`
          id,
          make,
          model,
          year,
          daily_rate,
          status,
          location_id,
          locations (name)
        `);

      if (filters?.locationId) {
        vehicleQuery = vehicleQuery.eq("location_id", filters.locationId);
      }
      if (filters?.status) {
        vehicleQuery = vehicleQuery.eq("status", filters.status);
      }

      const { data: vehicles, error: vehiclesError } = await vehicleQuery;
      if (vehiclesError) throw vehiclesError;

      // Get vehicle units
      const { data: units } = await supabase
        .from("vehicle_units")
        .select("*");

      // Get completed bookings for revenue and utilization
      let bookingsQuery = supabase
        .from("bookings")
        .select("vehicle_id, total_amount, total_days, status")
        .eq("status", "completed");

      if (filters?.dateFrom) {
        bookingsQuery = bookingsQuery.gte("end_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        bookingsQuery = bookingsQuery.lte("end_at", filters.dateTo);
      }

      const { data: bookings } = await bookingsQuery;

      // Get expenses
      const { data: expenses } = await supabase
        .from("vehicle_expenses")
        .select("vehicle_unit_id, amount");

      // Aggregate data per vehicle
      const analytics: VehicleAnalytics[] = (vehicles || []).map((vehicle) => {
        const vehicleUnit = units?.find((u) => u.vehicle_id === vehicle.id);
        const vehicleBookings = bookings?.filter((b) => b.vehicle_id === vehicle.id) || [];
        const unitExpenses = vehicleUnit 
          ? expenses?.filter((e) => e.vehicle_unit_id === vehicleUnit.id) || []
          : [];

        const rentalCount = vehicleBookings.length;
        const totalRentalDays = vehicleBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);
        const totalRevenue = vehicleBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const acquisitionCost = vehicleUnit?.acquisition_cost || 0;
        const totalExpenses = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalCosts = acquisitionCost + totalExpenses;
        const profit = totalRevenue - totalExpenses; // Don't include acquisition in operational profit
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

        // Calculate depreciation
        const annualDepreciation = (vehicleUnit as any)?.annual_depreciation_amount || 0;
        const acquisitionDate = vehicleUnit?.acquisition_date 
          ? new Date(vehicleUnit.acquisition_date) 
          : new Date();
        const yearsOwned = (Date.now() - acquisitionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const totalDepreciation = annualDepreciation * yearsOwned;
        const currentValue = Math.max(0, acquisitionCost - totalDepreciation);

        return {
          vehicleId: vehicle.id,
          vehicleUnitId: vehicleUnit?.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicleUnit?.vin,
          licensePlate: vehicleUnit?.license_plate,
          status: vehicleUnit?.status || vehicle.status || "available",
          dailyRate: vehicle.daily_rate,
          locationName: (vehicle.locations as any)?.name,
          rentalCount,
          totalRentalDays,
          acquisitionCost,
          totalExpenses,
          totalRevenue,
          profit,
          profitMargin,
          depreciationMethod: (vehicleUnit as any)?.depreciation_method,
          annualDepreciation,
          currentValue,
          vendorName: (vehicleUnit as any)?.vendor_name,
          vendorContact: (vehicleUnit as any)?.vendor_contact,
        };
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

  const summary: FleetSummary | null = analytics ? {
    totalVehicles: analytics.length,
    activeRentals: analytics.filter((v) => v.status === "rented").length,
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
