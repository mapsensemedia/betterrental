/**
 * Fleet Cost Analysis Hook
 * Calculates net profit per VIN and category with complete metrics
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleUnitMetrics {
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

export interface CategoryMetrics {
  categoryId: string;
  categoryName: string;
  description: string | null;
  vehicleCount: number;
  // Aggregated costs
  totalAcquisitionCost: number;
  totalDamageCost: number;
  totalMaintenanceCost: number;
  totalExpenses: number;
  // Aggregated revenue
  totalRentalRevenue: number;
  totalRentalCount: number;
  totalRentalDays: number;
  // Profit
  totalNetProfit: number;
  avgProfitPerVehicle: number;
  avgMargin: number;
}

export interface FleetCostFilters {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  locationId?: string;
  status?: string;
}

export function useFleetCostAnalysisByVehicle(filters?: FleetCostFilters) {
  return useQuery({
    queryKey: ["fleet-cost-analysis", "by-vehicle", filters],
    queryFn: async (): Promise<VehicleUnitMetrics[]> => {
      // Fetch vehicle units with categories
      let unitsQuery = supabase
        .from("vehicle_units")
        .select(`
          *,
          category:vehicle_categories(id, name),
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

      const unitIds = units.map((u) => u.id);

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
      let damagesQuery = supabase
        .from("damage_reports")
        .select("vehicle_unit_id, estimated_cost");

      const { data: damages } = await damagesQuery;

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

      // Fetch vehicle expenses (other costs)
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

      // Calculate metrics per unit
      return units.map((unit: any): VehicleUnitMetrics => {
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

        // Net profit = revenue - acquisition - all costs
        const netProfit = totalRentalRevenue - acquisitionCost - totalExpenses;
        const profitMargin = totalRentalRevenue > 0 ? (netProfit / totalRentalRevenue) * 100 : 0;

        // Mileage calculations
        const mileageAtAcquisition = unit.mileage_at_acquisition || 0;
        const currentMileage = unit.current_mileage || mileageAtAcquisition;
        const totalMilesDriven = currentMileage - mileageAtAcquisition;
        const costPerMile = totalMilesDriven > 0 ? (acquisitionCost + totalExpenses) / totalMilesDriven : 0;
        const revenuePerMile = totalMilesDriven > 0 ? totalRentalRevenue / totalMilesDriven : 0;

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
          acquisitionCost,
          totalDamageCost,
          totalMaintenanceCost,
          totalExpenses,
          totalRentalRevenue,
          rentalCount,
          totalRentalDays,
          avgRentalDuration,
          netProfit,
          profitMargin,
          mileageAtAcquisition: unit.mileage_at_acquisition,
          currentMileage: unit.current_mileage,
          totalMilesDriven,
          costPerMile,
          revenuePerMile,
          isUnderperforming,
          recommendation,
        };
      }).sort((a, b) => b.netProfit - a.netProfit);
    },
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useFleetCostAnalysisByCategory(filters?: FleetCostFilters) {
  const { data: vehicleMetrics } = useFleetCostAnalysisByVehicle(filters);

  return useQuery({
    queryKey: ["fleet-cost-analysis", "by-category", filters, vehicleMetrics],
    queryFn: async (): Promise<CategoryMetrics[]> => {
      // Get all categories
      const { data: categories, error } = await supabase
        .from("vehicle_categories")
        .select("id, name, description")
        .order("name");

      if (error) throw error;

      if (!categories?.length || !vehicleMetrics?.length) return [];

      // Aggregate metrics per category
      return categories.map((cat): CategoryMetrics => {
        const categoryVehicles = vehicleMetrics.filter((v) => v.categoryId === cat.id);

        const totalAcquisitionCost = categoryVehicles.reduce((sum, v) => sum + v.acquisitionCost, 0);
        const totalDamageCost = categoryVehicles.reduce((sum, v) => sum + v.totalDamageCost, 0);
        const totalMaintenanceCost = categoryVehicles.reduce((sum, v) => sum + v.totalMaintenanceCost, 0);
        const totalExpenses = categoryVehicles.reduce((sum, v) => sum + v.totalExpenses, 0);
        const totalRentalRevenue = categoryVehicles.reduce((sum, v) => sum + v.totalRentalRevenue, 0);
        const totalRentalCount = categoryVehicles.reduce((sum, v) => sum + v.rentalCount, 0);
        const totalRentalDays = categoryVehicles.reduce((sum, v) => sum + v.totalRentalDays, 0);
        const totalNetProfit = categoryVehicles.reduce((sum, v) => sum + v.netProfit, 0);

        const vehicleCount = categoryVehicles.length;
        const avgProfitPerVehicle = vehicleCount > 0 ? totalNetProfit / vehicleCount : 0;
        const avgMargin = totalRentalRevenue > 0 ? (totalNetProfit / totalRentalRevenue) * 100 : 0;

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          description: cat.description,
          vehicleCount,
          totalAcquisitionCost,
          totalDamageCost,
          totalMaintenanceCost,
          totalExpenses,
          totalRentalRevenue,
          totalRentalCount,
          totalRentalDays,
          totalNetProfit,
          avgProfitPerVehicle,
          avgMargin,
        };
      }).filter((c) => c.vehicleCount > 0);
    },
    enabled: !!vehicleMetrics,
  });
}

export function useVehicleUnitCostTimeline(vehicleUnitId: string | null) {
  return useQuery({
    queryKey: ["vehicle-cost-timeline", vehicleUnitId],
    queryFn: async () => {
      if (!vehicleUnitId) return [];

      // Get all events for timeline
      const [bookingsRes, damagesRes, maintenanceRes, expensesRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, booking_code, total_amount, start_at, end_at, status")
          .eq("assigned_unit_id", vehicleUnitId)
          .order("start_at", { ascending: false }),
        supabase
          .from("damage_reports")
          .select("id, description, estimated_cost, created_at, status")
          .eq("vehicle_unit_id", vehicleUnitId)
          .order("created_at", { ascending: false }),
        supabase
          .from("maintenance_logs")
          .select("id, maintenance_type, description, cost, service_date")
          .eq("vehicle_unit_id", vehicleUnitId)
          .order("service_date", { ascending: false }),
        supabase
          .from("vehicle_expenses")
          .select("id, expense_type, description, amount, expense_date")
          .eq("vehicle_unit_id", vehicleUnitId)
          .order("expense_date", { ascending: false }),
      ]);

      const timeline: Array<{
        id: string;
        type: "revenue" | "damage" | "maintenance" | "expense";
        date: string;
        description: string;
        amount: number;
        isPositive: boolean;
      }> = [];

      // Add bookings as revenue events
      (bookingsRes.data || []).forEach((b: any) => {
        timeline.push({
          id: b.id,
          type: "revenue",
          date: b.end_at || b.start_at,
          description: `Booking ${b.booking_code} (${b.status})`,
          amount: Number(b.total_amount || 0),
          isPositive: true,
        });
      });

      // Add damages as cost events
      (damagesRes.data || []).forEach((d: any) => {
        timeline.push({
          id: d.id,
          type: "damage",
          date: d.created_at,
          description: d.description || "Damage report",
          amount: Number(d.estimated_cost || 0),
          isPositive: false,
        });
      });

      // Add maintenance as cost events
      (maintenanceRes.data || []).forEach((m: any) => {
        timeline.push({
          id: m.id,
          type: "maintenance",
          date: m.service_date,
          description: `${m.maintenance_type}: ${m.description || "Maintenance"}`,
          amount: Number(m.cost || 0),
          isPositive: false,
        });
      });

      // Add other expenses
      (expensesRes.data || []).forEach((e: any) => {
        timeline.push({
          id: e.id,
          type: "expense",
          date: e.expense_date,
          description: `${e.expense_type}: ${e.description || "Expense"}`,
          amount: Number(e.amount || 0),
          isPositive: false,
        });
      });

      // Sort by date descending
      return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!vehicleUnitId,
  });
}
