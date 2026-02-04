/**
 * Lifecycle Summary Section - Shows vehicles approaching disposal and depreciation status
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  TrendingDown,
  Car,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

interface LifecycleVehicle {
  id: string;
  vin: string;
  licensePlate: string | null;
  make: string;
  model: string;
  year: number;
  acquisitionDate: string | null;
  expectedDisposalDate: string | null;
  actualDisposalDate: string | null;
  acquisitionCost: number;
  currentValue: number;
  depreciationMethod: string | null;
  annualDepreciation: number;
  daysUntilDisposal: number | null;
  lifecycleProgress: number | null;
  status: string;
}

export function LifecycleSummarySection() {
  const { data: lifecycleData, isLoading } = useQuery({
    queryKey: ["fleet-lifecycle-summary"],
    queryFn: async (): Promise<{
      approachingDisposal: LifecycleVehicle[];
      recentlyDisposed: LifecycleVehicle[];
      depreciationSummary: {
        totalFleetValue: number;
        totalDepreciationThisYear: number;
        avgVehicleAge: number;
      };
    }> => {
      // Fetch all vehicle units with lifecycle data
      const { data: units, error } = await supabase
        .from("vehicle_units")
        .select(`
          *,
          vehicle:vehicles(id, make, model, year)
        `)
        .not("status", "eq", "disposed")
        .order("expected_disposal_date", { ascending: true, nullsFirst: false });

      if (error) throw error;

      const now = new Date();
      const ninetyDaysFromNow = addDays(now, 90);

      const vehicles: LifecycleVehicle[] = (units || []).map((unit: any) => {
        const acquisitionDate = unit.acquisition_date ? new Date(unit.acquisition_date) : null;
        const expectedDisposalDate = unit.expected_disposal_date ? new Date(unit.expected_disposal_date) : null;
        
        let daysUntilDisposal: number | null = null;
        let lifecycleProgress: number | null = null;

        if (expectedDisposalDate) {
          daysUntilDisposal = differenceInDays(expectedDisposalDate, now);
          
          if (acquisitionDate) {
            const totalDays = differenceInDays(expectedDisposalDate, acquisitionDate);
            const elapsedDays = differenceInDays(now, acquisitionDate);
            lifecycleProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
          }
        }

        // Calculate current value based on depreciation
        const acquisitionCost = unit.acquisition_cost || 0;
        const annualDepreciation = unit.annual_depreciation_amount || 0;
        let currentValue = acquisitionCost;
        
        if (acquisitionDate && annualDepreciation > 0) {
          const yearsOwned = differenceInDays(now, acquisitionDate) / 365.25;
          currentValue = Math.max(0, acquisitionCost - (annualDepreciation * yearsOwned));
        }

        return {
          id: unit.id,
          vin: unit.vin,
          licensePlate: unit.license_plate,
          make: unit.vehicle?.make || "Unknown",
          model: unit.vehicle?.model || "Unknown",
          year: unit.vehicle?.year || 0,
          acquisitionDate: unit.acquisition_date,
          expectedDisposalDate: unit.expected_disposal_date,
          actualDisposalDate: unit.actual_disposal_date,
          acquisitionCost,
          currentValue,
          depreciationMethod: unit.depreciation_method,
          annualDepreciation,
          daysUntilDisposal,
          lifecycleProgress,
          status: unit.status,
        };
      });

      // Vehicles approaching disposal (within 90 days)
      const approachingDisposal = vehicles
        .filter((v) => v.daysUntilDisposal !== null && v.daysUntilDisposal > 0 && v.daysUntilDisposal <= 90)
        .sort((a, b) => (a.daysUntilDisposal || 0) - (b.daysUntilDisposal || 0));

      // Recently disposed (past 30 days)
      const { data: disposedUnits } = await supabase
        .from("vehicle_units")
        .select(`*, vehicle:vehicles(id, make, model, year)`)
        .eq("status", "disposed")
        .gte("actual_disposal_date", format(addDays(now, -30), "yyyy-MM-dd"))
        .order("actual_disposal_date", { ascending: false });

      const recentlyDisposed = (disposedUnits || []).map((unit: any) => ({
        id: unit.id,
        vin: unit.vin,
        licensePlate: unit.license_plate,
        make: unit.vehicle?.make || "Unknown",
        model: unit.vehicle?.model || "Unknown",
        year: unit.vehicle?.year || 0,
        acquisitionDate: unit.acquisition_date,
        expectedDisposalDate: unit.expected_disposal_date,
        actualDisposalDate: unit.actual_disposal_date,
        acquisitionCost: unit.acquisition_cost || 0,
        currentValue: unit.disposal_value || 0,
        depreciationMethod: unit.depreciation_method,
        annualDepreciation: unit.annual_depreciation_amount || 0,
        daysUntilDisposal: null,
        lifecycleProgress: 100,
        status: unit.status,
      }));

      // Calculate summary stats
      const totalFleetValue = vehicles.reduce((sum, v) => sum + v.currentValue, 0);
      const totalDepreciationThisYear = vehicles.reduce((sum, v) => sum + v.annualDepreciation, 0);
      
      // Average vehicle age
      const vehiclesWithAge = vehicles.filter((v) => v.acquisitionDate);
      const avgVehicleAge = vehiclesWithAge.length > 0
        ? vehiclesWithAge.reduce((sum, v) => {
            return sum + differenceInDays(now, new Date(v.acquisitionDate!)) / 365.25;
          }, 0) / vehiclesWithAge.length
        : 0;

      return {
        approachingDisposal,
        recentlyDisposed,
        depreciationSummary: {
          totalFleetValue,
          totalDepreciationThisYear,
          avgVehicleAge,
        },
      };
    },
    staleTime: 60000,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { approachingDisposal, recentlyDisposed, depreciationSummary } = lifecycleData || {
    approachingDisposal: [],
    recentlyDisposed: [],
    depreciationSummary: { totalFleetValue: 0, totalDepreciationThisYear: 0, avgVehicleAge: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Depreciation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(depreciationSummary.totalFleetValue)}</p>
                <p className="text-xs text-muted-foreground">Total Fleet Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingDown className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(depreciationSummary.totalDepreciationThisYear)}</p>
                <p className="text-xs text-muted-foreground">Annual Depreciation</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{depreciationSummary.avgVehicleAge.toFixed(1)} yrs</p>
                <p className="text-xs text-muted-foreground">Avg Vehicle Age</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approaching Disposal & Recently Disposed */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Approaching Disposal
            </CardTitle>
            <CardDescription>Vehicles with disposal dates within 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {approachingDisposal.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No vehicles approaching disposal
              </p>
            ) : (
              <div className="space-y-3">
                {approachingDisposal.slice(0, 5).map((vehicle) => (
                  <div key={vehicle.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle.licensePlate || vehicle.vin.slice(-6)}
                        </p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          vehicle.daysUntilDisposal! <= 30 
                            ? "bg-destructive/10 text-destructive" 
                            : "bg-amber-500/10 text-amber-600"
                        }
                      >
                        {vehicle.daysUntilDisposal} days
                      </Badge>
                    </div>
                    {vehicle.lifecycleProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Lifecycle: {vehicle.lifecycleProgress.toFixed(0)}%</span>
                          <span>Value: {formatCurrency(vehicle.currentValue)}</span>
                        </div>
                        <Progress value={vehicle.lifecycleProgress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Recently Disposed
            </CardTitle>
            <CardDescription>Vehicles disposed in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentlyDisposed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent disposals
              </p>
            ) : (
              <div className="space-y-3">
                {recentlyDisposed.slice(0, 5).map((vehicle) => (
                  <div key={vehicle.id} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle.licensePlate || vehicle.vin.slice(-6)} • 
                          Disposed {vehicle.actualDisposalDate ? format(new Date(vehicle.actualDisposalDate), "MMM d") : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(vehicle.currentValue)}</p>
                        <p className="text-xs text-muted-foreground">Disposal Value</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
