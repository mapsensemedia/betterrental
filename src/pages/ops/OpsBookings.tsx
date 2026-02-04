/**
 * OpsBookings - Full booking list for operations staff
 * Uses same domain queries as admin, no duplication
 */

import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OpsShell } from "@/components/ops/OpsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { 
  Search, 
  Calendar, 
  User, 
  Car, 
  ChevronRight,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listBookings, type BookingSummary } from "@/domain/bookings";
import { format, parseISO } from "date-fns";

type TabValue = "all" | "pending" | "confirmed" | "active" | "completed";

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

function BookingCard({ booking, onClick }: { booking: BookingSummary; onClick: () => void }) {
  const vehicleName = booking.vehicle 
    ? booking.vehicle.name
    : "No vehicle";
  const isDelivery = !!booking.pickupAddress;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-medium">{booking.bookingCode}</span>
              <StatusBadge status={booking.status} />
              {isDelivery && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Truck className="w-3 h-3" />
                  Delivery
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {booking.profile?.fullName || "Unknown"}
              </span>
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                {vehicleName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {format(parseISO(booking.startAt), "MMM d")} - {format(parseISO(booking.endAt), "MMM d, yyyy")}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpsBookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("code") || "");
  const activeTab = (searchParams.get("tab") as TabValue) || "all";

  // Fetch all bookings - no status filter for 'all', otherwise filter by status
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ["ops-all-bookings", activeTab],
    queryFn: async () => {
      if (activeTab === "all") {
        // Fetch all statuses in parallel
        const [pending, confirmed, active, completed] = await Promise.all([
          listBookings({ status: "pending" }),
          listBookings({ status: "confirmed" }),
          listBookings({ status: "active" }),
          listBookings({ status: "completed" }),
        ]);
        return [...pending, ...confirmed, ...active, ...completed];
      }
      return listBookings({ status: activeTab });
    },
  });

  // Filter by search term
  const filteredBookings = useMemo(() => {
    if (!search.trim()) return bookings;
    const term = search.toLowerCase();
    return bookings.filter((b) => 
      b.bookingCode.toLowerCase().includes(term) ||
      b.profile?.fullName?.toLowerCase().includes(term) ||
      b.profile?.phone?.includes(term) ||
      b.profile?.email?.toLowerCase().includes(term)
    );
  }, [bookings, search]);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleOpenBooking = (booking: BookingSummary) => {
    // Route based on status
    switch (booking.status) {
      case "pending":
      case "confirmed":
        navigate(`/ops/booking/${booking.id}/handover`);
        break;
      case "active":
        navigate(`/ops/rental/${booking.id}`);
        break;
      case "completed":
        navigate(`/ops/booking/${booking.id}`);
        break;
      default:
        navigate(`/ops/booking/${booking.id}`);
    }
  };

  return (
    <OpsShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">All Bookings</h1>
            <p className="text-sm text-muted-foreground">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search code, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No bookings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Try adjusting your search" : "No bookings in this category"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking} 
                onClick={() => handleOpenBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>
    </OpsShell>
  );
}
