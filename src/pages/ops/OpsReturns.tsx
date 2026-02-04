/**
 * OpsReturns - Returns view for ops staff
 */

import { useNavigate, useSearchParams } from "react-router-dom";
import { OpsShell } from "@/components/ops/OpsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Car, 
  Clock, 
  ChevronRight,
  Search,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listBookings, BookingSummary } from "@/domain/bookings";
import { format, parseISO, isPast, isToday, isTomorrow } from "date-fns";
import { useState } from "react";

function ReturnCard({ booking }: { booking: BookingSummary }) {
  const navigate = useNavigate();
  const endTime = parseISO(booking.endAt);
  const isOverdue = isPast(endTime);

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${
        isOverdue ? "border-amber-500/50" : ""
      }`}
      onClick={() => navigate(`/ops/return/${booking.id}`)}
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

            {/* Expected return */}
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              {isOverdue ? (
                <span className="text-amber-600 font-medium">
                  Was due {format(endTime, "MMM d 'at' h:mm a")}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Expected {format(endTime, "h:mm a")}
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          <Button size="sm" variant="default">
            Process
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpsReturns() {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "all";

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["ops-returns"],
    queryFn: () => listBookings({ status: "active" }),
  });

  // Filter active rentals for returns (those due today/tomorrow or overdue)
  const returnBookings = (bookings || []).filter((b) => {
    const d = parseISO(b.endAt);
    return isToday(d) || isTomorrow(d) || isPast(d);
  });

  // Apply additional filters
  const filteredBookings = returnBookings.filter((b) => {
    const matchesSearch =
      !search ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.profile?.fullName?.toLowerCase().includes(search.toLowerCase());

    if (filter === "overdue") {
      return matchesSearch && isPast(parseISO(b.endAt));
    }

    return matchesSearch;
  });

  // Sort by return date (earliest first)
  const sortedBookings = [...filteredBookings].sort(
    (a, b) => parseISO(a.endAt).getTime() - parseISO(b.endAt).getTime()
  );

  const overdueCount = sortedBookings.filter((b) => isPast(parseISO(b.endAt))).length;

  return (
    <OpsShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Returns</h1>
            <p className="text-sm text-muted-foreground">
              {sortedBookings.length} expected returns
              {overdueCount > 0 && (
                <span className="text-amber-600 ml-1">
                  ({overdueCount} overdue)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => window.history.replaceState(null, "", "/ops/returns")}
            >
              All
            </Button>
            <Button
              variant={filter === "overdue" ? "destructive" : "outline"}
              size="sm"
              onClick={() =>
                window.history.replaceState(null, "", "/ops/returns?filter=overdue")
              }
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Overdue
            </Button>
          </div>
        </div>

        {/* List */}
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
              <RotateCcw className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No returns expected</p>
              <p className="text-sm text-muted-foreground">
                Check back later for upcoming returns
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedBookings.map((booking) => (
              <ReturnCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </OpsShell>
  );
}
