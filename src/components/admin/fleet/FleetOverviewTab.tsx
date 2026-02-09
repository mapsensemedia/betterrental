/**
 * Fleet Overview Tab - Summary metrics, top/bottom performers, and lifecycle summary
 */
import { useState } from "react";
import { useFleetSummary, useFleetAnalytics } from "@/hooks/use-fleet-analytics";
import { useLocations } from "@/hooks/use-locations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LifecycleSummarySection } from "./LifecycleSummarySection";
import { 
  Car, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
} from "lucide-react";

export function FleetOverviewTab() {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const { data: locations } = useLocations();
  
  const filters = locationFilter !== "all" ? { locationId: locationFilter } : undefined;
  const { summary, isLoading } = useFleetSummary(filters);
  const { data: analytics } = useFleetAnalytics(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => 
    `$${value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.totalVehicles || 0}</p>
                <p className="text-xs text-muted-foreground">Total Units (individual vehicles)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Activity className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalCosts || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Costs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(summary?.totalProfit || 0) >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                {(summary?.totalProfit || 0) >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalProfit || 0)}</p>
                <p className="text-xs text-muted-foreground">Net Profit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top & Bottom Performers */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Top Performers
            </CardTitle>
            <CardDescription>Highest profit vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.topPerformers.map((vehicle, index) => (
                <div key={vehicle.vehicleId} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.rentalCount} rentals • {vehicle.totalRentalDays} days
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    {formatCurrency(vehicle.profit)}
                  </Badge>
                </div>
              ))}
              {!summary?.topPerformers.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Underperformers
            </CardTitle>
            <CardDescription>Lowest profit vehicles - review for optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.underperformers.map((vehicle, index) => (
                <div key={vehicle.vehicleId} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.rentalCount} rentals • {formatCurrency(vehicle.totalExpenses)} costs
                      </p>
                    </div>
                  </div>
                  <Badge variant={vehicle.profit >= 0 ? "secondary" : "destructive"}>
                    {formatCurrency(vehicle.profit)}
                  </Badge>
                </div>
              ))}
              {!summary?.underperformers.length && (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Summary Section */}
      <div className="pt-2">
        <h3 className="text-lg font-semibold mb-4">Lifecycle & Depreciation</h3>
        <LifecycleSummarySection />
      </div>
    </div>
  );
}
