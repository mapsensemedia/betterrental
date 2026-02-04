/**
 * Enhanced Fleet Analytics Hook
 * Adds fuel type, vendor, and lifecycle data for performance comparison
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

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
  // Fuel & Specs
  fuelType?: string;
  transmission?: string;
  // Utilization
  rentalCount: number;
  totalRentalDays: number;
  // Financials
  acquisitionCost: number;
  totalExpenses: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  // Lifecycle
  acquisitionDate?: string;
  expectedDisposalDate?: string;
  depreciationMethod?: string;
  annualDepreciation: number;
  currentValue: number;
  // Vendor
  vendorName?: string;
  vendorContact?: string;
}

export function useFleetAnalyticsEnhanced(filters?: {
  locationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["fleet-analytics-enhanced", filters],
    queryFn: async (): Promise<EnhancedVehicleAnalytics[]> => {
      // Get all vehicle units with their parent vehicles and categories
      const { data: units, error: unitsError } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          category:vehicle_categories(id, name, fuel_type, transmission),
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

      // Also get vehicles without units (fallback for legacy data)
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

      // Get completed bookings for revenue and utilization
      let bookingsQuery = supabase
        .from("bookings")
        .select("vehicle_id, assigned_unit_id, total_amount, total_days, status")
        .eq("status", "completed");

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

      const now = new Date();
      const analytics: EnhancedVehicleAnalytics[] = [];
      const processedVehicleIds = new Set<string>();

      // First process vehicle units (VIN-level tracking)
      (units || []).forEach((unit: any) => {
        if (!unit.vehicle) return;
        
        processedVehicleIds.add(unit.vehicle_id);
        
        // Filter by location/status if specified
        if (filters?.locationId && unit.vehicle.location_id !== filters.locationId) return;
        if (filters?.status && unit.status !== filters.status) return;
        
        // Get bookings assigned to this specific unit
        const unitBookings = bookings?.filter((b) => b.assigned_unit_id === unit.id) || [];
        const vehicleLevelBookings = bookings?.filter(
          (b) => b.vehicle_id === unit.vehicle_id && !b.assigned_unit_id
        ) || [];
        const allBookings = [...unitBookings, ...vehicleLevelBookings];
        
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
          // Fuel & Specs from category
          fuelType: unit.category?.fuel_type,
          transmission: unit.category?.transmission,
          // Utilization
          rentalCount,
          totalRentalDays,
          // Financials
          acquisitionCost,
          totalExpenses,
          totalRevenue,
          profit,
          profitMargin,
          // Lifecycle
          acquisitionDate: unit.acquisition_date,
          expectedDisposalDate: unit.expected_disposal_date,
          depreciationMethod: unit.depreciation_method,
          annualDepreciation,
          currentValue,
          // Vendor
          vendorName: unit.vendor_name,
          vendorContact: unit.vendor_contact,
        });
      });

      // Add vehicles without units (fallback)
      (vehicles || []).forEach((vehicle) => {
        if (processedVehicleIds.has(vehicle.id)) return;
        
        const vehicleBookings = bookings?.filter((b) => b.vehicle_id === vehicle.id) || [];
        
        const rentalCount = vehicleBookings.length;
        const totalRentalDays = vehicleBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);
        const totalRevenue = vehicleBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const profit = totalRevenue;
        const profitMargin = totalRevenue > 0 ? 100 : 0;

        analytics.push({
          vehicleId: vehicle.id,
          vehicleUnitId: undefined,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: undefined,
          licensePlate: undefined,
          status: vehicle.status || "available",
          dailyRate: vehicle.daily_rate,
          locationName: (vehicle.locations as any)?.name,
          fuelType: undefined,
          transmission: undefined,
          rentalCount,
          totalRentalDays,
          acquisitionCost: 0,
          totalExpenses: 0,
          totalRevenue,
          profit,
          profitMargin,
          acquisitionDate: undefined,
          expectedDisposalDate: undefined,
          depreciationMethod: undefined,
          annualDepreciation: 0,
          currentValue: 0,
          vendorName: undefined,
          vendorContact: undefined,
        });
      });

      return analytics.sort((a, b) => b.rentalCount - a.rentalCount);
    },
  });
}
