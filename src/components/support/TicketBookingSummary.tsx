/**
 * TicketBookingSummary
 * 
 * Compact booking summary card displayed inside support ticket details
 * when the ticket is linked to a booking. Shows key rental info at a glance.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInMinutes } from "date-fns";
import { 
  Car, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { calculateLateFee, LATE_RETURN_GRACE_MINUTES, LATE_RETURN_HOURLY_RATE } from "@/lib/pricing";

interface TicketBookingSummaryProps {
  bookingId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  voided: "bg-destructive/10 text-destructive border-destructive/20",
};

export function TicketBookingSummary({ bookingId }: TicketBookingSummaryProps) {
  const navigate = useNavigate();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["ticket-booking-summary", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_code,
          status,
          start_at,
          end_at,
          daily_rate,
          total_days,
          total_amount,
          late_return_fee,
          late_return_fee_override,
          late_return_override_reason,
          actual_return_at,
          vehicle_id,
          location_id,
          vehicles:vehicle_id (
            make,
            model,
            year,
            category
          ),
          locations:location_id (
            name,
            city
          )
        `)
        .eq("id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
    staleTime: 30000,
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!booking) return null;

  const vehicle = booking.vehicles as any;
  const location = booking.locations as any;
  const vehicleName = vehicle 
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` 
    : "No vehicle";
  
  const isActive = booking.status === "active";
  const endDate = new Date(booking.end_at);
  const now = new Date();
  const isOverdue = isActive && now > endDate;
  
  // Calculate current late fee info
  const minutesLate = isOverdue ? differenceInMinutes(now, endDate) : 0;
  const lateFee = isOverdue ? calculateLateFee(minutesLate) : 0;
  const hoursLate = Math.floor(minutesLate / 60);
  const minsLate = minutesLate % 60;

  // Effective late fee (override takes precedence)
  const effectiveLateFee = booking.late_return_fee_override != null 
    ? Number(booking.late_return_fee_override) 
    : Number(booking.late_return_fee) || lateFee;

  const handleOpenBooking = () => {
    if (isActive || booking.status === "confirmed" || booking.status === "pending") {
      navigate(`/ops/rental/${booking.id}`);
    } else {
      navigate(`/admin/bookings/${booking.id}`);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" />
            Linked Booking
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleOpenBooking}>
            <ExternalLink className="h-3 w-3" />
            Open
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Status & Code */}
        <div className="flex items-center justify-between">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
            {booking.booking_code}
          </code>
          <Badge variant="outline" className={STATUS_COLORS[booking.status] || ""}>
            {booking.status}
          </Badge>
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-2 text-sm">
          <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{vehicleName}</span>
          {vehicle?.category && (
            <Badge variant="outline" className="text-xs ml-auto shrink-0">{vehicle.category}</Badge>
          )}
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location.name}, {location.city}</span>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Pickup</span>
            <p className="font-medium">{format(new Date(booking.start_at), "MMM d, h:mm a")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Return</span>
            <p className={`font-medium ${isOverdue ? "text-destructive" : ""}`}>
              {format(endDate, "MMM d, h:mm a")}
            </p>
          </div>
        </div>

        {/* Financials */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{booking.total_days} days × ${Number(booking.daily_rate).toFixed(2)}</span>
          </div>
          <span className="font-medium">${Number(booking.total_amount).toFixed(2)} CAD</span>
        </div>

        {/* Late Return Warning */}
        {isOverdue && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Overdue by {hoursLate > 0 ? `${hoursLate}h ` : ""}{minsLate}m
            </div>
            {effectiveLateFee > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Accumulated late fee
                  {booking.late_return_fee_override != null && " (overridden)"}
                </span>
                <span className="font-semibold text-destructive">
                  ${effectiveLateFee.toFixed(2)} CAD
                </span>
              </div>
            )}
            {lateFee === 0 && minutesLate <= LATE_RETURN_GRACE_MINUTES && (
              <p className="text-xs text-muted-foreground">
                Within {LATE_RETURN_GRACE_MINUTES}-min grace period — no fee yet
              </p>
            )}
            {lateFee > 0 && (
              <p className="text-xs text-muted-foreground">
                ${LATE_RETURN_HOURLY_RATE} CAD/hr after {LATE_RETURN_GRACE_MINUTES}-min grace
              </p>
            )}
          </div>
        )}

        {/* Persisted late fee for non-active bookings */}
        {!isActive && effectiveLateFee > 0 && (
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Late fee{booking.late_return_fee_override != null ? " (adjusted)" : ""}
            </span>
            <span className="font-medium text-destructive">${effectiveLateFee.toFixed(2)} CAD</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
