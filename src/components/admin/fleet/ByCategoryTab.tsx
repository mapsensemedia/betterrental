/**
 * Fleet Cost Analysis - By Category Tab
 * Shows aggregated metrics per category
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleetCostAnalysisByCategory, FleetCostFilters } from "@/hooks/use-fleet-cost-analysis";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye,
  Download,
  RefreshCw,
  FolderOpen,
  DollarSign,
  Car,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export function ByCategoryTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FleetCostFilters>({});
  const [dateRange, setDateRange] = useState("all");

  const { data: categoryMetrics, isLoading } = useFleetCostAnalysisByCategory(filters);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const now = new Date();
    let dateFrom: string | undefined;

    switch (range) {
      case "30d":
        dateFrom = format(subDays(now, 30), "yyyy-MM-dd");
        break;
      case "6m":
        dateFrom = format(subMonths(now, 6), "yyyy-MM-dd");
        break;
      case "1y":
        dateFrom = format(subMonths(now, 12), "yyyy-MM-dd");
        break;
      default:
        dateFrom = undefined;
    }

    setFilters({ ...filters, dateFrom, dateTo: dateFrom ? format(now, "yyyy-MM-dd") : undefined });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["fleet-cost-analysis"] });
    setIsRefreshing(false);
  };

  const handleExportCSV = () => {
    if (!categoryMetrics?.length) return;

    const headers = [
      "Category", "Vehicles", "Acquisition Cost", "Revenue", 
      "Damage Cost", "Maintenance Cost", "Net Profit", "Avg Profit/Vehicle", "Margin %"
    ];

    const rows = categoryMetrics.map((c) => [
      c.categoryName,
      c.vehicleCount,
      c.totalAcquisitionCost.toFixed(2),
      c.totalRentalRevenue.toFixed(2),
      c.totalDamageCost.toFixed(2),
      c.totalMaintenanceCost.toFixed(2),
      c.totalNetProfit.toFixed(2),
      c.avgProfitPerVehicle.toFixed(2),
      c.avgMargin.toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet-category-analysis-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!categoryMetrics?.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No categories with vehicles</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Create categories and assign vehicles to see aggregated analytics.
          </p>
          <Button onClick={() => navigate("/admin/fleet-analytics?tab=categories")}>
            Manage Categories
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export to CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryMetrics.map((cat) => (
          <Card key={cat.categoryId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{cat.categoryName}</CardTitle>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {cat.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  <Car className="w-3 h-3 mr-1" />
                  {cat.vehicleCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(cat.totalRentalRevenue)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Costs</p>
                  <p className="text-sm font-medium text-amber-600">
                    {formatCurrency(cat.totalExpenses)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <div className="flex items-center gap-1">
                    {cat.totalNetProfit >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span className={`text-sm font-medium ${cat.totalNetProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(cat.totalNetProfit)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avg/Vehicle</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(cat.avgProfitPerVehicle)}
                  </p>
                </div>
              </div>

              {/* Rentals summary */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <span>{cat.totalRentalCount} total rentals</span>
                <span>{cat.totalRentalDays} rental days</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/admin/fleet/category/${cat.categoryId}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Details
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View all vehicles in this category</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
