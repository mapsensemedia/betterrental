/**
 * Activity Timeline for booking operations
 * Shows who did what and when during the rental process
 */
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Camera, 
  CreditCard,
  User,
  Car,
  MapPin,
  PenLine,
  Eye,
  Shield,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OpsActivityTimelineProps {
  bookingId: string;
  className?: string;
}

interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  createdAt: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  userName?: string;
}

const ACTION_ICONS: Record<string, typeof Clock> = {
  booking_created: FileText,
  booking_status_change: AlertCircle,
  payment_received: CreditCard,
  deposit_held: CreditCard,
  deposit_released: CreditCard,
  verification_submitted: User,
  verification_approved: CheckCircle2,
  verification_rejected: XCircle,
  photo_uploaded: Camera,
  vehicle_assigned: Car,
  unit_assigned: Car,
  location_changed: MapPin,
  walkaround_started: Eye,
  walkaround_completed: CheckCircle2,
  walkaround_admin_override: Shield,
  agreement_generated: FileText,
  agreement_signed: PenLine,
  agreement_confirmed: CheckCircle2,
  checkin_completed: User,
  rental_activated: Car,
  rental_returned: Car,
};

const ACTION_COLORS: Record<string, string> = {
  booking_created: "text-primary bg-primary/10",
  booking_status_change: "text-amber-600 bg-amber-100 dark:bg-amber-950/50",
  payment_received: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  deposit_held: "text-blue-600 bg-blue-100 dark:bg-blue-950/50",
  deposit_released: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  verification_submitted: "text-blue-600 bg-blue-100 dark:bg-blue-950/50",
  verification_approved: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  verification_rejected: "text-destructive bg-destructive/10",
  photo_uploaded: "text-violet-600 bg-violet-100 dark:bg-violet-950/50",
  vehicle_assigned: "text-sky-600 bg-sky-100 dark:bg-sky-950/50",
  unit_assigned: "text-sky-600 bg-sky-100 dark:bg-sky-950/50",
  walkaround_started: "text-blue-600 bg-blue-100 dark:bg-blue-950/50",
  walkaround_completed: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  walkaround_admin_override: "text-amber-600 bg-amber-100 dark:bg-amber-950/50",
  agreement_generated: "text-blue-600 bg-blue-100 dark:bg-blue-950/50",
  agreement_signed: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  agreement_confirmed: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  checkin_completed: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  rental_activated: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50",
  rental_returned: "text-blue-600 bg-blue-100 dark:bg-blue-950/50",
  default: "text-muted-foreground bg-muted",
};

function getActionLabel(action: string, newData?: Record<string, unknown> | null): string {
  switch (action) {
    case "booking_created":
      return "Booking created";
    case "booking_status_change":
      return `Status → ${(newData?.new_status as string) || (newData?.status as string) || "updated"}`;
    case "payment_received":
      return `Payment received: $${newData?.amount || 0}`;
    case "deposit_held":
      return `Deposit held: $${newData?.amount || 0}`;
    case "deposit_released":
      return `Deposit released: $${newData?.amount || 0}`;
    case "verification_submitted":
      return "Documents uploaded";
    case "verification_approved":
      return "Verification approved";
    case "verification_rejected":
      return `Verification rejected: ${newData?.reason || ""}`;
    case "photo_uploaded":
      return `${(newData?.phase as string) || "Condition"} photo captured`;
    case "vehicle_assigned":
      return "Vehicle assigned";
    case "unit_assigned":
      return "VIN unit assigned";
    case "walkaround_started":
      return "Walkaround inspection started";
    case "walkaround_completed":
      return "Walkaround completed & signed";
    case "walkaround_admin_override":
      return "Walkaround completed (admin override)";
    case "agreement_generated":
      return "Rental agreement generated";
    case "agreement_signed":
      return "Agreement signed by customer";
    case "agreement_confirmed":
      return "Agreement confirmed by staff";
    case "checkin_completed":
      return "Customer checked in";
    case "rental_activated":
      return "Rental activated";
    case "rental_returned":
      return "Vehicle returned";
    default:
      return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }
}

export function OpsActivityTimeline({ bookingId, className }: OpsActivityTimelineProps) {
  const { data: events, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["booking-activity-timeline", bookingId],
    queryFn: async () => {
      // Fetch audit logs for this booking across multiple entity types
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .or(`entity_id.eq.${bookingId},new_data->>booking_id.eq.${bookingId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      let profiles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || "Staff";
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        userId: log.user_id,
        createdAt: log.created_at,
        oldData: log.old_data as Record<string, unknown> | null,
        newData: log.new_data as Record<string, unknown> | null,
        userName: log.user_id ? profiles[log.user_id] : undefined,
      })) as ActivityEvent[];
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events?.length) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px] pr-3">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {events.map((event) => {
                const Icon = ACTION_ICONS[event.action] || Clock;
                const colorClass = ACTION_COLORS[event.action] || ACTION_COLORS.default;
                
                return (
                  <div key={event.id} className="relative pl-10">
                    {/* Icon */}
                    <div className={cn(
                      "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center",
                      colorClass
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {/* Content */}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getActionLabel(event.action, event.newData)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.createdAt), "MMM d, h:mm a")}
                        </span>
                        {event.userName && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {event.userName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
