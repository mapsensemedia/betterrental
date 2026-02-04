/**
 * OpsFleet - Fleet status view for ops staff
 * Shows unit-level availability including on-rent status
 */

import { OpsShell } from "@/components/ops/OpsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Car, 
  Search,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  CarFront,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listAllUnits, listCategories } from "@/domain/fleet";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  available: { label: "Available", icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50" },
  on_rent: { label: "On Rent", icon: CarFront, color: "text-blue-600", bgColor: "bg-blue-50" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "text-amber-600", bgColor: "bg-amber-50" },
  damage: { label: "Damage", icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" },
  retired: { label: "Retired", icon: Car, color: "text-gray-500", bgColor: "bg-gray-50" },
  pending: { label: "Pending", icon: Car, color: "text-gray-500", bgColor: "bg-gray-50" },
};

export default function OpsFleet() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all units with status
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["ops-fleet-units"],
    queryFn: () => listAllUnits(),
  });

  // Fetch categories for name lookup
  const { data: categories } = useQuery({
    queryKey: ["ops-fleet-categories"],
    queryFn: listCategories,
  });

  // Create category name map
  const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

  // Filter units
  const filteredUnits = (units || []).filter((u) => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (!search) return true;
    const cat = u.categoryId ? categoryMap.get(u.categoryId) : null;
    return (
      u.vin?.toLowerCase().includes(search.toLowerCase()) ||
      u.licensePlate?.toLowerCase().includes(search.toLowerCase()) ||
      cat?.name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Calculate summary counts
  const statusCounts = {
    available: units?.filter(u => u.status === "available").length || 0,
    on_rent: units?.filter(u => u.status === "on_rent").length || 0,
    maintenance: units?.filter(u => u.status === "maintenance").length || 0,
    other: units?.filter(u => !["available", "on_rent", "maintenance"].includes(u.status)).length || 0,
    total: units?.length || 0,
  };

  const isLoading = unitsLoading;

  return (
    <OpsShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Fleet Status</h1>
            <p className="text-sm text-muted-foreground">
              {statusCounts.available} of {statusCounts.total} vehicles available
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search VIN, plate, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", "available", "on_rent", "maintenance"].map((status) => (
              <Badge
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : STATUS_CONFIG[status]?.label || status}
                {status !== "all" && (
                  <span className="ml-1 opacity-70">
                    ({status === "available" ? statusCounts.available : 
                      status === "on_rent" ? statusCounts.on_rent : 
                      status === "maintenance" ? statusCounts.maintenance : 0})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{statusCounts.available}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{statusCounts.on_rent}</div>
                <div className="text-xs text-muted-foreground">On Rent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{statusCounts.maintenance}</div>
                <div className="text-xs text-muted-foreground">Maintenance</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{statusCounts.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Units List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredUnits.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No units found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredUnits.map((unit) => {
              const category = unit.categoryId ? categoryMap.get(unit.categoryId) : null;
              const statusConfig = STATUS_CONFIG[unit.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={unit.id} className={`${statusConfig.bgColor} border-l-4`} style={{ borderLeftColor: statusConfig.color.replace('text-', 'var(--') }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      {/* Unit Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-medium text-sm">
                            {unit.licensePlate || "No Plate"}
                          </span>
                          <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {category?.name || "Uncategorized"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          VIN: ...{unit.vin?.slice(-6) || "N/A"}
                          {unit.currentMileage && (
                            <span className="ml-2">• {unit.currentMileage.toLocaleString()} km</span>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="text-right text-xs text-muted-foreground">
                        {unit.locationName || "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </OpsShell>
  );
}