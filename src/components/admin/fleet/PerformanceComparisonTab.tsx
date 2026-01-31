/**
 * Performance Comparison Tab - Compare selected vehicles side by side
 */
import { useState } from "react";
import { useFleetAnalytics } from "@/hooks/use-fleet-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { GitCompare, X, TrendingUp, TrendingDown } from "lucide-react";

export function PerformanceComparisonTab() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: analytics, isLoading } = useFleetAnalytics();

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-5) // Max 5
    );
  };

  const selectedVehicles = analytics?.filter((v) => selectedIds.includes(v.vehicleId)) || [];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Vehicle Selection */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Select Vehicles</CardTitle>
          <CardDescription>Choose up to 5 vehicles to compare</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
          {analytics?.map((vehicle) => (
            <div
              key={vehicle.vehicleId}
              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                selectedIds.includes(vehicle.vehicleId) ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
              }`}
              onClick={() => toggleSelection(vehicle.vehicleId)}
            >
              <Checkbox
                checked={selectedIds.includes(vehicle.vehicleId)}
                onCheckedChange={() => toggleSelection(vehicle.vehicleId)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {vehicle.rentalCount} rentals • {formatCurrency(vehicle.totalRevenue)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Comparison View */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Comparison
            </CardTitle>
            {selectedIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedVehicles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Select vehicles to compare performance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Metric</th>
                    {selectedVehicles.map((v) => (
                      <th key={v.vehicleId} className="text-right py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium truncate max-w-[100px]">
                            {v.make} {v.model}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => toggleSelection(v.vehicleId)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Daily Rate</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2 font-medium">
                        {formatCurrency(v.dailyRate)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Total Rentals</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2 font-medium">
                        {v.rentalCount}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Total Days Rented</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2">
                        {v.totalRentalDays} days
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Revenue</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2 font-medium text-green-600">
                        {formatCurrency(v.totalRevenue)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Expenses</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2 text-amber-600">
                        {formatCurrency(v.totalExpenses)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Profit/Loss</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          {v.profit >= 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          )}
                          <span className={v.profit >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                            {formatCurrency(v.profit)}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Profit Margin</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2">
                        <Badge variant={v.profitMargin >= 20 ? "default" : "secondary"}>
                          {v.profitMargin.toFixed(1)}%
                        </Badge>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2 text-muted-foreground">Acquisition Cost</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2">
                        {formatCurrency(v.acquisitionCost)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-2 text-muted-foreground">Current Value</td>
                    {selectedVehicles.map((v) => (
                      <td key={v.vehicleId} className="text-right py-2 px-2">
                        {formatCurrency(v.currentValue)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
