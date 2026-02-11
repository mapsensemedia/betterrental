/**
 * OpsPickups - Pickup/Handover list view for ops staff
 * Uses shared BookingOps page for individual bookings
 * Color-codes cards by urgency: overdue (red), today (amber), tomorrow (blue)
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
  MapPin, 
  ChevronRight,
  Search,
  Truck,
  Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listBookings, BookingSummary } from "@/domain/bookings";
import { format, parseISO, isToday, isTomorrow, isBefore, startOfDay } from "date-fns";
import { useState } from "react";
import { OpsLocationFilter, useOpsLocationFilter } from "@/components/ops/OpsLocationFilter";

function getUrgencyStyle(dateStr: string) {
  const d = parseISO(dateStr);
  const now = new Date();
  if (isBefore(d, startOfDay(now))) {
    return { border: "border-destructive/60 bg-destructive/5", badge: "Overdue", badgeClass: "bg-destructive text-destructive-foreground" };
  }
  if (isToday(d)) {
    return { border: "border-amber-500/60 bg-amber-500/5", badge: "Today", badgeClass: "bg-amber-500 text-white" };
  }
  if (isTomorrow(d)) {
    return { border: "border-blue-500/40 bg-blue-500/5", badge: "Tomorrow", badgeClass: "bg-blue-500 text-white" };
  }
  return { border: "", badge: "", badgeClass: "" };
}

function PickupCard({ booking }: { booking: BookingSummary }) {
  const navigate = useNavigate();
  const pickupTime = parseISO(booking.startAt);
  const returnTime = parseISO(booking.endAt);
  const isDelivery = !!booking.pickupAddress;
  const urgency = getUrgencyStyle(booking.startAt);

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${urgency.border}`}
      onClick={() => navigate(`/ops/booking/${booking.id}/handover`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Customer & Booking Code */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold truncate">
                {booking.profile?.fullName || "Guest"}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {booking.bookingCode}
              </Badge>
              {urgency.badge && (
                <Badge className={`text-xs shrink-0 ${urgency.badgeClass}`}>
                  {urgency.badge}
                </Badge>
              )}
            </div>

            {/* Vehicle */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Car className="w-3.5 h-3.5" />
              <span>{booking.vehicle?.name || "Vehicle"}</span>
            </div>

            {/* Pickup Date & Time */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(pickupTime, "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(pickupTime, "h:mm a")}
              </span>
            </div>

            {/* Location / Delivery & Return Date */}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {isDelivery ? (
                <span className="flex items-center gap-1 text-blue-600">
                  <Truck className="w-3 h-3" />
                  Delivery
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {booking.location?.name || "Location"}
                </span>
              )}
              <span className="text-muted-foreground/60">•</span>
              <span>Return: {format(returnTime, "MMM d, h:mm a")}</span>
            </div>
          </div>

          {/* Action */}
          <Button size="sm" variant="default">
            Start
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpsPickups() {
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // Default to "all" instead of "today"
  const dayFilter = searchParams.get("day") || "all";
  const locationFilter = useOpsLocationFilter();

  // Fetch both confirmed and pending bookings for pickups
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["ops-pickups", dayFilter, locationFilter],
    queryFn: async () => {
      // Fetch both pending and confirmed bookings with location filter
      const [pending, confirmed] = await Promise.all([
        listBookings({ status: "pending", locationId: locationFilter || undefined }),
        listBookings({ status: "confirmed", locationId: locationFilter || undefined }),
      ]);
      return [...pending, ...confirmed];
    },
  });
  
  const setDayFilter = (day: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (day === "all") {
      newParams.delete("day");
    } else {
      newParams.set("day", day);
    }
    setSearchParams(newParams);
  };

  // Filter by day and search
  const filteredBookings = (bookings || []).filter((b) => {
    const d = parseISO(b.startAt);
    const matchesDay =
      dayFilter === "all" ||
      (dayFilter === "today" && isToday(d)) ||
      (dayFilter === "tomorrow" && isTomorrow(d));

    const matchesSearch =
      !search ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.profile?.fullName?.toLowerCase().includes(search.toLowerCase());

    return matchesDay && matchesSearch;
  });

  // Sort by pickup time
  const sortedBookings = [...filteredBookings].sort(
    (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime()
  );

  return (
    <OpsShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Pickups</h1>
            <p className="text-sm text-muted-foreground">
              {sortedBookings.length} pending handovers
            </p>
          </div>
        </div>

        {/* Search, Location & Day Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Location Filter */}
          <OpsLocationFilter />
          
          <div className="flex gap-1">
            <Button
              variant={dayFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setDayFilter("today")}
            >
              Today
            </Button>
            <Button
              variant={dayFilter === "tomorrow" ? "default" : "outline"}
              size="sm"
              onClick={() => setDayFilter("tomorrow")}
            >
              Tomorrow
            </Button>
            <Button
              variant={dayFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDayFilter("all")}
            >
              All
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
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No pickups scheduled</p>
              <p className="text-sm text-muted-foreground">
                Check back later or switch to a different day
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedBookings.map((booking) => (
              <PickupCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </OpsShell>
  );
}
