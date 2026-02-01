/**
 * Unified Operations Hub - Bookings, Pickups, Active Rentals, Returns
 * Consolidated view for the complete rental workflow
 */
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WalkInBookingDialog } from "@/components/admin/WalkInBookingDialog";
import { format, isToday, isTomorrow, parseISO, isThisWeek, isBefore, addDays, isAfter, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAdminBookings, type BookingFilters } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { useAdminVehicles } from "@/hooks/use-inventory";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Plus,
  UserPlus,
  FileWarning,
  IdCard,
  CalendarDays,
} from "lucide-react";
import { DeliveryBadge } from "@/components/admin/DeliveryDetailsCard";
import { OperationsFilters, defaultFilters, getDateRangeFromPreset, type OperationsFiltersState } from "@/components/admin/OperationsFilters";
import type { Database } from "@/integrations/supabase/types";
import { getBookingRoute } from "@/lib/booking-routes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const statusOptions: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// Hook to fetch license status for bookings
function useLicenseStatus(userIds: string[]) {
  return useQuery({
    queryKey: ["license-status", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return new Map<string, string>();
      
      const { data } = await supabase
        .from("profiles")
        .select("id, driver_license_status")
        .in("id", userIds);
      
      const statusMap = new Map<string, string>();
      (data || []).forEach(p => {
        statusMap.set(p.id, p.driver_license_status || "pending");
      });
      return statusMap;
    },
    enabled: userIds.length > 0,
    staleTime: 30000,
  });
}

// Needs Processing Badge
function NeedsProcessingBadge({ licenseStatus }: { licenseStatus?: string }) {
  if (licenseStatus === "approved") return null;
  
  return (
    <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 text-[10px]">
      <IdCard className="h-3 w-3 mr-1" />
      {licenseStatus === "pending" ? "License Pending" : 
       licenseStatus === "submitted" ? "License Review" : 
       licenseStatus === "rejected" ? "License Rejected" : "Needs Processing"}
    </Badge>
  );
}

// Date highlight badge for pickup/return dates
function DateHighlightBadge({ date, type }: { date: string; type: "pickup" | "return" }) {
  const parsedDate = parseISO(date);
  const isDateToday = isToday(parsedDate);
  const isDateTomorrow = isTomorrow(parsedDate);
  const isPast = isBefore(parsedDate, startOfDay(new Date()));
  
  if (isPast) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        <AlertCircle className="h-3 w-3 mr-1" />
        {type === "pickup" ? "Pickup" : "Return"}: {format(parsedDate, "MMM d")}
      </Badge>
    );
  }
  
  if (isDateToday) {
    return (
      <Badge className="bg-green-500 text-[10px]">
        <CalendarDays className="h-3 w-3 mr-1" />
        {type === "pickup" ? "Pickup" : "Return"} Today
      </Badge>
    );
  }
  
  if (isDateTomorrow) {
    return (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-[10px]">
        <CalendarDays className="h-3 w-3 mr-1" />
        {type === "pickup" ? "Pickup" : "Return"} Tomorrow
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-[10px]">
      <CalendarDays className="h-3 w-3 mr-1" />
      {format(parsedDate, "EEE, MMM d")}
    </Badge>
  );
}

// Compact booking card for workflow views
function BookingWorkflowCard({ 
  booking, 
  onOpen,
  showAction = "view",
  licenseStatus,
  highlightDate = false,
}: { 
  booking: any; 
  onOpen: (id: string, status?: BookingStatus) => void;
  showAction?: "view" | "pickup" | "return";
  licenseStatus?: string;
  highlightDate?: boolean;
}) {
  const isOverdue = booking.status === "active" && isBefore(parseISO(booking.endAt), new Date());
  const needsProcessing = licenseStatus !== "approved";
  const pickupDate = parseISO(booking.startAt);
  const isPastPickup = isBefore(pickupDate, startOfDay(new Date())) && (booking.status === "pending" || booking.status === "confirmed");
  
  return (
    <TooltipProvider>
      <div 
        className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer ${
          needsProcessing && (booking.status === "pending" || booking.status === "confirmed") ? "border-amber-500/50" : ""
        } ${isPastPickup ? "border-destructive/50" : ""}`}
        onClick={() => onOpen(booking.id, booking.status)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isOverdue || isPastPickup ? "bg-destructive/10" : 
            booking.status === "active" ? "bg-primary/10" : 
            booking.status === "confirmed" || booking.status === "pending" ? "bg-green-500/10" : "bg-muted"
          }`}>
            {booking.status === "active" ? (
              <Car className={`w-5 h-5 ${isOverdue ? "text-destructive" : "text-primary"}`} />
            ) : booking.status === "confirmed" || booking.status === "pending" ? (
              <KeyRound className={`w-5 h-5 ${isPastPickup ? "text-destructive" : "text-green-500"}`} />
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
              {needsProcessing && (booking.status === "pending" || booking.status === "confirmed") && (
                <NeedsProcessingBadge licenseStatus={licenseStatus} />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>{booking.profile?.fullName || "Customer"}</span>
              {highlightDate && (
                <DateHighlightBadge 
                  date={showAction === "return" ? booking.endAt : booking.startAt} 
                  type={showAction === "return" ? "return" : "pickup"} 
                />
              )}
              {!highlightDate && (
                <>
                  <span>•</span>
                  <span>{format(pickupDate, "MMM d, h:mm a")}</span>
                </>
              )}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm">
                {showAction === "pickup" ? (
                  <KeyRound className="w-4 h-4" />
                ) : showAction === "return" ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showAction === "pickup" ? "Process Pickup" : showAction === "return" ? "Process Return" : "View Details"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [filters, setFilters] = useState<BookingFilters>({
    status: "all",
    search: searchParams.get("code") || "",
  });
  
  // Operations filters for each tab
  const [opsFilters, setOpsFilters] = useState<OperationsFiltersState>(defaultFilters);

  const { data: bookings = [], isLoading, refetch } = useAdminBookings(filters);
  const { data: locations = [] } = useLocations();
  const { data: vehicles = [] } = useAdminVehicles({ status: "all" });

  // Get license status for all booking users
  const userIds = useMemo(() => [...new Set(bookings.map(b => b.userId))], [bookings]);
  const { data: licenseStatusMap = new Map() } = useLicenseStatus(userIds);

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

  const handleOpenBooking = (bookingId: string, status?: BookingStatus) => {
    // Use smart routing based on status
    if (status) {
      navigate(getBookingRoute(bookingId, status, { returnTo: "/admin/bookings" }));
    } else {
      // Fallback - find the booking and get its status
      const booking = bookings?.find(b => b.id === bookingId);
      if (booking) {
        navigate(getBookingRoute(bookingId, booking.status, { returnTo: "/admin/bookings" }));
      } else {
        // Default to ops route
        navigate(`/admin/bookings/${bookingId}/ops?returnTo=/admin/bookings`);
      }
    }
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
  };

  // Apply operations filters to a list of bookings
  const applyOpsFilters = (bookingList: typeof bookings) => {
    return bookingList.filter(booking => {
      // Location filter
      if (opsFilters.locationId !== "all" && booking.locationId !== opsFilters.locationId) {
        return false;
      }
      
      // Vehicle filter
      if (opsFilters.vehicleId !== "all" && booking.vehicleId !== opsFilters.vehicleId) {
        return false;
      }
      
      // Date range filter
      if (opsFilters.dateRange.start) {
        const bookingDate = parseISO(booking.startAt);
        if (isBefore(bookingDate, startOfDay(opsFilters.dateRange.start))) {
          return false;
        }
      }
      if (opsFilters.dateRange.end) {
        const bookingDate = parseISO(booking.startAt);
        if (isAfter(bookingDate, endOfDay(opsFilters.dateRange.end))) {
          return false;
        }
      }
      
      // Needs processing filter
      if (opsFilters.needsProcessing) {
        const licenseStatus = licenseStatusMap.get(booking.userId);
        if (licenseStatus === "approved") {
          return false;
        }
      }
      
      return true;
    });
  };

  // Categorize bookings (treating pending as confirmed since all new bookings are confirmed)
  const categorizedBookings = useMemo(() => {
    const now = new Date();
    
    // Pending and confirmed are treated the same for pickups
    const preRental = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
    
    return {
      pending: bookings.filter(b => b.status === "pending"),
      confirmed: bookings.filter(b => b.status === "confirmed"),
      // All pre-rental bookings (pending + confirmed)
      allPickups: preRental,
      pickupsToday: preRental.filter(b => isToday(parseISO(b.startAt))),
      pickupsTomorrow: preRental.filter(b => isTomorrow(parseISO(b.startAt))),
      pickupsUpcoming: preRental.filter(b => 
        !isToday(parseISO(b.startAt)) && 
        !isTomorrow(parseISO(b.startAt)) &&
        isAfter(parseISO(b.startAt), now)
      ),
      pickupsPast: preRental.filter(b => 
        isBefore(parseISO(b.startAt), startOfDay(now))
      ),
      active: bookings.filter(b => b.status === "active"),
      returnsToday: bookings.filter(b => 
        b.status === "active" && isToday(parseISO(b.endAt))
      ),
      returnsTomorrow: bookings.filter(b => 
        b.status === "active" && isTomorrow(parseISO(b.endAt))
      ),
      overdue: bookings.filter(b => 
        b.status === "active" && isBefore(parseISO(b.endAt), now)
      ),
      completed: bookings.filter(b => b.status === "completed"),
      cancelled: bookings.filter(b => b.status === "cancelled"),
    };
  }, [bookings]);

  // Count bookings that need processing
  const needsProcessingCount = useMemo(() => {
    return categorizedBookings.allPickups.filter(b => {
      const status = licenseStatusMap.get(b.userId);
      return status !== "approved";
    }).length;
  }, [categorizedBookings.allPickups, licenseStatusMap]);

  // Quick stats
  const stats = [
    { label: "Pickups", value: categorizedBookings.allPickups.length, color: "text-green-500" },
    { label: "Needs Processing", value: needsProcessingCount, color: "text-amber-500" },
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
            <Button onClick={() => setWalkInDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Walk-In Booking
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search booking code..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => refetch()} variant="outline" size="icon">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh bookings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Walk-In Booking Dialog */}
        <WalkInBookingDialog 
          open={walkInDialogOpen} 
          onOpenChange={setWalkInDialogOpen} 
        />

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
            <TabsTrigger value="pickups" className="gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Pickups
              {categorizedBookings.allPickups.length > 0 && (
                <Badge className="text-xs bg-green-500">{categorizedBookings.allPickups.length}</Badge>
              )}
              {needsProcessingCount > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">{needsProcessingCount}</Badge>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-base">All Bookings</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <OperationsFilters
                      filters={opsFilters}
                      onFiltersChange={setOpsFilters}
                      locations={locations}
                      vehicles={vehicles}
                      showNeedsProcessing={true}
                    />
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
                    ) : applyOpsFilters(bookings)?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No bookings found
                        </TableCell>
                      </TableRow>
                    ) : (
                      applyOpsFilters(bookings)?.map((booking) => (
                        <TableRow 
                          key={booking.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleOpenBooking(booking.id, booking.status)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {booking.bookingCode}
                              </Badge>
                              {licenseStatusMap.get(booking.userId) !== "approved" && 
                               (booking.status === "pending" || booking.status === "confirmed") && (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View booking details</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pickups Tab - Combined Pending & Confirmed */}
          <TabsContent value="pickups" className="space-y-4">
            {/* Filters */}
            <OperationsFilters
              filters={opsFilters}
              onFiltersChange={setOpsFilters}
              locations={locations}
              vehicles={vehicles}
              showNeedsProcessing={true}
            />

            {/* Needs Processing Alert */}
            {needsProcessingCount > 0 && !opsFilters.needsProcessing && (
              <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                      <FileWarning className="h-5 w-5" />
                      <span className="font-medium">{needsProcessingCount} booking{needsProcessingCount !== 1 ? "s" : ""} need processing</span>
                      <span className="text-sm text-muted-foreground">(License verification pending)</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpsFilters({ ...opsFilters, needsProcessing: true })}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Need Processing (formerly Missed Pickups) */}
            {applyOpsFilters(categorizedBookings.pickupsPast).length > 0 && (
              <Card className="border-amber-500/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                    <Clock className="w-4 h-4" />
                    Need Processing
                    <Badge className="bg-amber-500">{applyOpsFilters(categorizedBookings.pickupsPast).length}</Badge>
                  </CardTitle>
                  <CardDescription>Bookings ready for pickup - pickup date has arrived or passed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.pickupsPast).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                      licenseStatus={licenseStatusMap.get(booking.userId)}
                      highlightDate={true}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Today's Pickups */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-green-500" />
                  Today's Pickups
                  {applyOpsFilters(categorizedBookings.pickupsToday).length > 0 && (
                    <Badge className="bg-green-500">{applyOpsFilters(categorizedBookings.pickupsToday).length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {applyOpsFilters(categorizedBookings.pickupsToday).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No pickups today</p>
                ) : (
                  applyOpsFilters(categorizedBookings.pickupsToday).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                      licenseStatus={licenseStatusMap.get(booking.userId)}
                      highlightDate={true}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Tomorrow - Coming Up */}
            {applyOpsFilters(categorizedBookings.pickupsTomorrow).length > 0 && (
              <Card className="border-blue-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                    <CalendarDays className="w-4 h-4" />
                    Coming Up - Tomorrow
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">{applyOpsFilters(categorizedBookings.pickupsTomorrow).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.pickupsTomorrow).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                      licenseStatus={licenseStatusMap.get(booking.userId)}
                      highlightDate={true}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Future Upcoming */}
            {applyOpsFilters(categorizedBookings.pickupsUpcoming).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Future Pickups
                    <Badge variant="secondary">{applyOpsFilters(categorizedBookings.pickupsUpcoming).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.pickupsUpcoming).slice(0, 20).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="pickup"
                      licenseStatus={licenseStatusMap.get(booking.userId)}
                      highlightDate={true}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Tab */}
          <TabsContent value="active" className="space-y-4">
            {/* Filters */}
            <OperationsFilters
              filters={opsFilters}
              onFiltersChange={setOpsFilters}
              locations={locations}
              vehicles={vehicles}
            />

            {/* Overdue Warning */}
            {applyOpsFilters(categorizedBookings.overdue).length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Overdue Returns
                    <Badge variant="destructive">{applyOpsFilters(categorizedBookings.overdue).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.overdue).map((booking) => (
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
                  <Badge variant="secondary">{applyOpsFilters(categorizedBookings.active).length}</Badge>
                </CardTitle>
                <CardDescription>Vehicles currently out with customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {applyOpsFilters(categorizedBookings.active).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No active rentals</p>
                ) : (
                  applyOpsFilters(categorizedBookings.active).map((booking) => (
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
            {/* Filters */}
            <OperationsFilters
              filters={opsFilters}
              onFiltersChange={setOpsFilters}
              locations={locations}
              vehicles={vehicles}
            />

            {/* Overdue */}
            {applyOpsFilters(categorizedBookings.overdue).length > 0 && (
              <Card className="border-destructive">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Overdue
                    <Badge variant="destructive">{applyOpsFilters(categorizedBookings.overdue).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.overdue).map((booking) => (
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
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  Due Today
                  {applyOpsFilters(categorizedBookings.returnsToday).length > 0 && (
                    <Badge className="bg-orange-500">{applyOpsFilters(categorizedBookings.returnsToday).length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {applyOpsFilters(categorizedBookings.returnsToday).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No returns due today</p>
                ) : (
                  applyOpsFilters(categorizedBookings.returnsToday).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="return"
                      highlightDate={true}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Coming Up Tomorrow */}
            {applyOpsFilters(categorizedBookings.returnsTomorrow).length > 0 && (
              <Card className="border-blue-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                    <CalendarDays className="w-4 h-4" />
                    Coming Up - Tomorrow
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">{applyOpsFilters(categorizedBookings.returnsTomorrow).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.returnsTomorrow).map((booking) => (
                    <BookingWorkflowCard 
                      key={booking.id} 
                      booking={booking} 
                      onOpen={handleOpenBooking}
                      showAction="return"
                      highlightDate={true}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="space-y-4">
            {/* Filters */}
            <OperationsFilters
              filters={opsFilters}
              onFiltersChange={setOpsFilters}
              locations={locations}
              vehicles={vehicles}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Completed Rentals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {applyOpsFilters(categorizedBookings.completed).length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No completed rentals</p>
                ) : (
                  applyOpsFilters(categorizedBookings.completed).slice(0, 30).map((booking) => (
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
