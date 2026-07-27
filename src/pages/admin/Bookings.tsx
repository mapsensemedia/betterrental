/**
 * Unified Operations Hub - Bookings, Pickups, Active Rentals, Returns
 * Consolidated view for the complete rental workflow
 */
import React, { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { WalkInBookingDialog } from "@/components/admin/WalkInBookingDialog";
import { format, isToday, isTomorrow, parseISO, isBefore, isAfter, startOfDay, endOfDay, addDays } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAdminBookings, type BookingFilters, type BookingWithDetails } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { useAdminVehicles } from "@/hooks/use-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Search, Eye, Car, Calendar, MapPin, RefreshCw, KeyRound, RotateCcw,
  Clock, AlertCircle, CheckCircle2, Plus, UserPlus,
  CalendarDays, Workflow,
} from "lucide-react";
import { DeliveryBadge } from "@/components/admin/DeliveryDetailsCard";
import { ActiveRentalsMonitor } from "@/components/admin/ActiveRentalsMonitor";
import { OperationsFilters, defaultFilters, type OperationsFiltersState } from "@/components/admin/OperationsFilters";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const statusOptions: { value: BookingStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Payment Status Dot ──
function PaymentStatusDot({ booking }: { booking: any }) {
  const status = booking.status as string;

  // Don't show for completed/cancelled
  if (status === "completed" || status === "cancelled") return null;

  const hasPaid = booking.hasPaidPayment === true;
  const hasAuthorizedRental = booking.hasAuthorizedRental === true;
  const notes = (booking.notes as string) || "";
  const isPayAtPickup = notes.toLowerCase().includes("pay at pickup");

  if (hasPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Paid
      </span>
    );
  }
  if (hasAuthorizedRental) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 cursor-help">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Authorized
          </span>
        </TooltipTrigger>
        <TooltipContent>Card authorized — capture pending</TooltipContent>
      </Tooltip>
    );
  }
  if (!hasPaid && isPayAtPickup) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        Pay at Pickup
      </span>
    );
  }
  if (!hasPaid && (status === "confirmed" || status === "active") && !isPayAtPickup) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Payment Pending
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Unpaid
      </span>
    );
  }
  return null;
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
  highlightDate = false,
}: { 
  booking: any; 
  onOpen: (id: string, status?: BookingStatus) => void;
  showAction?: "view" | "pickup" | "return";
  highlightDate?: boolean;
}) {
  const isOverdue = booking.status === "active" && isBefore(parseISO(booking.endAt), new Date());
  const pickupDate = parseISO(booking.startAt);
  const isPastPickup = isBefore(pickupDate, startOfDay(new Date())) && (booking.status === "pending" || booking.status === "confirmed");
  
  return (
    <TooltipProvider>
      <div 
        className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer ${
          isPastPickup ? "border-destructive/50" : ""
        }`}
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
              {booking.overbooked && !booking.assignedUnitId && (
                <Badge variant="destructive" className="text-[10px]">
                  Overbooked · needs vehicle
                </Badge>
              )}
              <PaymentStatusDot booking={booking} />

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
  const activeTab = searchParams.get("tab") || "all";
  const setActiveTab = (tab: string) => {
    if (tab !== "all") {
      setSearchParams({ tab });
    } else {
      setSearchParams({});
    }
  };
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [filters, setFilters] = useState<BookingFilters>({
    status: "all",
    search: searchParams.get("code") || "",
  });
  const [opsFilters, setOpsFilters] = useState<OperationsFiltersState>(defaultFilters);

  const { data: bookings = [] as BookingWithDetails[], isLoading, refetch } = useAdminBookings(filters);
  const { data: locations = [] } = useLocations();
  const { data: vehicles = [] } = useAdminVehicles({ status: "all" });

  const handleOpenBooking = (bookingId: string, _status?: BookingStatus) => {
    navigate(`/admin/bookings/${bookingId}?returnTo=/admin/bookings`);
  };

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === "all" ? undefined : value }));
  };

  // Apply operations filters to a list of bookings (no needsProcessing filter)
  const applyOpsFilters = (bookingList: typeof bookings) => {
    return bookingList.filter(booking => {
      if (opsFilters.locationId !== "all" && booking.locationId !== opsFilters.locationId) return false;
      if (opsFilters.vehicleId !== "all" && booking.vehicleId !== opsFilters.vehicleId) return false;
      if (opsFilters.dateRange.start) {
        const bookingDate = parseISO(booking.startAt);
        if (isBefore(bookingDate, startOfDay(opsFilters.dateRange.start))) return false;
      }
      if (opsFilters.dateRange.end) {
        const bookingDate = parseISO(booking.startAt);
        if (isAfter(bookingDate, endOfDay(opsFilters.dateRange.end))) return false;
      }
      return true;
    });
  };

  // Categorize bookings
  const categorizedBookings = useMemo(() => {
    const now = new Date();
    const endOfTomorrow = endOfDay(addDays(startOfDay(now), 1));
    const preRental = bookings.filter(b => b.status === "pending" || b.status === "confirmed");
    
    const byStartAsc = (a: typeof bookings[0], b: typeof bookings[0]) =>
      parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime();
    const byEndAsc = (a: typeof bookings[0], b: typeof bookings[0]) =>
      parseISO(a.endAt).getTime() - parseISO(b.endAt).getTime();
    const byEndDesc = (a: typeof bookings[0], b: typeof bookings[0]) =>
      parseISO(b.endAt).getTime() - parseISO(a.endAt).getTime();

    return {
      pending: bookings.filter(b => b.status === "pending").sort(byStartAsc),
      confirmed: bookings.filter(b => b.status === "confirmed").sort(byStartAsc),
      allPickups: [...preRental].sort(byStartAsc),
      pickupsToday: preRental.filter(b => isToday(parseISO(b.startAt))).sort(byStartAsc),
      pickupsTomorrow: preRental.filter(b => isTomorrow(parseISO(b.startAt))).sort(byStartAsc),
      pickupsUpcoming: preRental.filter(b => 
        !isToday(parseISO(b.startAt)) && 
        !isTomorrow(parseISO(b.startAt)) &&
        isAfter(parseISO(b.startAt), now)
      ).sort(byStartAsc),
      pickupsPast: preRental.filter(b => 
        isBefore(parseISO(b.startAt), startOfDay(now))
      ).sort(byStartAsc),
      active: bookings.filter(b => b.status === "active").sort(byEndAsc),
      returnsToday: bookings.filter(b => 
        b.status === "active" && isToday(parseISO(b.endAt))
      ).sort(byEndAsc),
      returnsTomorrow: bookings.filter(b => 
        b.status === "active" && isTomorrow(parseISO(b.endAt))
      ).sort(byEndAsc),
      returnsFuture: bookings.filter(b => 
        b.status === "active" && isAfter(parseISO(b.endAt), endOfTomorrow) 
      ).sort(byEndAsc),
      overdue: bookings.filter(b => 
        b.status === "active" && isBefore(parseISO(b.endAt), now)
      ).sort(byEndAsc),
      completed: bookings.filter(b => b.status === "completed" || b.status === "cancelled").sort(byEndDesc),
    };
  }, [bookings]);

  // Quick stats (no needsProcessing)
  const stats = [
    { label: "Pickups", value: categorizedBookings.allPickups.length, color: "text-green-500" },
    { label: "Active", value: categorizedBookings.active.length, color: "text-primary" },
    { label: "Today's Returns", value: categorizedBookings.returnsToday.length, color: "text-orange-500" },
    { label: "Overdue", value: categorizedBookings.overdue.length, color: "text-destructive" },
  ];

  const LowInventoryBanner = React.lazy(() => 
    import("@/components/admin/LowInventoryBanner").then(m => ({ default: m.LowInventoryBanner }))
  );

  // Sorted + filtered All tab data — newest bookings first (by creation time)
  const allTabData = useMemo(() => {
    return applyOpsFilters(bookings).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [bookings, opsFilters]);

  const allTabSummary = useMemo(() => {
    const active = allTabData.filter(b => b.status !== 'cancelled');
    const cancelled = allTabData.length - active.length;
    const total = active.reduce((s, b) => s + b.totalAmount, 0);
    return { activeCount: active.length, cancelledCount: cancelled, total };
  }, [allTabData]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <React.Suspense fallback={null}>
          <LowInventoryBanner threshold={1} />
        </React.Suspense>

        {/* Header */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Bookings</h1>
              <p className="text-muted-foreground text-xs md:text-sm mt-0.5 md:mt-1">
                View and search all reservations
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => navigate("/ops")} variant="outline" size="sm" className="h-8 md:h-9">
                <Workflow className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden xs:inline">Process in Ops Panel</span>
                <span className="xs:hidden">Ops</span>
              </Button>
              <Button onClick={() => setWalkInDialogOpen(true)} size="sm" className="h-8 md:h-9">
                <UserPlus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden xs:inline">Walk-In</span>
                <span className="xs:hidden">New</span>
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => refetch()} variant="outline" size="icon" disabled={isLoading} className="h-8 w-8 md:h-9 md:w-9 shrink-0">
                      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isLoading ? "Refreshing..." : "Refresh bookings"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search booking code..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        <WalkInBookingDialog open={walkInDialogOpen} onOpenChange={setWalkInDialogOpen} />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2 p-2 md:p-3 rounded-lg border bg-card">
              <p className={`text-lg md:text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Workflow Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-max md:w-full justify-start h-9 md:h-10 p-1 gap-1">
              <TabsTrigger value="all" className="gap-1 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap">
                All
                <Badge variant="secondary" className="text-[10px] md:text-xs h-4 md:h-5">{bookings.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pickups" className="gap-1 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap">
                <KeyRound className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden xs:inline">Pickups</span>
                <span className="xs:hidden">Pick</span>
                {categorizedBookings.allPickups.length > 0 && (
                  <Badge className="text-[10px] md:text-xs h-4 md:h-5 bg-green-500">{categorizedBookings.allPickups.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-1 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap">
                <Car className="w-3 h-3 md:w-3.5 md:h-3.5" />
                Active
                {categorizedBookings.active.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] md:text-xs h-4 md:h-5">{categorizedBookings.active.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="returns" className="gap-1 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap">
                <RotateCcw className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="hidden xs:inline">Returns</span>
                <span className="xs:hidden">Ret</span>
                {categorizedBookings.returnsToday.length > 0 && (
                  <Badge className="text-[10px] md:text-xs h-4 md:h-5 bg-orange-500">{categorizedBookings.returnsToday.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1 px-2 md:px-3 text-xs md:text-sm whitespace-nowrap">
                <span className="hidden xs:inline">Completed</span>
                <span className="xs:hidden">Done</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ══ All Bookings Tab ══ */}
          <TabsContent value="all" className="space-y-3 md:space-y-4">
            <Card>
              <CardHeader className="pb-3 px-3 md:px-6">
                <div className="flex flex-col gap-3">
                  <CardTitle className="text-sm md:text-base">All Bookings</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <OperationsFilters
                      filters={opsFilters}
                      onFiltersChange={setOpsFilters}
                      locations={locations}
                      vehicles={vehicles}
                    />
                    <Select
                      value={filters.status || "all"}
                      onValueChange={(value) => handleFilterChange("status", value)}
                    >
                      <SelectTrigger className="w-[120px] md:w-[140px] h-8 md:h-9 text-xs md:text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Summary bar */}
              <div className="px-3 md:px-6 pb-3">
              <div className="flex items-center gap-4 px-3 py-2 rounded-md bg-muted/50 text-sm">
                  <span className="font-medium">{allTabSummary.activeCount} booking{allTabSummary.activeCount !== 1 ? "s" : ""}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">Total: <span className="font-medium text-foreground">${allTabSummary.total.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></span>
                  {allTabSummary.cancelledCount > 0 && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{allTabSummary.cancelledCount} cancelled</span>
                    </>
                  )}
                </div>
              </div>

              <CardContent className="p-0">
                {/* Mobile Card View */}
                <div className="block md:hidden divide-y">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                      <span className="text-muted-foreground text-sm">Loading...</span>
                    </div>
                  ) : allTabData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No bookings found</div>
                  ) : (
                    allTabData.slice(0, 50).map((booking) => (
                      <div 
                        key={booking.id} 
                        className="p-3 hover:bg-muted/50 active:bg-muted cursor-pointer"
                        onClick={() => handleOpenBooking(booking.id, booking.status)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-[10px]">{booking.bookingCode}</Badge>
                            <StatusBadge status={booking.status} />
                            <PaymentStatusDot booking={booking} />
                          </div>
                          <span className="font-medium text-sm">${booking.totalAmount.toFixed(0)}</span>
                        </div>
                        <p className="font-medium text-sm truncate">{booking.profile?.fullName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{format(parseISO(booking.startAt), "MMM d")} • {booking.totalDays}d{booking.totalDays !== 1 ? "s" : ""}</span>
                          {booking.pickupAddress && <DeliveryBadge hasDelivery={true} />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <TooltipProvider>
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="hidden lg:table-cell">Dates</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                            <span className="text-muted-foreground">Loading...</span>
                          </TableCell>
                        </TableRow>
                      ) : allTabData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bookings found</TableCell>
                        </TableRow>
                      ) : (
                        allTabData.map((booking) => (
                          <TableRow 
                            key={booking.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleOpenBooking(booking.id, booking.status)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[10px]">{booking.bookingCode}</Badge>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-sm truncate max-w-[120px]">{booking.profile?.fullName || "Unknown"}</p>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm truncate block max-w-[150px]">
                                {booking.vehicle?.make} {booking.vehicle?.model}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm">
                                <p>{format(parseISO(booking.startAt), "MMM d")}</p>
                                <p className="text-xs text-muted-foreground">{booking.totalDays} day{booking.totalDays !== 1 ? "s" : ""}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1.5 text-sm">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[100px]">{booking.location?.name}</span>
                                {booking.pickupAddress && <DeliveryBadge hasDelivery={true} />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-sm">${booking.totalAmount.toFixed(0)}</span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={booking.status} />
                            </TableCell>
                            <TableCell>
                              <PaymentStatusDot booking={booking} />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ Pickups Tab ══ */}
          <TabsContent value="pickups" className="space-y-4">
            <OperationsFilters filters={opsFilters} onFiltersChange={setOpsFilters} locations={locations} vehicles={vehicles} />

            {/* Need Processing (past pickup date) */}
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
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="pickup" highlightDate />
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
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="pickup" highlightDate />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Tomorrow */}
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
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="pickup" highlightDate />
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
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="pickup" highlightDate />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══ Active Tab — FIX 5: only categorizedBookings.active (no separate overdue spread) ══ */}
          <TabsContent value="active" className="space-y-4">
            <OperationsFilters filters={opsFilters} onFiltersChange={setOpsFilters} locations={locations} vehicles={vehicles} />
            <ActiveRentalsMonitor
              bookings={applyOpsFilters(categorizedBookings.active)}
              onOpen={(id) => handleOpenBooking(id, "active")}
            />
          </TabsContent>

          {/* ══ Returns Tab — FIX 4: Overdue → Today → Tomorrow → Future ══ */}
          <TabsContent value="returns" className="space-y-4">
            <OperationsFilters filters={opsFilters} onFiltersChange={setOpsFilters} locations={locations} vehicles={vehicles} />

            {/* 1. Overdue */}
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
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="return" highlightDate />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 2. Returning Today */}
            {applyOpsFilters(categorizedBookings.returnsToday).length > 0 && (
              <Card className="border-orange-500/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                    <RotateCcw className="w-4 h-4" />
                    Returning Today
                    <Badge className="bg-orange-500">{applyOpsFilters(categorizedBookings.returnsToday).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.returnsToday).map((booking) => (
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="return" highlightDate />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 3. Returning Tomorrow */}
            {applyOpsFilters(categorizedBookings.returnsTomorrow).length > 0 && (
              <Card className="border-amber-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                    <CalendarDays className="w-4 h-4" />
                    Returning Tomorrow
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">{applyOpsFilters(categorizedBookings.returnsTomorrow).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.returnsTomorrow).map((booking) => (
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="return" highlightDate />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 4. Future Returns */}
            {applyOpsFilters(categorizedBookings.returnsFuture).length > 0 && (
              <Card className="border-blue-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-600">
                    <Calendar className="w-4 h-4" />
                    Future Returns
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">{applyOpsFilters(categorizedBookings.returnsFuture).length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applyOpsFilters(categorizedBookings.returnsFuture).slice(0, 20).map((booking) => (
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} showAction="return" highlightDate />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty state if nothing */}
            {applyOpsFilters(categorizedBookings.overdue).length === 0 &&
             applyOpsFilters(categorizedBookings.returnsToday).length === 0 &&
             applyOpsFilters(categorizedBookings.returnsTomorrow).length === 0 &&
             applyOpsFilters(categorizedBookings.returnsFuture).length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No active returns
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══ Completed Tab ══ */}
          <TabsContent value="completed" className="space-y-4">
            <OperationsFilters filters={opsFilters} onFiltersChange={setOpsFilters} locations={locations} vehicles={vehicles} />
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
                    <BookingWorkflowCard key={booking.id} booking={booking} onOpen={handleOpenBooking} />
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
