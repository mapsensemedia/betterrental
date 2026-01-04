import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useActiveRentals, ActiveRental } from "@/hooks/use-active-rentals";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Timer,
  User,
  MapPin,
  Search,
  Phone,
  Mail,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type FilterType = "all" | "overdue" | "approaching" | "warning" | "healthy";

export default function AdminActiveRentals() {
  const navigate = useNavigate();
  const { data: rentals = [], isLoading, refetch, isFetching } = useActiveRentals();
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Apply filters
  const filteredRentals = rentals.filter((rental) => {
    // Status filter
    if (filter === "overdue" && !rental.isOverdue) return false;
    if (filter === "approaching" && !rental.isApproachingReturn) return false;
    if (filter === "warning" && !rental.isWarningZone) return false;
    if (filter === "healthy" && (rental.isOverdue || rental.isApproachingReturn || rental.isWarningZone)) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCode = rental.bookingCode.toLowerCase().includes(query);
      const matchesVehicle = `${rental.vehicle?.make} ${rental.vehicle?.model}`.toLowerCase().includes(query);
      const matchesCustomer = rental.customer?.fullName?.toLowerCase().includes(query);
      const matchesLocation = rental.location?.city?.toLowerCase().includes(query);
      if (!matchesCode && !matchesVehicle && !matchesCustomer && !matchesLocation) return false;
    }

    return true;
  });

  // Sort: overdue first, then approaching, then by end time
  const sortedRentals = [...filteredRentals].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isApproachingReturn && !b.isApproachingReturn) return -1;
    if (!a.isApproachingReturn && b.isApproachingReturn) return 1;
    return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
  });

  // Stats
  const stats = {
    total: rentals.length,
    overdue: rentals.filter(r => r.isOverdue).length,
    approaching: rentals.filter(r => r.isApproachingReturn).length,
    warning: rentals.filter(r => r.isWarningZone).length,
    healthy: rentals.filter(r => !r.isOverdue && !r.isApproachingReturn && !r.isWarningZone).length,
  };

  const getStatusColor = (rental: ActiveRental) => {
    if (rental.isOverdue) return "border-destructive/50 bg-destructive/5";
    if (rental.isApproachingReturn) return "border-amber-500/50 bg-amber-500/5";
    if (rental.isWarningZone) return "border-yellow-500/30 bg-yellow-500/5";
    return "border-border";
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Car className="w-6 h-6 text-primary" />
              Active Rentals
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor all vehicles currently out on rental
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card 
            className={`cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter("all")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === "overdue" ? "ring-2 ring-destructive" : ""}`}
            onClick={() => setFilter("overdue")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{isLoading ? "..." : stats.overdue}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === "approaching" ? "ring-2 ring-amber-500" : ""}`}
            onClick={() => setFilter("approaching")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{isLoading ? "..." : stats.approaching}</p>
                  <p className="text-xs text-muted-foreground">Due Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === "warning" ? "ring-2 ring-yellow-500" : ""}`}
            onClick={() => setFilter("warning")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{isLoading ? "..." : stats.warning}</p>
                  <p className="text-xs text-muted-foreground">Within 6h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${filter === "healthy" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => setFilter("healthy")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{isLoading ? "..." : stats.healthy}</p>
                  <p className="text-xs text-muted-foreground">On Schedule</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, vehicle, customer, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="hidden sm:block">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="overdue" className="text-destructive">Overdue</TabsTrigger>
              <TabsTrigger value="approaching" className="text-amber-600">Due Soon</TabsTrigger>
              <TabsTrigger value="healthy" className="text-green-600">On Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Rentals List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {filter === "all" ? "All Active Rentals" : 
               filter === "overdue" ? "Overdue Rentals" :
               filter === "approaching" ? "Rentals Due Soon (within 2h)" :
               filter === "warning" ? "Rentals Due Within 6h" :
               "On Schedule Rentals"}
            </CardTitle>
            <CardDescription>
              {sortedRentals.length} rental{sortedRentals.length !== 1 ? "s" : ""} 
              {searchQuery && ` matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : sortedRentals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No rentals found</p>
                <p className="text-sm mt-1">
                  {filter !== "all" 
                    ? "Try changing the filter or search query"
                    : "There are no active rentals at this time"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedRentals.map((rental) => (
                  <div
                    key={rental.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${getStatusColor(rental)}`}
                    onClick={() => navigate(`/admin/bookings/${rental.id}/ops?returnTo=/admin/active-rentals`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Vehicle & Customer info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold truncate">
                            {rental.vehicle?.year} {rental.vehicle?.make} {rental.vehicle?.model}
                          </span>
                          <Badge variant="outline" className="font-mono text-xs shrink-0">
                            {rental.bookingCode}
                          </Badge>
                          {rental.isOverdue && (
                            <Badge variant="destructive" className="shrink-0">Overdue</Badge>
                          )}
                          {rental.isApproachingReturn && (
                            <Badge className="bg-amber-500 shrink-0">Due Soon</Badge>
                          )}
                        </div>

                        {/* Customer details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 shrink-0" />
                            <span className="truncate">{rental.customer?.fullName || "Unknown"}</span>
                          </div>
                          {rental.customer?.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>{rental.customer.phone}</span>
                            </div>
                          )}
                          {rental.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span>{rental.location.city}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side - Time status */}
                      <div className="text-right shrink-0">
                        {rental.isOverdue ? (
                          <div className="text-destructive">
                            <p className="font-bold text-lg">
                              {rental.overdueHours}h overdue
                            </p>
                            <p className="text-xs">
                              Was due: {format(new Date(rental.endAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        ) : (
                          <div className={rental.isApproachingReturn ? "text-amber-600" : rental.isWarningZone ? "text-yellow-600" : ""}>
                            <p className="font-bold text-lg">
                              {rental.remainingHours > 0 
                                ? `${rental.remainingHours}h ${rental.remainingMinutes % 60}m`
                                : `${rental.remainingMinutes}m`
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(rental.endAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>

                    {/* Duration progress bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            rental.isOverdue 
                              ? "bg-destructive" 
                              : rental.isApproachingReturn 
                              ? "bg-amber-500"
                              : rental.isWarningZone
                              ? "bg-yellow-500"
                              : "bg-primary"
                          }`}
                          style={{
                            width: rental.isOverdue 
                              ? "100%" 
                              : `${Math.max(0, Math.min(100, 100 - (rental.remainingMinutes / (rental.durationHours * 60 + rental.remainingMinutes)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>Started {formatDistanceToNow(new Date(rental.startAt), { addSuffix: true })}</span>
                        <span>{rental.durationHours}h elapsed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}