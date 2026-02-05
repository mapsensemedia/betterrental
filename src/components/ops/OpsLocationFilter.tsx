/**
 * OpsLocationFilter - Location selector for ops queues
 */

import { useSearchParams } from "react-router-dom";
import { MapPin, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";

interface OpsLocationFilterProps {
  className?: string;
}

export function OpsLocationFilter({ className }: OpsLocationFilterProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationId = searchParams.get("locationId") || "all";
  const { data: locations, isLoading } = useLocations();

  const handleLocationChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === "all") {
      newParams.delete("locationId");
    } else {
      newParams.set("locationId", value);
    }
    setSearchParams(newParams);
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-40" />;
  }

  return (
    <Select value={locationId} onValueChange={handleLocationChange}>
      <SelectTrigger className={`w-40 ${className || ""}`}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="All Locations" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            All Locations
          </div>
        </SelectItem>
        {(locations || []).map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {location.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Hook to get current location filter from URL
 */
export function useOpsLocationFilter(): string | null {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get("locationId");
  return locationId === "all" ? null : locationId;
}
