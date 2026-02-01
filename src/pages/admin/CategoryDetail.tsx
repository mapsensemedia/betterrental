/**
 * Category Detail Page
 * Shows all vehicles in a category with aggregated metrics
 */
import { useParams, useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicleCategoryWithUnits } from "@/hooks/use-vehicle-categories";
import { useFleetCostAnalysisByVehicle } from "@/hooks/use-fleet-cost-analysis";
import { format } from "date-fns";
import {
  ArrowLeft,
  Car,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";

export default function CategoryDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const { data: category, isLoading } = useVehicleCategoryWithUnits(categoryId || null);
  const { data: allMetrics } = useFleetCostAnalysisByVehicle({ categoryId });

  const categoryMetrics = allMetrics?.filter((v) => v.categoryId === categoryId) || [];

  // Calculate aggregated metrics
  const aggregated = {
    totalAcquisition: categoryMetrics.reduce((sum, v) => sum + v.acquisitionCost, 0),
    totalRevenue: categoryMetrics.reduce((sum, v) => sum + v.totalRentalRevenue, 0),
    totalDamage: categoryMetrics.reduce((sum, v) => sum + v.totalDamageCost, 0),
    totalMaintenance: categoryMetrics.reduce((sum, v) => sum + v.totalMaintenanceCost, 0),
    totalProfit: categoryMetrics.reduce((sum, v) => sum + v.netProfit, 0),
    totalRentals: categoryMetrics.reduce((sum, v) => sum + v.rentalCount, 0),
    underperforming: categoryMetrics.filter((v) => v.isUnderperforming).length,
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const handleExportCSV = () => {
    if (!categoryMetrics.length || !category) return;

    const headers = ["VIN", "Plate", "Vehicle", "Acquisition", "Revenue", "Damage", "Maintenance", "Net Profit"];
    const rows = categoryMetrics.map((v) => [
      v.vin,
      v.licensePlate || "",
      `${v.vehicleYear} ${v.vehicleMake} ${v.vehicleModel}`,
      v.acquisitionCost,
      v.totalRentalRevenue,
      v.totalDamageCost,
      v.totalMaintenanceCost,
      v.netProfit,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `category-${category.name.replace(/\s+/g, "-")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminShell>
    );
  }

  if (!category) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">Category not found</h2>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Car className="w-3 h-3 mr-1" />
              {categoryMetrics.length} vehicles
            </Badge>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(aggregated.totalAcquisition)}</p>
                  <p className="text-xs text-muted-foreground">Total Acquisition</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(aggregated.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${aggregated.totalProfit >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                  {aggregated.totalProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className={`text-2xl font-bold ${aggregated.totalProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(aggregated.totalProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{aggregated.underperforming}</p>
                  <p className="text-xs text-muted-foreground">Underperforming</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vehicles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicles in Category</CardTitle>
            <CardDescription>
              {aggregated.totalRentals} total rentals across all vehicles
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Acquisition</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Costs</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Rentals</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryMetrics.map((v) => (
                  <TableRow 
                    key={v.vehicleUnitId}
                    className={v.isUnderperforming ? "bg-destructive/5" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {v.isUnderperforming && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>{v.recommendation}</TooltipContent>
                          </Tooltip>
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {v.vehicleYear} {v.vehicleMake} {v.vehicleModel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.vin}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(v.acquisitionCost)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(v.totalRentalRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {formatCurrency(v.totalExpenses)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={v.netProfit >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {formatCurrency(v.netProfit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{v.rentalCount}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/fleet/vehicle/${v.vehicleUnitId}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View details</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!categoryMetrics.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No vehicles in this category
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
