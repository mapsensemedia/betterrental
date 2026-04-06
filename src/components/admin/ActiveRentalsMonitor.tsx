/**
 * Active Rentals Monitor — real-time dashboard for active bookings
 * Shows progress bars, overdue highlighting, and time-remaining display
 */
import { useMemo } from "react";
import { parseISO, isBefore, formatDistanceToNow, differenceInHours, differenceInMinutes, format } from "date-fns";
import { Car, MapPin, User, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActiveBooking {
  id: string;
  bookingCode: string;
  startAt: string;
  endAt: string;
  status: string;
  profile?: { fullName?: string | null } | null;
  location?: { name?: string } | null;
  vehicle?: { name?: string; [key: string]: any } | null;
}

interface ActiveRentalsMonitorProps {
  bookings: ActiveBooking[];
  onOpen: (id: string) => void;
  className?: string;
}

function getTimeLabel(endAt: string, now: Date): { text: string; isOverdue: boolean } {
  const end = parseISO(endAt);
  const isOverdue = isBefore(end, now);

  const totalMinutes = Math.abs(differenceInMinutes(end, now));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    text: isOverdue ? `${timeStr} overdue` : `${timeStr} left`,
    isOverdue,
  };
}

function getElapsedLabel(startAt: string): { started: string; elapsed: string } {
  const start = parseISO(startAt);
  const now = new Date();
  const started = `Started ${formatDistanceToNow(start, { addSuffix: false })} ago`;
  const elapsedH = differenceInHours(now, start);
  return { started, elapsed: `${elapsedH}h elapsed` };
}

function getProgress(startAt: string, endAt: string): number {
  const start = parseISO(startAt).getTime();
  const end = parseISO(endAt).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

function RentalRow({ booking, onOpen }: { booking: ActiveBooking; onOpen: (id: string) => void }) {
  const now = useMemo(() => new Date(), []);
  const { text: timeText, isOverdue } = getTimeLabel(booking.endAt, now);
  const { started, elapsed } = getElapsedLabel(booking.startAt);
  const progress = getProgress(booking.startAt, booking.endAt);
  const dueDate = format(parseISO(booking.endAt), "h:mm a");

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-4 cursor-pointer transition-colors hover:bg-muted/40",
        isOverdue && "border-destructive/60 bg-destructive/[0.03]"
      )}
      onClick={() => onOpen(booking.id)}
    >
      {/* Top row: booking code + customer + location  |  time remaining */}
      <div className="flex items-start justify-between gap-4 mb-2.5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
              {booking.bookingCode}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {booking.profile?.fullName || "Customer"}
            </span>
            {booking.location?.name && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {booking.location.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-1.5">
          <div>
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              isOverdue ? "text-destructive" : "text-foreground"
            )}>
              {timeText}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Due: {dueDate}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Progress bar */}
      <div className={cn(
        "h-1.5 rounded-full overflow-hidden mb-2",
        isOverdue ? "bg-destructive/10" : "bg-muted"
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isOverdue
              ? "bg-destructive"
              : progress > 75
                ? "bg-foreground"
                : "bg-foreground/70"
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground">
        {started} • {elapsed}
      </p>
    </div>
  );
}

export function ActiveRentalsMonitor({ bookings, onOpen, className }: ActiveRentalsMonitorProps) {
  const now = useMemo(() => new Date(), []);

  const { overdue, onSchedule } = useMemo(() => {
    const overdue: ActiveBooking[] = [];
    const onSchedule: ActiveBooking[] = [];
    for (const b of bookings) {
      if (isBefore(parseISO(b.endAt), now)) {
        overdue.push(b);
      } else {
        onSchedule.push(b);
      }
    }
    overdue.sort((a, b) => parseISO(a.endAt).getTime() - parseISO(b.endAt).getTime());
    onSchedule.sort((a, b) => parseISO(a.endAt).getTime() - parseISO(b.endAt).getTime());
    return { overdue, onSchedule };
  }, [bookings, now]);

  const total = bookings.length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Active Rentals Monitor</CardTitle>
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-green-600">Live</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">{total} active</span>
        </div>
        {overdue.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">{overdue.length} overdue</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {total === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">No active rentals</p>
        ) : (
          <>
            {overdue.map((b) => (
              <RentalRow key={b.id} booking={b} onOpen={onOpen} />
            ))}
            {onSchedule.map((b) => (
              <RentalRow key={b.id} booking={b} onOpen={onOpen} />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
