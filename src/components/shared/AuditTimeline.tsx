import { format } from "date-fns";
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
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  createdAt: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

interface AuditTimelineProps {
  events: AuditEvent[];
  className?: string;
}

const ACTION_ICONS: Record<string, typeof Clock> = {
  booking_created: FileText,
  booking_status_change: AlertCircle,
  payment_received: CreditCard,
  verification_submitted: User,
  verification_approved: CheckCircle2,
  verification_rejected: XCircle,
  photo_uploaded: Camera,
  vehicle_assigned: Car,
  location_changed: MapPin,
};

const ACTION_COLORS: Record<string, string> = {
  booking_created: "text-primary bg-primary/10",
  booking_status_change: "text-amber-600 bg-amber-50",
  payment_received: "text-emerald-600 bg-emerald-50",
  verification_submitted: "text-blue-600 bg-blue-50",
  verification_approved: "text-emerald-600 bg-emerald-50",
  verification_rejected: "text-destructive bg-destructive/10",
  photo_uploaded: "text-violet-600 bg-violet-50",
  default: "text-muted-foreground bg-muted",
};

function getActionLabel(action: string, newData?: Record<string, unknown> | null): string {
  switch (action) {
    case "booking_created":
      return "Booking created";
    case "booking_status_change":
      return `Status changed to ${newData?.new_status || "unknown"}`;
    case "payment_received":
      return `Payment received: $${newData?.amount || 0}`;
    case "verification_submitted":
      return "Verification documents submitted";
    case "verification_approved":
      return "Verification approved";
    case "verification_rejected":
      return `Verification rejected: ${newData?.reason || "No reason provided"}`;
    case "photo_uploaded":
      return `${newData?.phase || "Condition"} photo uploaded`;
    default:
      return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }
}

export function AuditTimeline({ events, className }: AuditTimelineProps) {
  if (!events.length) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      
      <div className="space-y-4">
        {events.map((event, index) => {
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
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">
                  {getActionLabel(event.action, event.newData as Record<string, unknown> | null)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
