/**
 * Enhanced Fleet Cost Analysis Hook
 * Adds fuel type, vendor info, and lifecycle data to vehicle metrics
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface EnhancedVehicleUnitMetrics {
  vehicleUnitId: string;
  vin: string;
  licensePlate: string | null;
  categoryId: string | null;
  categoryName: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  status: string;
  locationName: string | null;
  // Fuel & Specs (from category)
  fuelType: string | null;
  transmission: string | null;
  tankCapacityLiters: number | null;
  // Vendor Info
  vendorName: string | null;
  vendorContact: string | null;
  vendorNotes: string | null;
  // Lifecycle
  acquisitionDate: string | null;
  expectedDisposalDate: string | null;
  actualDisposalDate: string | null;
  disposalValue: number | null;
  depreciationMethod: string | null;
  annualDepreciation: number;
  currentValue: number;
  daysUntilDisposal: number | null;
  lifecycleProgress: number | null;
  // Costs
  acquisitionCost: number;
  totalDamageCost: number;
  totalMaintenanceCost: number;
  totalExpenses: number;
  // Revenue
  totalRentalRevenue: number;
  rentalCount: number;
  totalRentalDays: number;
  avgRentalDuration: number;
  // Profit
  netProfit: number;
  profitMargin: number;
  // Mileage
  mileageAtAcquisition: number | null;
  currentMileage: number | null;
  totalMilesDriven: number;
  costPerMile: number;
  revenuePerMile: number;
  // Flags
  isUnderperforming: boolean;
  recommendation: string;
}

export interface FleetCostFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  locationId?: string;
  status?: string;
}

export function useFleetCostAnalysisEnhanced(filters?: FleetCostFilters) {
  return useQuery({
    queryKey: ["fleet-cost-analysis-enhanced", filters],
    queryFn: async (): Promise<EnhancedVehicleUnitMetrics[]> => {
      // Fetch vehicle units with categories (including fuel_type)
      let unitsQuery = supabase
        .from("vehicle_units")
        .select(`
          *,
          category:vehicle_categories(id, name, fuel_type, transmission),
          vehicle:vehicles(
            id, make, model, year, daily_rate, status,
            location:locations(name)
          )
        `);

      if (filters?.categoryId) {
        unitsQuery = unitsQuery.eq("category_id", filters.categoryId);
      }
      if (filters?.status) {
        unitsQuery = unitsQuery.eq("status", filters.status);
      }

      const { data: units, error: unitsError } = await unitsQuery;
      if (unitsError) throw unitsError;

      if (!units?.length) return [];

      // Fetch bookings for revenue calculation
      let bookingsQuery = supabase
        .from("bookings")
        .select("assigned_unit_id, vehicle_id, total_amount, subtotal, total_days, status, start_at, end_at")
        .in("status", ["completed", "active"]);

      if (filters?.dateFrom) {
        bookingsQuery = bookingsQuery.gte("start_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        bookingsQuery = bookingsQuery.lte("end_at", filters.dateTo);
      }

      const { data: bookings } = await bookingsQuery;

      // Fetch damage reports
      const { data: damages } = await supabase
        .from("damage_reports")
        .select("vehicle_unit_id, estimated_cost");

      // Fetch maintenance logs
      let maintenanceQuery = supabase
        .from("maintenance_logs")
        .select("vehicle_unit_id, cost, service_date");

      if (filters?.dateFrom) {
        maintenanceQuery = maintenanceQuery.gte("service_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        maintenanceQuery = maintenanceQuery.lte("service_date", filters.dateTo);
      }

      const { data: maintenanceLogs } = await maintenanceQuery;

      // Fetch vehicle expenses
      let expensesQuery = supabase
        .from("vehicle_expenses")
        .select("vehicle_unit_id, amount, expense_date");

      if (filters?.dateFrom) {
        expensesQuery = expensesQuery.gte("expense_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        expensesQuery = expensesQuery.lte("expense_date", filters.dateTo);
      }

      const { data: expenses } = await expensesQuery;

      const now = new Date();

      // Calculate metrics per unit
      return units.map((unit: any): EnhancedVehicleUnitMetrics => {
        const vehicle = unit.vehicle;
        const category = unit.category;

        // Revenue from bookings assigned to this unit
        const unitBookings = (bookings || []).filter(
          (b) => b.assigned_unit_id === unit.id || 
                 (b.vehicle_id === vehicle?.id && !b.assigned_unit_id)
        );
        const totalRentalRevenue = unitBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
        const rentalCount = unitBookings.length;
        const totalRentalDays = unitBookings.reduce((sum, b) => sum + (b.total_days || 0), 0);
        const avgRentalDuration = rentalCount > 0 ? totalRentalDays / rentalCount : 0;

        // Damage costs
        const unitDamages = (damages || []).filter((d) => d.vehicle_unit_id === unit.id);
        const totalDamageCost = unitDamages.reduce((sum, d) => sum + Number(d.estimated_cost || 0), 0);

        // Maintenance costs
        const unitMaintenance = (maintenanceLogs || []).filter((m) => m.vehicle_unit_id === unit.id);
        const totalMaintenanceCost = unitMaintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);

        // Other expenses
        const unitExpenses = (expenses || []).filter((e) => e.vehicle_unit_id === unit.id);
        const otherExpenses = unitExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const totalExpenses = totalDamageCost + totalMaintenanceCost + otherExpenses;
        const acquisitionCost = Number(unit.acquisition_cost || 0);

        // Net profit
        const netProfit = totalRentalRevenue - acquisitionCost - totalExpenses;
        const profitMargin = totalRentalRevenue > 0 ? (netProfit / totalRentalRevenue) * 100 : 0;

        // Mileage calculations
        const mileageAtAcquisition = unit.mileage_at_acquisition || 0;
        const currentMileage = unit.current_mileage || mileageAtAcquisition;
        const totalMilesDriven = currentMileage - mileageAtAcquisition;
        const costPerMile = totalMilesDriven > 0 ? (acquisitionCost + totalExpenses) / totalMilesDriven : 0;
        const revenuePerMile = totalMilesDriven > 0 ? totalRentalRevenue / totalMilesDriven : 0;

        // Lifecycle calculations
        const acquisitionDate = unit.acquisition_date ? new Date(unit.acquisition_date) : null;
        const expectedDisposalDate = unit.expected_disposal_date ? new Date(unit.expected_disposal_date) : null;
        
        let daysUntilDisposal: number | null = null;
        let lifecycleProgress: number | null = null;

        if (expectedDisposalDate) {
          daysUntilDisposal = differenceInDays(expectedDisposalDate, now);
          
          if (acquisitionDate) {
            const totalDays = differenceInDays(expectedDisposalDate, acquisitionDate);
            const elapsedDays = differenceInDays(now, acquisitionDate);
            lifecycleProgress = totalDays > 0 ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) : null;
          }
        }

        // Calculate current value based on depreciation
        const annualDepreciation = unit.annual_depreciation_amount || 0;
        let currentValue = acquisitionCost;
        
        if (acquisitionDate && annualDepreciation > 0) {
          const yearsOwned = differenceInDays(now, acquisitionDate) / 365.25;
          currentValue = Math.max(0, acquisitionCost - (annualDepreciation * yearsOwned));
        }

        // Determine if underperforming
        const isUnderperforming = netProfit < 0 || (rentalCount === 0 && acquisitionCost > 0);

        // Generate recommendation
        let recommendation = "Vehicle performing well";
        if (netProfit < -5000) {
          recommendation = "Consider retiring this vehicle - significant losses";
        } else if (netProfit < 0) {
          recommendation = "Review pricing strategy - currently unprofitable";
        } else if (rentalCount === 0 && acquisitionCost > 0) {
          recommendation = "No rentals recorded - promote or reduce pricing";
        } else if (profitMargin < 10) {
          recommendation = "Low margin - consider price adjustment";
        } else if (profitMargin > 50) {
          recommendation = "High performer - consider premium positioning";
        }

        return {
          vehicleUnitId: unit.id,
          vin: unit.vin,
          licensePlate: unit.license_plate,
          categoryId: category?.id || null,
          categoryName: category?.name || null,
          vehicleMake: vehicle?.make || "Unknown",
          vehicleModel: vehicle?.model || "Unknown",
          vehicleYear: vehicle?.year || 0,
          status: unit.status || "active",
          locationName: vehicle?.location?.name || null,
          // Fuel & Specs
          fuelType: category?.fuel_type || null,
          transmission: category?.transmission || null,
          tankCapacityLiters: unit.tank_capacity_liters,
          // Vendor
          vendorName: unit.vendor_name,
          vendorContact: unit.vendor_contact,
          vendorNotes: unit.vendor_notes,
          // Lifecycle
          acquisitionDate: unit.acquisition_date,
          expectedDisposalDate: unit.expected_disposal_date,
          actualDisposalDate: unit.actual_disposal_date,
          disposalValue: unit.disposal_value,
          depreciationMethod: unit.depreciation_method,
          annualDepreciation,
          currentValue,
          daysUntilDisposal,
          lifecycleProgress,
          // Costs
          acquisitionCost,
          totalDamageCost,
          totalMaintenanceCost,
          totalExpenses,
          // Revenue
          totalRentalRevenue,
          rentalCount,
          totalRentalDays,
          avgRentalDuration,
          // Profit
          netProfit,
          profitMargin,
          // Mileage
          mileageAtAcquisition: unit.mileage_at_acquisition,
          currentMileage: unit.current_mileage,
          totalMilesDriven,
          costPerMile,
          revenuePerMile,
          // Flags
          isUnderperforming,
          recommendation,
        };
      }).sort((a, b) => b.netProfit - a.netProfit);
    },
    staleTime: 60000,
  });
}
