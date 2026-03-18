/**
 * Enhanced Fleet Analytics Hook
 * Adds fuel type, vendor, and lifecycle data for performance comparison
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnhancedVehicleAnalytics {
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
  fuelType?: string;
  transmission?: string;
  rentalCount: number;
  totalRentalDays: number;
  acquisitionCost: number;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  acquisitionDate?: string;
  expectedDisposalDate?: string;
  depreciationMethod?: string;
  annualDepreciation: number;
  currentValue: number;
  vendorName?: string;
  vendorContact?: string;
}

const REVENUE_STATUSES = ["confirmed", "active", "completed"];

export function useFleetAnalyticsEnhanced(filters?: {
  locationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["fleet-analytics-enhanced", filters],
    queryFn: async (): Promise<EnhancedVehicleAnalytics[]> => {
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          category:vehicle_categories(id, name, fuel_type, transmission),
          vehicle:vehicles (
            id, make, model, year, daily_rate, status, location_id,
            locations (name)
          )
        `);

      if (unitsError) throw unitsError;

      // Only count bookings with assigned_unit_id for per-unit analytics
      let bookingsQuery = supabase
        .from("bookings")
        .select("vehicle_id, assigned_unit_id, total_amount, total_days, status")
        .in("status", REVENUE_STATUSES)
        .not("assigned_unit_id", "is", null);

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

      const analytics: EnhancedVehicleAnalytics[] = [];

      (units || []).forEach((unit: any) => {
        if (!unit.vehicle) return;
        if (filters?.locationId && unit.vehicle.location_id !== filters.locationId) return;
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
          fuelType: unit.category?.fuel_type,
          transmission: unit.category?.transmission,
          rentalCount,
          totalRentalDays,
          acquisitionCost,
          totalExpenses,
          totalRevenue,
          profit,
          profitMargin,
          acquisitionDate: unit.acquisition_date,
          expectedDisposalDate: unit.expected_disposal_date,
          depreciationMethod: unit.depreciation_method,
          annualDepreciation,
          currentValue,
          vendorName: unit.vendor_name,
          vendorContact: unit.vendor_contact,
        });
      });

      return analytics.sort((a, b) => b.rentalCount - a.rentalCount);
    },
  });
}
