/**
 * Fleet Cost Analysis - By Vehicle Tab
 * Shows detailed metrics per VIN with highlighting for underperformers
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useFleetCostAnalysisByVehicle, FleetCostFilters } from "@/hooks/use-fleet-cost-analysis";
import { useVehicleCategories } from "@/hooks/use-vehicle-categories";
import { useLocations } from "@/hooks/use-locations";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export function ByVehicleTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FleetCostFilters>({});
  const [dateRange, setDateRange] = useState("all");

  const { data: categories } = useVehicleCategories();
  const { data: locations } = useLocations();
  const { data: vehicleMetrics, isLoading } = useFleetCostAnalysisByVehicle(filters);

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

  const filteredMetrics = vehicleMetrics?.filter((v) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      v.vin.toLowerCase().includes(searchLower) ||
      v.licensePlate?.toLowerCase().includes(searchLower) ||
      v.vehicleMake.toLowerCase().includes(searchLower) ||
      v.vehicleModel.toLowerCase().includes(searchLower)
    );
  });

  const handleExportCSV = () => {
    if (!filteredMetrics?.length) return;

    const headers = [
      "VIN", "Plate", "Vehicle", "Category", "Acquisition Cost", 
      "Rental Revenue", "Damage Cost", "Maintenance Cost", "Net Profit",
      "Rentals", "Avg Duration", "Cost/Mile", "Recommendation"
    ];

    const rows = filteredMetrics.map((v) => [
      v.vin,
      v.licensePlate || "",
      `${v.vehicleYear} ${v.vehicleMake} ${v.vehicleModel}`,
      v.categoryName || "",
      v.acquisitionCost.toFixed(2),
      v.totalRentalRevenue.toFixed(2),
      v.totalDamageCost.toFixed(2),
      v.totalMaintenanceCost.toFixed(2),
      v.netProfit.toFixed(2),
      v.rentalCount,
      v.avgRentalDuration.toFixed(1),
      v.costPerMile.toFixed(2),
      v.recommendation,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleet-cost-analysis-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search VIN, plate, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

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

            <Select
              value={filters.categoryId || "all"}
              onValueChange={(v) => setFilters({ ...filters, categoryId: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || "all"}
              onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
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
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Vehicle Cost Analysis
            {filteredMetrics && (
              <span className="text-muted-foreground font-normal ml-2">
                ({filteredMetrics.length} vehicles)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Acquisition</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Damage</TableHead>
                  <TableHead className="text-right">Maintenance</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Rentals</TableHead>
                  <TableHead className="text-right">Cost/Mile</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics?.map((v) => (
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
                            {v.vin} • {v.licensePlate || "No plate"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.categoryName ? (
                        <Badge variant="outline">{v.categoryName}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(v.acquisitionCost)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(v.totalRentalRevenue)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {v.totalDamageCost > 0 ? formatCurrency(v.totalDamageCost) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-amber-600">
                      {v.totalMaintenanceCost > 0 ? formatCurrency(v.totalMaintenanceCost) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {v.netProfit >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                        )}
                        <span className={v.netProfit >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                          {formatCurrency(v.netProfit)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{v.rentalCount}</TableCell>
                    <TableCell className="text-right text-sm">
                      ${v.costPerMile.toFixed(2)}
                    </TableCell>
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
                {!filteredMetrics?.length && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No vehicles found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
