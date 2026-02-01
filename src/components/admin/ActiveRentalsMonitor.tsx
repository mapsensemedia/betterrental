import { useActiveRentalStats } from "@/hooks/use-active-rentals";
import { useRealtimeBookings } from "@/hooks/use-realtime-subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Car, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight,
  Timer,
  User,
  MapPin,
  Radio,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function ActiveRentalsMonitor() {
  const { stats, rentals, isLoading } = useActiveRentalStats();
  const navigate = useNavigate();
  
  // Enable real-time updates
  useRealtimeBookings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5" />
            Active Rentals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5 text-primary" />
            Active Rentals Monitor
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse" />
              Live
            </Badge>
          </CardTitle>
          <Badge variant="outline">{stats.total} active</Badge>
        </div>
        
        {/* Quick stats */}
        <div className="flex gap-3 mt-3">
          {stats.overdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdue} overdue
            </Badge>
          )}
          {stats.approaching > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
              <Timer className="h-3 w-3" />
              {stats.approaching} due soon
            </Badge>
          )}
          {stats.warning > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {stats.warning} in 6h
            </Badge>
          )}
          {stats.healthy > 0 && stats.overdue === 0 && stats.approaching === 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
              <CheckCircle className="h-3 w-3" />
              All on schedule
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {rentals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active rentals</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Sort: overdue first, then approaching, then by end time */}
            {rentals
              .sort((a, b) => {
                if (a.isOverdue && !b.isOverdue) return -1;
                if (!a.isOverdue && b.isOverdue) return 1;
                if (a.isApproachingReturn && !b.isApproachingReturn) return -1;
                if (!a.isApproachingReturn && b.isApproachingReturn) return 1;
                return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
              })
              .slice(0, 10)
              .map((rental) => (
                <div
                  key={rental.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    rental.isOverdue 
                      ? "border-destructive/50 bg-destructive/5" 
                      : rental.isApproachingReturn 
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-border"
                  }`}
                  onClick={() => navigate(`/admin/active-rentals/${rental.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Vehicle & Code */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {rental.vehicle?.year} {rental.vehicle?.make} {rental.vehicle?.model}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {rental.bookingCode}
                        </Badge>
                      </div>
                      
                      {/* Customer & Location */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {rental.customer?.fullName || "Unknown"}
                        </span>
                        {rental.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {rental.location.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time status */}
                    <div className="text-right shrink-0">
                      {rental.isOverdue ? (
                        <div className="text-destructive">
                          <p className="font-semibold text-sm">
                            {rental.overdueHours}h overdue
                          </p>
                          <p className="text-xs">
                            Due: {format(new Date(rental.endAt), "h:mm a")}
                          </p>
                        </div>
                      ) : (
                        <div className={rental.isApproachingReturn ? "text-amber-600" : ""}>
                          <p className="font-semibold text-sm">
                            {rental.remainingHours > 0 
                              ? `${rental.remainingHours}h ${rental.remainingMinutes % 60}m left`
                              : `${rental.remainingMinutes}m left`
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(rental.endAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Duration bar */}
                  <div className="mt-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          rental.isOverdue 
                            ? "bg-destructive" 
                            : rental.isApproachingReturn 
                            ? "bg-amber-500"
                            : "bg-primary"
                        }`}
                        style={{
                          width: rental.isOverdue 
                            ? "100%" 
                            : `${Math.max(0, Math.min(100, 100 - (rental.remainingMinutes / (rental.durationHours * 60 + rental.remainingMinutes)) * 100))}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started {formatDistanceToNow(new Date(rental.startAt), { addSuffix: true })} • {rental.durationHours}h elapsed
                    </p>
                  </div>
                </div>
              ))}

            {rentals.length > 10 && (
              <>
                <Separator />
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => navigate("/admin/returns")}
                >
                  View all {rentals.length} active rentals
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
