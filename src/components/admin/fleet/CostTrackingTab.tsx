/**
 * Cost Tracking Tab - Per-vehicle costs and profitability
 */
import { useState } from "react";
import { useFleetAnalytics } from "@/hooks/use-fleet-analytics";
import { useLocations } from "@/hooks/use-locations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

export function CostTrackingTab() {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: locations } = useLocations();
  const filters = locationFilter !== "all" ? { locationId: locationFilter } : undefined;
  const { data: analytics, isLoading } = useFleetAnalytics(filters);

  const filteredData = analytics?.filter((v) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      v.make.toLowerCase().includes(searchLower) ||
      v.model.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[160px]">
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

      {/* Cost & Profitability Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Cost & Profitability
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Acquisition</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Current Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData?.map((vehicle) => (
                <TableRow key={vehicle.vehicleId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      {vehicle.vendorName && (
                        <p className="text-xs text-muted-foreground">
                          Vendor: {vehicle.vendorName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(vehicle.acquisitionCost)}</TableCell>
                  <TableCell>{formatCurrency(vehicle.totalExpenses)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(vehicle.totalRevenue)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {vehicle.profit >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                      )}
                      <span className={vehicle.profit >= 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {formatCurrency(vehicle.profit)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.max(0, Math.min(100, vehicle.profitMargin))} 
                        className="w-16 h-2"
                      />
                      <span className="text-xs text-muted-foreground">
                        {vehicle.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(vehicle.currentValue)}</p>
                      {vehicle.annualDepreciation > 0 && (
                        <p className="text-xs text-muted-foreground">
                          -{formatCurrency(vehicle.annualDepreciation)}/yr
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredData?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No vehicles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
