import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";

interface LocationSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  placeholder = "Select pickup location",
  className,
  required = false,
}: LocationSelectorProps) {
  const { data: locations = [], isLoading } = useLocations();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <div className="flex flex-col">
              <span className="font-medium">{location.name}</span>
              <span className="text-xs text-muted-foreground">{location.address}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
