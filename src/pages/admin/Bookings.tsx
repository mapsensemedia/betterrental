/**
 * Unified Operations Hub - Bookings, Pickups, Active Rentals, Returns
 * Consolidated view for the complete rental workflow
 */
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO, isThisWeek, isBefore, addDays } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAdminBookings, type BookingFilters } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { 
  Search, 
  Filter, 
  Eye, 
  Car, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  Truck,
  KeyRound,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
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

// Compact booking card for workflow views
function BookingWorkflowCard({ 
  booking, 
  onOpen,
  showAction = "view",
}: { 
  booking: any; 
  onOpen: (id: string) => void;
  showAction?: "view" | "pickup" | "return";
}) {
  const isOverdue = booking.status === "active" && isBefore(parseISO(booking.endAt), new Date());
  
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onOpen(booking.id)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isOverdue ? "bg-destructive/10" : 
          booking.status === "active" ? "bg-primary/10" : 
          booking.status === "confirmed" ? "bg-green-500/10" : "bg-muted"
        }`}>
          {booking.status === "active" ? (
            <Car className={`w-5 h-5 ${isOverdue ? "text-destructive" : "text-primary"}`} />
          ) : booking.status === "confirmed" ? (
            <KeyRound className="w-5 h-5 text-green-500" />
          ) : (
            <Calendar className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {booking.vehicle?.make} {booking.vehicle?.model}
            </span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {booking.bookingCode}
            </Badge>
            {booking.pickupAddress && <DeliveryBadge hasDelivery={true} />}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{booking.profile?.fullName || "Customer"}</span>
            <span>•</span>
            <span>{format(parseISO(booking.startAt), "MMM d, h:mm a")}</span>
            {isOverdue && (
              <>
                <span>•</span>
                <span className="text-destructive font-medium">Overdue</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={booking.status} />
        <Button variant="ghost" size="sm">
          {showAction === "pickup" ? (
            <KeyRound className="w-4 h-4" />
          ) : showAction === "return" ? (
            <RotateCcw className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [filters, setFilters] = useState<BookingFilters>({
    status: "all",
    search: searchParams.get("code") || "",
  });

  const { data: bookings = [], isLoading, refetch } = useAdminBookings(filters);
  const { data: locations } = useLocations();

  // Handle booking code from URL (scan-to-open)
  useEffect(() => {
    const code = searchParams.get("code");
    if (code && bookings) {
      const booking = bookings.find(b => b.bookingCode.toLowerCase() === code.toLowerCase());
      if (booking) {
        navigate(`/admin/bookings/${booking.id}/ops?returnTo=/admin/bookings`);
        setSearchParams({});
      }
    }
  }, [searchParams, bookings, setSearchParams, navigate]);

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab !== "all") {
      setSearchParams({ tab: activeTab });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  const handleOpenBooking = (bookingId: string) => {
    navigate(`/admin/bookings/${bookingId}/ops?returnTo=/admin/bookings`);
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
  };

  // Categorize bookings
  const categorizedBookings = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    
    return {
      pending: bookings.filter(b => b.status === "pending"),
      confirmed: bookings.filter(b => b.status === "confirmed"),
      pickupsToday: bookings.filter(b => 
        b.status === "confirmed" && isToday(parseISO(b.startAt))
      ),
      pickupsTomorrow: bookings.filter(b => 
        b.status === "confirmed" && isTomorrow(parseISO(b.startAt))
      ),
      pickupsLater: bookings.filter(b => 
        b.status === "confirmed" && 
        !isToday(parseISO(b.startAt)) && 
        !isTomorrow(parseISO(b.startAt))
      ),
      active: bookings.filter(b => b.status === "active"),
      returnsToday: bookings.filter(b => 
        b.status === "active" && isToday(parseISO(b.endAt))
      ),
      overdue: bookings.filter(b => 
        b.status === "active" && isBefore(parseISO(b.endAt), now)
      ),
      completed: bookings.filter(b => b.status === "completed"),
      cancelled: bookings.filter(b => b.status === "cancelled"),
    };
  }, [bookings]);

  // Quick stats
  const stats = [
    { label: "Pending", value: categorizedBookings.pending.length, color: "text-amber-500" },
    { label: "Today's Pickups", value: categorizedBookings.pickupsToday.length, color: "text-green-500" },
    { label: "Active", value: categorizedBookings.active.length, color: "text-primary" },
    { label: "Today's Returns", value: categorizedBookings.returnsToday.length, color: "text-orange-500" },
  ];

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
            <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage bookings, pickups, active rentals, and returns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search booking code..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => refetch()} variant="outline" size="icon">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Workflow Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="all" className="gap-1.5">
              All
              <Badge variant="secondary" className="text-xs">{bookings.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              Pending
              {categorizedBookings.pending.length > 0 && (
                <Badge variant="destructive" className="text-xs">{categorizedBookings.pending.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pickups" className="gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Pickups
              {categorizedBookings.confirmed.length > 0 && (
                <Badge className="text-xs bg-green-500">{categorizedBookings.confirmed.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Active
              {categorizedBookings.active.length > 0 && (
                <Badge variant="secondary" className="text-xs">{categorizedBookings.active.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="returns" className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Returns
              {categorizedBookings.returnsToday.length > 0 && (
                <Badge className="text-xs bg-orange-500">{categorizedBookings.returnsToday.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              Completed
            </TabsTrigger>
          </TabsList>

          {/* All Bookings Tab */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">All Bookings</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => handleFilterChange("status", value)}
                    >
                      <SelectTrigger className="w-[140px] h-9">
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
                  </div>
                </div>
              </CardHeader>
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
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                          <span className="text-muted-foreground">Loading...</span>
                        </TableCell>
                      </TableRow>
                    ) : bookings?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No bookings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings?.map((booking) => (
                        <TableRow 
                          key={booking.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleOpenBooking(booking.id)}
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {booking.bookingCode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{booking.profile?.fullName || "Unknown"}</p>
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
                            <div className="text-sm">
                              <p>{format(parseISO(booking.startAt), "MMM d")}</p>
                              <p className="text-xs text-muted-foreground">{booking.totalDays} days</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{booking.location?.name}</span>
                              {booking.pickupAddress && <DeliveryBadge hasDelivery={true} />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${booking.totalAmount.toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={booking.status} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
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
          </TabsContent>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Pending Confirmation
                </CardTitle>
                <CardDescription>Bookings awaiting review and confirmation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categorizedBookings.pending.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No pending bookings</p>
                  </div>
                ) : (
                  categorizedBookings.pending.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pickups Tab */}
          <TabsContent value="pickups" className="space-y-4">
            {/* Today's Pickups */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-green-500" />
                  Today's Pickups
                  {categorizedBookings.pickupsToday.length > 0 && (
                    <Badge className="bg-green-500">{categorizedBookings.pickupsToday.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categorizedBookings.pickupsToday.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No pickups today</p>
                ) : (
                  categorizedBookings.pickupsToday.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Tomorrow */}
            {categorizedBookings.pickupsTomorrow.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Tomorrow
                    <Badge variant="secondary">{categorizedBookings.pickupsTomorrow.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categorizedBookings.pickupsTomorrow.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Later */}
            {categorizedBookings.pickupsLater.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    Upcoming
                    <Badge variant="secondary">{categorizedBookings.pickupsLater.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categorizedBookings.pickupsLater.slice(0, 10).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Tab */}
          <TabsContent value="active" className="space-y-4">
            {/* Overdue Warning */}
            {categorizedBookings.overdue.length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Overdue Returns
                    <Badge variant="destructive">{categorizedBookings.overdue.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categorizedBookings.overdue.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="return"
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  Active Rentals
                  <Badge variant="secondary">{categorizedBookings.active.length}</Badge>
                </CardTitle>
                <CardDescription>Vehicles currently out with customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categorizedBookings.active.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No active rentals</p>
                ) : (
                  categorizedBookings.active.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  Due Today
                  {categorizedBookings.returnsToday.length > 0 && (
                    <Badge className="bg-orange-500">{categorizedBookings.returnsToday.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categorizedBookings.returnsToday.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No returns due today</p>
                ) : (
                  categorizedBookings.returnsToday.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="return"
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Overdue */}
            {categorizedBookings.overdue.length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Overdue
                    <Badge variant="destructive">{categorizedBookings.overdue.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {categorizedBookings.overdue.map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="return"
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Completed Rentals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categorizedBookings.completed.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No completed rentals</p>
                ) : (
                  categorizedBookings.completed.slice(0, 20).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
