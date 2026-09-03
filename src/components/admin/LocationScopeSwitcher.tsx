/**
 * LocationScopeSwitcher
 *
 * Super Admin only: switches the active branch scope (persisted in the URL).
 * Managers see a static badge of their own branch instead of a switcher.
 */

import { Building2, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocations } from "@/hooks/use-locations";
import { useLocationScope } from "@/context/LocationScopeProvider";

interface LocationScopeSwitcherProps {
  className?: string;
}

export function LocationScopeSwitcher({ className }: LocationScopeSwitcherProps) {
  const { scopeLocationId, setScopeLocationId, canSwitchLocation, isLoading } = useLocationScope();
  const { data: locations, isLoading: locationsLoading } = useLocations();

  if (isLoading || locationsLoading) {
    return <Skeleton className="h-9 w-44" />;
  }

  const activeName = locations?.find((l) => l.id === scopeLocationId)?.name;

  if (!canSwitchLocation) {
    return (
      <div
        className={`flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground ${className || ""}`}
      >
        <MapPin className="h-3.5 w-3.5" />
        {activeName || "No branch assigned"}
      </div>
    );
  }

  return (
    <Select
      value={scopeLocationId ?? "all"}
      onValueChange={(value) => setScopeLocationId(value === "all" ? null : value)}
    >
      <SelectTrigger className={`w-44 ${className || ""}`}>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="All Branches" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Branches</SelectItem>
        {(locations || []).map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
