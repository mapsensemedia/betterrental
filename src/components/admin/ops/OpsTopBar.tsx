import { format } from "date-fns";
import { Car, MapPin, Calendar, User, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

interface OpsTopBarProps {
  bookingCode: string;
  status: BookingStatus;
  customerName: string | null;
  vehicleName: string;
  pickupDate: string;
  locationName: string | null;
  onCancel: () => void;
  onChangeVehicle?: () => void;
  canChangeVehicle?: boolean;
}

export function OpsTopBar({
  bookingCode,
  status,
  customerName,
  vehicleName,
  pickupDate,
  locationName,
  onCancel,
  onChangeVehicle,
  canChangeVehicle,
}: OpsTopBarProps) {
  return (
    <div className="space-y-3">
      {/* Top row: code + status + more menu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-sm">
            {bookingCode}
          </Badge>
          <StatusBadge status={status} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canChangeVehicle && onChangeVehicle && (
              <DropdownMenuItem onClick={onChangeVehicle}>
                <Car className="h-4 w-4 mr-2" />
                Change Vehicle
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onCancel}
              className="text-destructive focus:text-destructive"
            >
              Cancel Booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          {customerName || "Unknown"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Car className="h-3.5 w-3.5" />
          {vehicleName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {format(new Date(pickupDate), "MMM d, h:mm a")}
        </span>
        {locationName && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {locationName}
          </span>
        )}
      </div>
    </div>
  );
}
