/**
 * Utilization Tab - Rental count and days tracking
 */
import { useState } from "react";
import { useFleetAnalytics } from "@/hooks/use-fleet-analytics";
import { useLocations } from "@/hooks/use-locations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, Car } from "lucide-react";

type SortField = "rentalCount" | "totalRentalDays" | "totalRevenue";
type SortOrder = "asc" | "desc";

export function UtilizationTab() {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rentalCount");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: locations } = useLocations();
  const filters = {
    ...(locationFilter !== "all" && { locationId: locationFilter }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  };
  const { data: analytics, isLoading } = useFleetAnalytics(filters);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredData = analytics
    ?.filter((v) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        v.make.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        v.vin?.toLowerCase().includes(searchLower) ||
        v.licensePlate?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="rented">Rented</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Utilization Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4" />
            Vehicle Utilization
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>VIN / Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("rentalCount")}
                    className="gap-1 -ml-3"
                  >
                    Rentals
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("totalRentalDays")}
                    className="gap-1 -ml-3"
                  >
                    Total Days
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("totalRevenue")}
                    className="gap-1 -ml-3"
                  >
                    Revenue
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData?.map((vehicle) => (
                <TableRow key={vehicle.vehicleUnitId || vehicle.vehicleId}>
                  <TableCell>
                    <p className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div>
                      {vehicle.vin && (
                        <p className="font-mono text-xs">{vehicle.vin}</p>
                      )}
                      {vehicle.licensePlate && (
                        <Badge variant="outline" className="font-mono text-xs mt-1">
                          {vehicle.licensePlate}
                        </Badge>
                      )}
                      {!vehicle.vin && !vehicle.licensePlate && (
                        <span className="text-muted-foreground text-xs">No unit</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      vehicle.status === "available" ? "secondary" :
                      vehicle.status === "rented" ? "default" : "outline"
                    }>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{vehicle.rentalCount}</span>
                  </TableCell>
                  <TableCell>{vehicle.totalRentalDays} days</TableCell>
                  <TableCell className="font-medium">{formatCurrency(vehicle.totalRevenue)}</TableCell>
                  <TableCell className={vehicle.profit >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                    {formatCurrency(vehicle.profit)}
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
