/**
 * OpsFleet - Fleet status view for ops staff
 * View-only for ops, no admin actions
 */

import { useNavigate } from "react-router-dom";
import { OpsShell } from "@/components/ops/OpsShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Car, 
  Search,
  CheckCircle2,
  XCircle,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listCategories, FleetCategory } from "@/domain/fleet";
import { useState } from "react";

const STATUS_CONFIG = {
  available: { label: "Available", icon: CheckCircle2, color: "text-green-600" },
  on_rent: { label: "On Rent", icon: Car, color: "text-blue-600" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "text-amber-600" },
  damage: { label: "Damage", icon: AlertTriangle, color: "text-red-600" },
};

function CategoryCard({ category }: { category: FleetCategory }) {
  const navigate = useNavigate();
  const availablePercent = category.totalCount 
    ? Math.round((category.availableCount || 0) / category.totalCount * 100)
    : 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate(`/admin/fleet/category/${category.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Image */}
          <div className="w-16 h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {category.imageUrl ? (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Car className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{category.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={availablePercent > 50 ? "default" : availablePercent > 0 ? "secondary" : "destructive"}
                className="text-xs"
              >
                {category.availableCount || 0} / {category.totalCount || 0} available
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpsFleet() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["ops-fleet-categories"],
    queryFn: listCategories,
  });

  // Filter by search
  const filteredCategories = (categories || []).filter((c) => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate totals
  const totalUnits = filteredCategories.reduce((sum, c) => sum + (c.totalCount || 0), 0);
  const availableUnits = filteredCategories.reduce((sum, c) => sum + (c.availableCount || 0), 0);

  return (
    <OpsShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Fleet Status</h1>
            <p className="text-sm text-muted-foreground">
              {availableUnits} of {totalUnits} vehicles available
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{availableUnits}</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalUnits - availableUnits}
                </div>
                <div className="text-xs text-muted-foreground">On Rent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">0</div>
                <div className="text-xs text-muted-foreground">Maintenance</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalUnits}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No categories found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </OpsShell>
  );
}
