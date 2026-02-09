/**
 * BookingEditPanel - Edit booking dates, time, location, and duration
 * before rental activation with automatic pricing recalculation.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Calendar, MapPin, Clock, TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import { format, addDays } from "date-fns";
import { previewBookingEdit, useEditBooking, useLocations } from "@/hooks/use-booking-edit";
import { cn } from "@/lib/utils";

interface BookingEditPanelProps {
  booking: {
    id: string;
    start_at: string;
    end_at: string;
    daily_rate: number;
    total_days: number;
    total_amount: number;
    subtotal: number;
    tax_amount: number | null;
    driver_age_band: string | null;
    protection_plan: string | null;
    young_driver_fee: number | null;
    status: string;
    location_id: string;
    locations?: { name: string } | null;
  };
}

export function BookingEditPanel({ booking }: BookingEditPanelProps) {
  const isEditable = ["pending", "confirmed"].includes(booking.status);
  const [startAt, setStartAt] = useState(booking.start_at);
  const [endAt, setEndAt] = useState(booking.end_at);
  const [locationId, setLocationId] = useState(booking.location_id);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const editBooking = useEditBooking();
  const { data: locations = [] } = useLocations();

  // Detect if anything changed
  const hasChanges = startAt !== booking.start_at || endAt !== booking.end_at || locationId !== booking.location_id;

  // Preview pricing
  const preview = useMemo(() => {
    if (!hasChanges) return null;
    try {
      return previewBookingEdit(booking, startAt, endAt);
    } catch {
      return null;
    }
  }, [hasChanges, startAt, endAt, booking]);

  const formatLocalDatetime = (isoString: string) => {
    return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm");
  };

  const handleQuickExtend = (days: number) => {
    const currentEnd = new Date(endAt);
    setEndAt(addDays(currentEnd, days).toISOString());
  };

  const handleConfirm = () => {
    if (!reason.trim()) return;
    editBooking.mutate(
      {
        bookingId: booking.id,
        startAt: startAt !== booking.start_at ? startAt : undefined,
        endAt: endAt !== booking.end_at ? endAt : undefined,
        locationId: locationId !== booking.location_id ? locationId : undefined,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setReason("");
        },
      }
    );
  };

  const priceDiff = preview?.priceDifference ?? 0;
  const locationChanged = locationId !== booking.location_id;

  if (!isEditable) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Booking Details
            <Badge variant="outline" className="text-xs">Read-Only</Badge>
          </CardTitle>
          <CardDescription>
            Booking details cannot be edited after rental activation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Pickup</span>
              <p className="font-medium">{format(new Date(booking.start_at), "MMM d, yyyy h:mm a")}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Return</span>
              <p className="font-medium">{format(new Date(booking.end_at), "MMM d, yyyy h:mm a")}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Duration</span>
              <p className="font-medium">{booking.total_days} day{booking.total_days !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Location</span>
              <p className="font-medium">{booking.locations?.name || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Total</span>
              <p className="font-semibold text-lg">${booking.total_amount.toFixed(2)} CAD</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Edit Booking Details
          </CardTitle>
          <CardDescription>
            Change dates, time, location, or duration. Pricing recalculates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup Date & Time */}
          <div>
            <Label htmlFor="edit-start" className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Pickup Date & Time
            </Label>
            <input
              id="edit-start"
              type="datetime-local"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1.5"
              value={formatLocalDatetime(startAt)}
              onChange={(e) => {
                if (e.target.value) {
                  const newStart = new Date(e.target.value).toISOString();
                  setStartAt(newStart);
                  // Auto-adjust end if it's before new start
                  if (new Date(newStart) >= new Date(endAt)) {
                    setEndAt(addDays(new Date(newStart), 1).toISOString());
                  }
                }
              }}
            />
          </div>

          {/* Return Date & Time */}
          <div>
            <Label htmlFor="edit-end" className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Return Date & Time
            </Label>
            <input
              id="edit-end"
              type="datetime-local"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1.5"
              value={formatLocalDatetime(endAt)}
              min={formatLocalDatetime(startAt)}
              onChange={(e) => {
                if (e.target.value) setEndAt(new Date(e.target.value).toISOString());
              }}
            />
          </div>

          {/* Quick Extend */}
          <div>
            <Label className="text-xs text-muted-foreground">Quick Extend Return</Label>
            <div className="flex gap-2 mt-1.5">
              {[1, 2, 3, 5, 7].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickExtend(days)}
                  className="text-xs h-7 px-2"
                >
                  +{days}d
                </Button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Pickup Location
            </Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} — {loc.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {locationChanged && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Changing location will clear the assigned vehicle.
              </p>
            )}
          </div>

          <Separator />

          {/* Pricing Preview */}
          {preview && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Updated Pricing
              </h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Duration</p>
                  <p className="font-medium">
                    {preview.originalDays}d → {preview.newDays}d
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Daily Rate</p>
                  <p className="font-medium">${preview.dailyRate.toFixed(2)}/day</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Current Total</span>
                  <p className="text-sm font-medium">${preview.originalTotal.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">New Total</span>
                  <p className="text-sm font-semibold">${preview.newTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium">Difference</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold",
                    priceDiff > 0 && "border-amber-500/30 text-amber-600 bg-amber-500/10",
                    priceDiff < 0 && "border-emerald-500/30 text-emerald-600 bg-emerald-500/10",
                    priceDiff === 0 && "border-muted text-muted-foreground"
                  )}
                >
                  {priceDiff > 0 ? (
                    <><TrendingUp className="w-3 h-3 mr-1" /> +${priceDiff.toFixed(2)} CAD</>
                  ) : priceDiff < 0 ? (
                    <><TrendingDown className="w-3 h-3 mr-1" /> -${Math.abs(priceDiff).toFixed(2)} CAD</>
                  ) : (
                    <><Minus className="w-3 h-3 mr-1" /> No change</>
                  )}
                </Badge>
              </div>
            </div>
          )}

          {/* Apply */}
          <Button
            className="w-full"
            disabled={!hasChanges || editBooking.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {editBooking.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking Edit</AlertDialogTitle>
            <AlertDialogDescription>
              {preview && (
                <span>
                  Duration: {preview.originalDays} → {preview.newDays} day{preview.newDays !== 1 ? "s" : ""}
                  {priceDiff !== 0 && (
                    <>. Price {priceDiff > 0 ? "increase" : "decrease"}: ${Math.abs(priceDiff).toFixed(2)} CAD</>
                  )}
                  {locationChanged && ". Location changed — vehicle assignment will be cleared."}
                </span>
              )}
              {!preview && locationChanged && (
                <span>Location changed — vehicle assignment will be cleared.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Label htmlFor="edit-reason" className="text-sm font-medium">
              Reason for edit <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-reason"
              placeholder="e.g., Customer requested date change at counter"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!reason.trim() || editBooking.isPending}
            >
              {editBooking.isPending ? "Saving..." : "Confirm Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
