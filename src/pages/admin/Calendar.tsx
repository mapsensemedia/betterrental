import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useCalendarData } from "@/hooks/use-calendar";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Car, Search } from "lucide-react";
import { format, parseISO, addHours } from "date-fns";
import { cn } from "@/lib/utils";

// Calendar event type for color coding
type CalendarEventType = "pickup" | "active" | "return" | "overdue";

const STATUS_COLORS: Record<string, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-500", label: "Pending" },
  confirmed: { bg: "bg-blue-500", label: "Confirmed" },
  active: { bg: "bg-green-500", label: "Active" },
};

// Event type colors for visual distinction
const EVENT_TYPE_COLORS: Record<CalendarEventType, { bg: string; label: string; border: string }> = {
  pickup: { bg: "bg-blue-500", label: "Pickup", border: "border-blue-600" },
  active: { bg: "bg-green-500", label: "Active", border: "border-green-600" },
  return: { bg: "bg-amber-500", label: "Return Due", border: "border-amber-600" },
  overdue: { bg: "bg-red-500", label: "Overdue", border: "border-red-600" },
};

const BUFFER_COLOR = "bg-muted-foreground/30";

const VEHICLE_CATEGORIES = ["Sedan", "SUV", "Sports", "Luxury", "Electric", "Convertible", "Compact"];

// Helper to determine event type for a booking
function getEventType(booking: { status: string; startAt: string; endAt: string }): CalendarEventType {
  const now = new Date();
  const startDate = parseISO(booking.startAt);
  const endDate = parseISO(booking.endAt);
  
  if (booking.status === "confirmed") {
    return "pickup";
  }
  
  if (booking.status === "active") {
    if (now > endDate) {
      return "overdue";
    }
    // Check if return is today
    if (format(now, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd")) {
      return "return";
    }
    return "active";
  }
  
  return "pickup"; // Default
}

export default function AdminCalendar() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: calendarData, isLoading } = useCalendarData(
    weekOffset, 
    locationFilter || undefined
  );
  const { data: locations } = useLocations();

  const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
  const handleNextWeek = () => setWeekOffset(prev => prev + 1);
  const handleToday = () => setWeekOffset(0);

  const getBookingPosition = (
    bookingStart: Date, 
    bookingEnd: Date, 
    weekStart: Date,
    weekEnd: Date
  ) => {
    const effectiveStart = bookingStart < weekStart ? weekStart : bookingStart;
    const effectiveEnd = bookingEnd > weekEnd ? weekEnd : bookingEnd;
    
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const startOffset = effectiveStart.getTime() - weekStart.getTime();
    const endOffset = effectiveEnd.getTime() - weekStart.getTime();
    
    const left = (startOffset / weekMs) * 100;
    const width = ((endOffset - startOffset) / weekMs) * 100;
    
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

  // Filter vehicles by category and search
  const filteredVehicles = useMemo(() => {
    if (!calendarData) return [];
    let vehicles = calendarData.vehicles;
    
    // Apply category filter
    if (categoryFilter !== "all") {
      vehicles = vehicles.filter(v => 
        v.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    
    // Apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      vehicles = vehicles.filter(v => 
        v.make.toLowerCase().includes(search) ||
        v.model.toLowerCase().includes(search) ||
        v.locationName?.toLowerCase().includes(search) ||
        v.category.toLowerCase().includes(search)
      );
    }
    
    return vehicles;
  }, [calendarData, categoryFilter, searchQuery]);

  // Filter bookings by status and search
  const filteredBookings = useMemo(() => {
    if (!calendarData) return [];
    let bookings = calendarData.bookings;
    
    if (statusFilter !== "all") {
      bookings = bookings.filter(b => b.status === statusFilter);
    }
    
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      bookings = bookings.filter(b => 
        b.bookingCode.toLowerCase().includes(search) ||
        b.customerName?.toLowerCase().includes(search) ||
        b.customerEmail?.toLowerCase().includes(search)
      );
    }
    
    return bookings;
  }, [calendarData, statusFilter, searchQuery]);

  const vehicleBookingsMap = useMemo(() => {
    const map = new Map<string, typeof filteredBookings>();
    filteredVehicles.forEach(v => {
      const vehicleBookings = filteredBookings.filter(b => b.vehicleId === v.id);
      map.set(v.id, vehicleBookings);
    });
    return map;
  }, [filteredVehicles, filteredBookings]);

  return (
    <AdminShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground text-sm mt-1">Fleet schedule and availability</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Week Navigation */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handlePrevWeek}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleToday}
                className="text-xs"
              >
                Today
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleNextWeek}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search booking, customer, vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Location Filter */}
          <Select value={locationFilter || "all"} onValueChange={(v) => setLocationFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px] h-9">
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

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {VEHICLE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Week Header */}
        {calendarData && (
          <div className="text-center">
            <h2 className="text-lg font-medium">
              {format(calendarData.weekStart, "MMM d")} - {format(calendarData.weekEnd, "MMM d, yyyy")}
            </h2>
          </div>
        )}

        {/* Legend - Event Types */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {Object.entries(EVENT_TYPE_COLORS).map(([type, { bg, label }]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded", bg)} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded", BUFFER_COLOR)} />
            <span className="text-muted-foreground">Cleaning Buffer</span>
          </div>
        </div>

        {/* Timeline */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-12 w-32" />
                    <Skeleton className="h-12 flex-1" />
                  </div>
                ))}
              </div>
            ) : !filteredVehicles.length ? (
              <div className="p-12 text-center">
                <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No vehicles found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Day Headers */}
                <div className="flex border-b border-border sticky top-0 bg-card z-10">
                  <div className="w-44 flex-shrink-0 p-3 font-medium text-sm border-r border-border">
                    Vehicle
                  </div>
                  <div className="flex-1 flex">
                    {calendarData?.days.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className="flex-1 p-2 text-center text-sm border-r border-border last:border-r-0"
                      >
                        <div className="font-medium">{format(day, "EEE")}</div>
                        <div className="text-muted-foreground text-xs">{format(day, "MMM d")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle Rows */}
                <TooltipProvider>
                  {filteredVehicles.map((vehicle) => {
                    const vehicleBookings = vehicleBookingsMap.get(vehicle.id) || [];
                    
                    return (
                      <div key={vehicle.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/50">
                        {/* Vehicle Info */}
                        <div className="w-44 flex-shrink-0 p-3 border-r border-border">
                          <div className="font-medium text-sm truncate">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.year} • {vehicle.locationName || "No location"}
                          </div>
                        </div>

                        {/* Timeline Row */}
                        <div className="flex-1 relative h-14">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 flex">
                            {calendarData?.days.map((day) => (
                              <div 
                                key={day.toISOString()} 
                                className="flex-1 border-r border-border/50 last:border-r-0" 
                              />
                            ))}
                          </div>

                          {/* Booking Blocks + Buffers */}
                          {vehicleBookings.map((booking) => {
                            const startDate = parseISO(booking.startAt);
                            const endDate = parseISO(booking.endAt);
                            const bufferEnd = addHours(endDate, vehicle.cleaningBufferHours);
                            
                            if (!calendarData) return null;
                            
                            const bookingPos = getBookingPosition(
                              startDate, 
                              endDate, 
                              calendarData.weekStart, 
                              calendarData.weekEnd
                            );

                            const bufferPos = getBookingPosition(
                              endDate,
                              bufferEnd,
                              calendarData.weekStart,
                              calendarData.weekEnd
                            );

                            const eventType = getEventType(booking);
                            const eventColor = EVENT_TYPE_COLORS[eventType];

                            return (
                              <div key={booking.id}>
                                {/* Booking Block */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => navigate(`/admin/bookings?id=${booking.id}`)}
                                      className={cn(
                                        "absolute top-2 h-7 rounded cursor-pointer transition-all hover:opacity-80 hover:ring-2 hover:ring-primary flex items-center justify-center text-xs font-medium text-white px-2 truncate border-l-4",
                                        eventColor.bg, eventColor.border
                                      )}
                                      style={{
                                        left: bookingPos.left,
                                        width: bookingPos.width,
                                        minWidth: "20px",
                                      }}
                                    >
                                      <span className="truncate">{booking.bookingCode}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="space-y-1">
                                      <div className="font-medium">{booking.bookingCode}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {booking.customerName || booking.customerEmail || "Customer"}
                                      </div>
                                      <div className="text-xs">
                                        {format(startDate, "MMM d, HH:mm")} - {format(endDate, "MMM d, HH:mm")}
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {booking.status}
                                      </Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>

                                {/* Buffer Block */}
                                {vehicle.cleaningBufferHours > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn("absolute top-2 h-7 rounded", BUFFER_COLOR)}
                                        style={{
                                          left: bufferPos.left,
                                          width: bufferPos.width,
                                          minWidth: "4px",
                                        }}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <div className="text-sm">
                                        Cleaning: {vehicle.cleaningBufferHours}h
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {calendarData && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredVehicles.length} vehicles with {filteredBookings.length} bookings this week
          </p>
        )}
      </div>
    </AdminShell>
  );
}
