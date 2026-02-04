/**
 * Vehicle Health Card - Unified expandable view with all vehicle metrics
 * Consolidates: utilization, costs, profit/loss, lifecycle data, and vendor info
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronUp,
  Car,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wrench,
  Calendar,
  Building2,
  Fuel,
  AlertTriangle,
  Eye,
  Clock,
  MapPin,
} from "lucide-react";
import { format, differenceInDays, differenceInMonths } from "date-fns";

export interface VehicleHealthData {
  vehicleUnitId: string;
  vin: string;
  licensePlate: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  categoryName: string | null;
  status: string;
  locationName: string | null;
  // Fuel/Specs
  fuelType: string | null;
  tankCapacityLiters: number | null;
  // Utilization
  rentalCount: number;
  totalRentalDays: number;
  avgRentalDuration: number;
  utilizationRate: number; // Percentage
  // Financials
  acquisitionCost: number;
  totalRentalRevenue: number;
  totalDamageCost: number;
  totalMaintenanceCost: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  costPerMile: number;
  // Lifecycle
  acquisitionDate: string | null;
  expectedDisposalDate: string | null;
  actualDisposalDate: string | null;
  disposalValue: number | null;
  depreciationMethod: string | null;
  annualDepreciation: number;
  currentValue: number;
  // Vendor
  vendorName: string | null;
  vendorContact: string | null;
  vendorNotes: string | null;
  // Mileage
  currentMileage: number | null;
  mileageAtAcquisition: number | null;
  totalMilesDriven: number;
  // Flags
  isUnderperforming: boolean;
  recommendation: string;
}

interface VehicleHealthCardProps {
  vehicle: VehicleHealthData;
  defaultExpanded?: boolean;
}

export function VehicleHealthCard({ vehicle, defaultExpanded = false }: VehicleHealthCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const navigate = useNavigate();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM d, yyyy");
  };

  const getDaysUntilDisposal = () => {
    if (!vehicle.expectedDisposalDate) return null;
    return differenceInDays(new Date(vehicle.expectedDisposalDate), new Date());
  };

  const getLifecycleProgress = () => {
    if (!vehicle.acquisitionDate || !vehicle.expectedDisposalDate) return null;
    const start = new Date(vehicle.acquisitionDate);
    const end = new Date(vehicle.expectedDisposalDate);
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const daysUntilDisposal = getDaysUntilDisposal();
  const lifecycleProgress = getLifecycleProgress();
  const isNearDisposal = daysUntilDisposal !== null && daysUntilDisposal <= 90 && daysUntilDisposal > 0;

  const statusColors: Record<string, string> = {
    available: "bg-green-500/10 text-green-600 border-green-500/30",
    on_rent: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    damage: "bg-destructive/10 text-destructive border-destructive/30",
    disposed: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <Card className={`transition-all ${vehicle.isUnderperforming ? "border-amber-500/50" : ""}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="pt-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-4">
              {/* Main Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {vehicle.isUnderperforming && (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">
                      {vehicle.vehicleYear} {vehicle.vehicleMake} {vehicle.vehicleModel}
                    </p>
                    <Badge variant="outline" className={statusColors[vehicle.status] || ""}>
                      {vehicle.status.replace("_", " ")}
                    </Badge>
                    {isNearDisposal && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                        {daysUntilDisposal}d to disposal
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {vehicle.vin} • {vehicle.licensePlate || "No plate"}
                    {vehicle.categoryName && ` • ${vehicle.categoryName}`}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Rentals</p>
                  <p className="font-medium text-sm">{vehicle.rentalCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-medium text-sm text-green-600">{formatCurrency(vehicle.totalRentalRevenue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <div className="flex items-center justify-end gap-1">
                    {vehicle.netProfit >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                    <p className={`font-medium text-sm ${vehicle.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(vehicle.netProfit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expand Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/fleet/vehicle/${vehicle.vehicleUnitId}`);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <Separator className="mb-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Utilization & Performance */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  Utilization & Performance
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Rentals</span>
                    <span className="font-medium">{vehicle.rentalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Days Rented</span>
                    <span className="font-medium">{vehicle.totalRentalDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Duration</span>
                    <span className="font-medium">{vehicle.avgRentalDuration.toFixed(1)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization Rate</span>
                    <span className="font-medium">{vehicle.utilizationRate.toFixed(0)}%</span>
                  </div>
                  {vehicle.fuelType && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Fuel className="w-3 h-3" /> Fuel Type
                      </span>
                      <Badge variant="outline">{vehicle.fuelType}</Badge>
                    </div>
                  )}
                  {vehicle.currentMileage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Mileage</span>
                      <span className="font-medium">{vehicle.currentMileage.toLocaleString()} mi</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Financial Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acquisition Cost</span>
                    <span className="font-medium">{formatCurrency(vehicle.acquisitionCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-medium text-green-600">{formatCurrency(vehicle.totalRentalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage Costs</span>
                    <span className="font-medium text-destructive">
                      {vehicle.totalDamageCost > 0 ? formatCurrency(vehicle.totalDamageCost) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance Costs</span>
                    <span className="font-medium text-amber-600">
                      {vehicle.totalMaintenanceCost > 0 ? formatCurrency(vehicle.totalMaintenanceCost) : "—"}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Profit</span>
                    <span className={`font-semibold ${vehicle.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(vehicle.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Margin</span>
                    <Badge variant={vehicle.profitMargin >= 20 ? "default" : "secondary"}>
                      {vehicle.profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost/Mile</span>
                    <span className="font-medium">${vehicle.costPerMile.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Lifecycle & Vendor */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Lifecycle & Vendor
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acquired</span>
                    <span className="font-medium">{formatDate(vehicle.acquisitionDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disposal Target</span>
                    <span className={`font-medium ${isNearDisposal ? "text-amber-600" : ""}`}>
                      {formatDate(vehicle.expectedDisposalDate)}
                    </span>
                  </div>
                  {lifecycleProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Lifecycle Progress</span>
                        <span>{lifecycleProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={lifecycleProgress} className="h-1.5" />
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depreciation</span>
                    <span className="font-medium">
                      {vehicle.depreciationMethod || "N/A"}
                      {vehicle.annualDepreciation > 0 && ` (${formatCurrency(vehicle.annualDepreciation)}/yr)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Value</span>
                    <span className="font-medium">{formatCurrency(vehicle.currentValue)}</span>
                  </div>
                  <Separator className="my-1" />
                  {vehicle.vendorName ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Vendor
                        </span>
                        <span className="font-medium">{vehicle.vendorName}</span>
                      </div>
                      {vehicle.vendorContact && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contact</span>
                          <span className="font-medium text-xs">{vehicle.vendorContact}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground text-xs">No vendor info</div>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {vehicle.recommendation && vehicle.recommendation !== "Vehicle performing well" && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Recommendation:</span> {vehicle.recommendation}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
