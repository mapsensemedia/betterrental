import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAdminBookings, type BookingFilters } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye, Car, Calendar, MapPin, RefreshCw, Truck } from "lucide-react";
import { DeliveryBadge } from "@/components/admin/DeliveryDetailsCard";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const statusOptions: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BookingFilters>({
    status: "all",
    search: searchParams.get("code") || "",
  });

  const { data: bookings, isLoading, refetch } = useAdminBookings(filters);
  const { data: locations } = useLocations();

  // Handle booking code from URL (scan-to-open)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && bookings) {
      const booking = bookings.find(b => b.bookingCode.toLowerCase() === code.toLowerCase());
      if (booking) {
        // Navigate to full-screen ops page
        navigate(`/admin/bookings/${booking.id}/ops?returnTo=/admin/bookings`);
        // Clear the URL param
        setSearchParams({});
      }
    }
  }, [searchParams, bookings, setSearchParams, navigate]);

  const handleOpenBooking = (bookingId: string) => {
    navigate(`/admin/bookings/${bookingId}/ops?returnTo=/admin/bookings`);
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
  };

  // Lazy import the low inventory banner
  const LowInventoryBanner = React.lazy(() => 
    import("@/components/admin/LowInventoryBanner").then(m => ({ default: m.LowInventoryBanner }))
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Low Inventory Banner */}
        <React.Suspense fallback={null}>
          <LowInventoryBanner threshold={1} />
        </React.Suspense>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-2">Bookings</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage all vehicle bookings and reservations
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by booking code..."
                  value={filters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select
                value={filters.locationId || "all"}
                onValueChange={(value) => handleFilterChange("locationId", value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading bookings...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : bookings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <p className="font-medium">No bookings found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings?.map((booking) => (
                    <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {booking.bookingCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm">
                            {booking.profile?.fullName || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.profile?.email || "No email"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p>{format(new Date(booking.startAt), "MMM d")}</p>
                            <p className="text-xs text-muted-foreground">
                              {booking.totalDays} days
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.location?.name}</span>
                          {booking.pickupAddress && (
                            <DeliveryBadge hasDelivery={true} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ${booking.totalAmount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenBooking(booking.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stats Footer */}
        {bookings && bookings.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {bookings.length} bookings</span>
            <span>
              Total value: ${bookings.reduce((sum, b) => sum + b.totalAmount, 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
