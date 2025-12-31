import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useCalendarData } from "@/hooks/use-calendar";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Car } from "lucide-react";
import { format, isWithinInterval, parseISO, differenceInHours, addHours } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-500",
  active: "bg-green-500",
};

const BUFFER_COLOR = "bg-muted-foreground/30";

export default function AdminCalendar() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [locationFilter, setLocationFilter] = useState<string>("");

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

  const vehicleBookingsMap = useMemo(() => {
    if (!calendarData) return new Map();
    
    const map = new Map<string, typeof calendarData.bookings>();
    calendarData.vehicles.forEach(v => {
      const vehicleBookings = calendarData.bookings.filter(b => b.vehicleId === v.id);
      map.set(v.id, vehicleBookings);
    });
    return map;
  }, [calendarData]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">Fleet schedule and availability timeline</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Location Filter */}
            <Select value={locationFilter || "all"} onValueChange={(v) => setLocationFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
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

        {/* Week Header */}
        {calendarData && (
          <div className="text-center">
            <h2 className="text-lg font-medium">
              {format(calendarData.weekStart, "MMM d")} - {format(calendarData.weekEnd, "MMM d, yyyy")}
            </h2>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-muted-foreground">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-muted-foreground">Active</span>
          </div>
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
            ) : !calendarData?.vehicles.length ? (
              <div className="p-12 text-center">
                <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No vehicles found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Day Headers */}
                <div className="flex border-b border-border sticky top-0 bg-card z-10">
                  <div className="w-48 flex-shrink-0 p-3 font-medium text-sm border-r border-border">
                    Vehicle
                  </div>
                  <div className="flex-1 flex">
                    {calendarData.days.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className="flex-1 p-3 text-center text-sm border-r border-border last:border-r-0"
                      >
                        <div className="font-medium">{format(day, "EEE")}</div>
                        <div className="text-muted-foreground">{format(day, "MMM d")}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle Rows */}
                <TooltipProvider>
                  {calendarData.vehicles.map((vehicle) => {
                    const vehicleBookings = vehicleBookingsMap.get(vehicle.id) || [];
                    
                    return (
                      <div key={vehicle.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/50">
                        {/* Vehicle Info */}
                        <div className="w-48 flex-shrink-0 p-3 border-r border-border">
                          <div className="font-medium text-sm truncate">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.year} • {vehicle.locationName || "No location"}
                          </div>
                        </div>

                        {/* Timeline Row */}
                        <div className="flex-1 relative h-16">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 flex">
                            {calendarData.days.map((day) => (
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

                            return (
                              <div key={booking.id}>
                                {/* Booking Block */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => navigate(`/admin/bookings?id=${booking.id}`)}
                                      className={cn(
                                        "absolute top-2 h-8 rounded-md cursor-pointer transition-all hover:opacity-80 hover:ring-2 hover:ring-primary flex items-center justify-center text-xs font-medium text-white px-2 truncate",
                                        STATUS_COLORS[booking.status] || "bg-gray-500"
                                      )}
                                      style={{
                                        left: bookingPos.left,
                                        width: bookingPos.width,
                                        minWidth: "24px",
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
                                        className={cn(
                                          "absolute top-2 h-8 rounded-md",
                                          BUFFER_COLOR
                                        )}
                                        style={{
                                          left: bufferPos.left,
                                          width: bufferPos.width,
                                          minWidth: "4px",
                                        }}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <div className="text-sm">
                                        Cleaning buffer: {vehicle.cleaningBufferHours}h
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

        {/* Vehicle Count */}
        {calendarData && (
          <p className="text-sm text-muted-foreground">
            Showing {calendarData.vehicles.length} vehicles with {calendarData.bookings.length} bookings this week
          </p>
        )}
      </div>
    </AdminShell>
  );
}
