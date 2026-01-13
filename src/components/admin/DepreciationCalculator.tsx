import { useState, useMemo } from "react";
import { format, differenceInMonths } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calculator,
  TrendingDown,
  Car,
  DollarSign,
  Gauge,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useVehicleUnits, VehicleUnit } from "@/hooks/use-vehicle-units";

interface DepreciationCalculatorProps {
  open: boolean;
  onClose: () => void;
}

// Depreciation calculation methods
type DepreciationMethod = "straight-line" | "declining-balance" | "mileage-based";

interface DepreciationResult {
  unit: VehicleUnit;
  acquisitionCost: number;
  totalExpenses: number;
  ageMonths: number;
  milesDriven: number;
  depreciatedValue: number;
  estimatedMarketValue: number;
  netPosition: number; // positive = gain, negative = loss
  depreciationPercent: number;
}

export function DepreciationCalculator({ open, onClose }: DepreciationCalculatorProps) {
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod>("declining-balance");
  const [annualDepreciationRate, setAnnualDepreciationRate] = useState(15); // % per year
  const [mileageDepreciationRate, setMileageDepreciationRate] = useState(0.1); // $ per mile
  const [residualValuePercent, setResidualValuePercent] = useState(20); // % of original value

  const { data: units, isLoading } = useVehicleUnits({});

  // Calculate depreciation for all vehicles
  const depreciationResults = useMemo(() => {
    if (!units) return [];

    return units
      .filter((unit) => unit.status === "active" && unit.acquisition_cost > 0)
      .map((unit) => {
        const acquisitionCost = Number(unit.acquisition_cost);
        const totalExpenses = unit.total_expenses || 0;
        
        // Calculate age in months
        const acquisitionDate = unit.acquisition_date 
          ? new Date(unit.acquisition_date) 
          : new Date(unit.created_at);
        const ageMonths = differenceInMonths(new Date(), acquisitionDate);
        
        // Calculate miles driven
        const startMileage = unit.mileage_at_acquisition || 0;
        const currentMileage = unit.current_mileage || startMileage;
        const milesDriven = Math.max(0, currentMileage - startMileage);

        // Calculate depreciated value based on method
        let depreciatedValue: number;
        const residualValue = acquisitionCost * (residualValuePercent / 100);

        switch (depreciationMethod) {
          case "straight-line": {
            // Assumes 5-year useful life
            const monthlyDepreciation = (acquisitionCost - residualValue) / 60;
            depreciatedValue = Math.max(
              residualValue,
              acquisitionCost - (monthlyDepreciation * ageMonths)
            );
            break;
          }
          case "declining-balance": {
            // Compound depreciation
            const monthlyRate = annualDepreciationRate / 100 / 12;
            depreciatedValue = Math.max(
              residualValue,
              acquisitionCost * Math.pow(1 - monthlyRate, ageMonths)
            );
            break;
          }
          case "mileage-based": {
            depreciatedValue = Math.max(
              residualValue,
              acquisitionCost - (milesDriven * mileageDepreciationRate)
            );
            break;
          }
          default:
            depreciatedValue = acquisitionCost;
        }

        // Estimated market value (depreciated value minus invested expenses that don't add value)
        // We assume maintenance/gas don't add resale value, but some repairs might
        const valueAddingExpenses = totalExpenses * 0.1; // Assume 10% of expenses add value
        const estimatedMarketValue = depreciatedValue + valueAddingExpenses;

        // Net position = what you'd get if you sold - what you've invested
        const totalInvestment = acquisitionCost + totalExpenses;
        const netPosition = estimatedMarketValue - totalInvestment;

        const depreciationPercent = ((acquisitionCost - depreciatedValue) / acquisitionCost) * 100;

        return {
          unit,
          acquisitionCost,
          totalExpenses,
          ageMonths,
          milesDriven,
          depreciatedValue,
          estimatedMarketValue,
          netPosition,
          depreciationPercent,
        };
      })
      .sort((a, b) => b.netPosition - a.netPosition); // Sort by best to worst position
  }, [units, depreciationMethod, annualDepreciationRate, mileageDepreciationRate, residualValuePercent]);

  // Fleet-wide summary
  const fleetSummary = useMemo(() => {
    if (!depreciationResults.length) return null;

    const totalAcquisition = depreciationResults.reduce((sum, r) => sum + r.acquisitionCost, 0);
    const totalExpenses = depreciationResults.reduce((sum, r) => sum + r.totalExpenses, 0);
    const totalInvestment = totalAcquisition + totalExpenses;
    const totalMarketValue = depreciationResults.reduce((sum, r) => sum + r.estimatedMarketValue, 0);
    const totalNetPosition = totalMarketValue - totalInvestment;
    const avgDepreciation = depreciationResults.reduce((sum, r) => sum + r.depreciationPercent, 0) / depreciationResults.length;

    return {
      totalAcquisition,
      totalExpenses,
      totalInvestment,
      totalMarketValue,
      totalNetPosition,
      avgDepreciation,
      vehicleCount: depreciationResults.length,
    };
  }, [depreciationResults]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Fleet Depreciation Calculator
          </SheetTitle>
          <SheetDescription>
            Estimate current vehicle values based on age, mileage, and investment
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Depreciation Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Depreciation Settings</CardTitle>
              <CardDescription>Adjust calculation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Depreciation Method</Label>
                <Select
                  value={depreciationMethod}
                  onValueChange={(v: DepreciationMethod) => setDepreciationMethod(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight-line">Straight-Line (5 years)</SelectItem>
                    <SelectItem value="declining-balance">Declining Balance</SelectItem>
                    <SelectItem value="mileage-based">Mileage-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {depreciationMethod === "declining-balance" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Annual Depreciation Rate</Label>
                    <span className="text-sm font-medium">{annualDepreciationRate}%</span>
                  </div>
                  <Slider
                    value={[annualDepreciationRate]}
                    onValueChange={([v]) => setAnnualDepreciationRate(v)}
                    min={5}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: 15-20% for rental vehicles
                  </p>
                </div>
              )}

              {depreciationMethod === "mileage-based" && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Depreciation per Mile</Label>
                    <span className="text-sm font-medium">${mileageDepreciationRate.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[mileageDepreciationRate * 100]}
                    onValueChange={([v]) => setMileageDepreciationRate(v / 100)}
                    min={5}
                    max={25}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Typical range: $0.08-$0.15 per mile
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Minimum Residual Value</Label>
                  <span className="text-sm font-medium">{residualValuePercent}%</span>
                </div>
                <Slider
                  value={[residualValuePercent]}
                  onValueChange={([v]) => setResidualValuePercent(v)}
                  min={10}
                  max={40}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum value as percentage of acquisition cost
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fleet Summary */}
          {fleetSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Fleet Investment</p>
                  <p className="text-lg font-bold">
                    ${fleetSummary.totalInvestment.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Est. Market Value</p>
                  <p className="text-lg font-bold text-primary">
                    ${fleetSummary.totalMarketValue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Net Position</p>
                  <p className={`text-lg font-bold ${fleetSummary.totalNetPosition >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {fleetSummary.totalNetPosition >= 0 ? "+" : ""}
                    ${fleetSummary.totalNetPosition.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Avg. Depreciation</p>
                  <p className="text-lg font-bold text-orange-600">
                    {fleetSummary.avgDepreciation.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Vehicle Depreciation Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Vehicle Valuations</CardTitle>
              <CardDescription>
                Sorted by net position (best to worst)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !depreciationResults.length ? (
                <div className="p-8 text-center">
                  <Car className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No active vehicles with acquisition cost found
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead className="text-right">Investment</TableHead>
                      <TableHead className="text-right">Est. Value</TableHead>
                      <TableHead className="text-right">Net Position</TableHead>
                      <TableHead className="text-right">Depreciation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciationResults.map((result) => (
                      <TableRow key={result.unit.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {result.unit.vehicle?.make} {result.unit.vehicle?.model}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {result.unit.vin.slice(-8)}
                            </p>
                            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {result.ageMonths} mo
                              </span>
                              {result.milesDriven > 0 && (
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3 h-3" />
                                  {result.milesDriven.toLocaleString()} mi
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-medium">
                              ${(result.acquisitionCost + result.totalExpenses).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              +${result.totalExpenses.toLocaleString()} expenses
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium text-primary">
                            ${result.estimatedMarketValue.toLocaleString()}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <p className={`font-bold ${result.netPosition >= 0 ? "text-green-600" : "text-destructive"}`}>
                              {result.netPosition >= 0 ? "+" : ""}
                              ${result.netPosition.toLocaleString()}
                            </p>
                            {result.netPosition < -5000 && (
                              <AlertTriangle className="w-4 h-4 text-warning" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={result.depreciationPercent > 40 ? "destructive" : "secondary"}>
                            <TrendingDown className="w-3 h-3 mr-1" />
                            {result.depreciationPercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center px-4">
            Depreciation estimates are for planning purposes only. Actual resale values may vary based on market conditions, vehicle condition, and other factors.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
