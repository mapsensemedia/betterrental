/**
 * OpsActiveRentals - Active rentals view for ops staff
 */

import { useNavigate } from "react-router-dom";
import { OpsShell } from "@/components/ops/OpsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Car, 
  Clock, 
  User,
  ChevronRight,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listBookings, BookingSummary } from "@/domain/bookings";
import { format, parseISO, differenceInHours, isPast } from "date-fns";
import { useState } from "react";

function RentalCard({ booking }: { booking: BookingSummary }) {
  const navigate = useNavigate();
  const endTime = parseISO(booking.endAt);
  const isOverdue = isPast(endTime);
  const hoursLeft = differenceInHours(endTime, new Date());

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${
        isOverdue ? "border-amber-500/50" : ""
      }`}
      onClick={() => navigate(`/ops/rental/${booking.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Customer & Status */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold truncate">
                {booking.profile?.fullName || "Guest"}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {booking.bookingCode}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Car className="w-3.5 h-3.5" />
              <span>{booking.vehicle?.name || "Vehicle"}</span>
            </div>

            {/* Return time */}
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              {isOverdue ? (
                <span className="text-amber-600 font-medium">
                  Due {format(endTime, "MMM d 'at' h:mm a")}
                </span>
              ) : hoursLeft < 24 ? (
                <span className="text-blue-600">
                  Returns in {hoursLeft}h
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Returns {format(endTime, "MMM d")}
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          <Button size="sm" variant="outline">
            View
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpsActiveRentals() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["ops-active-rentals"],
    queryFn: () => listBookings({ status: "active" }),
  });

  // Filter by search
  const filteredBookings = (bookings || []).filter((b) => {
    if (!search) return true;
    return (
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.profile?.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Sort by return date (earliest first)
  const sortedBookings = [...filteredBookings].sort(
    (a, b) => parseISO(a.endAt).getTime() - parseISO(b.endAt).getTime()
  );

  // Split into overdue and upcoming
  const overdueBookings = sortedBookings.filter((b) => isPast(parseISO(b.endAt)));
  const upcomingBookings = sortedBookings.filter((b) => !isPast(parseISO(b.endAt)));

  return (
    <OpsShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Active Rentals</h1>
            <p className="text-sm text-muted-foreground">
              {sortedBookings.length} vehicles on road
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedBookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No active rentals</p>
              <p className="text-sm text-muted-foreground">
                All vehicles are available
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overdue Section */}
            {overdueBookings.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue ({overdueBookings.length})
                </h2>
                <div className="space-y-3">
                  {overdueBookings.map((booking) => (
                    <RentalCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Returns */}
            {upcomingBookings.length > 0 && (
              <div>
                {overdueBookings.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground mb-2">
                    On Schedule ({upcomingBookings.length})
                  </h2>
                )}
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <RentalCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </OpsShell>
  );
}
