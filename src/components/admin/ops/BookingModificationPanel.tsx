/**
 * BookingModificationPanel - Allows staff to extend or modify rental dates
 * with automatic pricing recalculation and audit trail.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Calendar, Clock, ArrowRight, TrendingUp, TrendingDown, Minus, Gauge } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { previewModification, useModifyBooking, type ModificationPreview } from "@/hooks/use-booking-modification";
import { cn } from "@/lib/utils";

interface BookingModificationPanelProps {
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
  };
}

/** Last known odometer reading: latest extension → pickup inspection → vehicle unit mileage */
function useLastKnownOdometer(bookingId: string) {
  return useQuery({
    queryKey: ["last-known-odometer", bookingId],
    queryFn: async () => {
      const [{ data: ext }, { data: pickup }, { data: bookingRow }] = await Promise.all([
        supabase
          .from("booking_extensions")
          .select("odometer_km")
          .eq("booking_id", bookingId)
          .not("odometer_km", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("inspection_metrics")
          .select("odometer")
          .eq("booking_id", bookingId)
          .eq("phase", "pickup")
          .maybeSingle(),
        supabase
          .from("bookings")
          .select("assigned_unit_id")
          .eq("id", bookingId)
          .maybeSingle(),
      ]);

      if (ext?.odometer_km != null) return { km: ext.odometer_km, source: "last extension" };
      if (pickup?.odometer != null) return { km: pickup.odometer, source: "pickup inspection" };

      if (bookingRow?.assigned_unit_id) {
        const { data: unit } = await supabase
          .from("vehicle_units")
          .select("current_mileage")
          .eq("id", bookingRow.assigned_unit_id)
          .maybeSingle();
        if (unit?.current_mileage != null) {
          return { km: unit.current_mileage, source: "vehicle record" };
        }
      }
      return null;
    },
  });
}

export function BookingModificationPanel({ booking }: BookingModificationPanelProps) {
  const [newEndDate, setNewEndDate] = useState(booking.end_at);
  const [reason, setReason] = useState("");
  const [odometerInput, setOdometerInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modifyBooking = useModifyBooking();
  const { data: lastKnownOdometer } = useLastKnownOdometer(booking.id);

  const canModify = ["pending", "confirmed", "active"].includes(booking.status);

  const preview = useMemo<ModificationPreview | null>(() => {
    if (!newEndDate || newEndDate === booking.end_at) return null;
    return previewModification(booking, newEndDate);
  }, [newEndDate, booking]);

  const isExtension = !!newEndDate && new Date(newEndDate) > new Date(booking.end_at);
  const odometerValue = odometerInput.trim() === "" ? null : Number(odometerInput);
  const odometerError = (() => {
    if (!isExtension) return null;
    if (odometerValue == null) return "Enter the vehicle's current odometer reading.";
    if (!Number.isFinite(odometerValue) || !Number.isInteger(odometerValue) || odometerValue < 0) {
      return "Enter a whole number of kilometres.";
    }
    if (lastKnownOdometer && odometerValue < lastKnownOdometer.km) {
      return `Must be at least ${lastKnownOdometer.km.toLocaleString()} km (last recorded reading).`;
    }
    return null;
  })();
  const odometerReady = !isExtension || (odometerValue != null && !odometerError);


  const handleQuickExtend = (days: number) => {
    const currentEnd = new Date(booking.end_at);
    const newEnd = addDays(currentEnd, days);
    setNewEndDate(newEnd.toISOString());
  };

  const handleDateTimeChange = (value: string) => {
    // value comes from datetime-local input as "YYYY-MM-DDTHH:mm"
    if (value) {
      setNewEndDate(new Date(value).toISOString());
    }
  };

  const handleConfirm = () => {
    if (!reason.trim() || !odometerReady) return;
    modifyBooking.mutate(
      {
        bookingId: booking.id,
        newEndAt: newEndDate,
        reason: reason.trim(),
        ...(isExtension && odometerValue != null ? { currentOdometerKm: odometerValue } : {}),
      },
      { onSuccess: () => { setConfirmOpen(false); setReason(""); setOdometerInput(""); } }
    );
  };


  if (!canModify) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Booking modifications are only available for pending, confirmed, or active bookings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatLocalDatetime = (isoString: string) => {
    const d = new Date(isoString);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  };

  const priceDiff = preview?.priceDifference ?? 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Modify Rental Duration
          </CardTitle>
          <CardDescription>
            Extend or shorten the rental period — pricing will be recalculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current dates */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Pickup</span>
              <p className="font-medium">{format(new Date(booking.start_at), "MMM d, h:mm a")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current Return</span>
              <p className="font-medium">{format(new Date(booking.end_at), "MMM d, h:mm a")}</p>
            </div>
          </div>

          <Separator />

          {/* Quick extend buttons */}
          <div>
            <Label className="text-sm font-medium">Quick Extend</Label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 5, 7].map(days => (
                <Button
                  key={days}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickExtend(days)}
                  className="text-xs"
                >
                  +{days}d
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date picker */}
          <div>
            <Label htmlFor="new-end-date" className="text-sm font-medium">
              New Return Date & Time
            </Label>
            <input
              id="new-end-date"
              type="datetime-local"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1.5"
              value={formatLocalDatetime(newEndDate)}
              min={formatLocalDatetime(booking.start_at)}
              onChange={(e) => handleDateTimeChange(e.target.value)}
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Pricing Preview
              </h4>

              <div className="grid grid-cols-3 gap-2 text-sm text-center">
                <div>
                  <p className="text-muted-foreground text-xs">Current</p>
                  <p className="font-semibold">{preview.originalDays} days</p>
                  <p className="text-xs text-muted-foreground">${preview.originalTotal.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">New</p>
                  <p className="font-semibold">{preview.newDays} days</p>
                  <p className="text-xs text-muted-foreground">${preview.newTotal.toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Price Difference</span>
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

              {priceDiff > 0 && (
                <p className="text-xs text-muted-foreground">
                  Additional payment of ${priceDiff.toFixed(2)} CAD will need to be collected.
                </p>
              )}
              {priceDiff < 0 && (
                <p className="text-xs text-muted-foreground">
                  A refund of ${Math.abs(priceDiff).toFixed(2)} CAD may be applicable.
                </p>
              )}
            </div>
          )}

          {/* Odometer capture — required when extending the rental */}
          {isExtension && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <Label htmlFor="extension-odometer" className="flex items-center gap-2 text-sm font-medium">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                Current odometer (km) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="extension-odometer"
                type="number"
                inputMode="numeric"
                min={lastKnownOdometer?.km ?? 0}
                step={1}
                placeholder="e.g., 48210"
                value={odometerInput}
                onChange={(e) => setOdometerInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {lastKnownOdometer
                  ? `Last recorded: ${lastKnownOdometer.km.toLocaleString()} km (${lastKnownOdometer.source}).`
                  : "No previous reading on file."}{" "}
                This becomes the "Kilometres out" on the new extension agreement.
              </p>
              {odometerError && odometerInput.trim() !== "" && (
                <p className="text-xs text-destructive">{odometerError}</p>
              )}
            </div>
          )}

          {/* Apply button */}
          <Button
            className="w-full"
            disabled={!preview || preview.addedDays === 0 || modifyBooking.isPending || !odometerReady}
            onClick={() => setConfirmOpen(true)}
          >
            {modifyBooking.isPending ? "Updating..." : "Apply Changes"}
          </Button>

        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking Modification</AlertDialogTitle>
            <AlertDialogDescription>
              {preview && (
                <span>
                  This will change the rental from {preview.originalDays} to {preview.newDays} days.
                  {priceDiff > 0 && ` Additional charge: $${priceDiff.toFixed(2)} CAD.`}
                  {priceDiff < 0 && ` Refund: $${Math.abs(priceDiff).toFixed(2)} CAD.`}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Label htmlFor="mod-reason" className="text-sm font-medium">
              Reason for modification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="mod-reason"
              placeholder="e.g., Customer requested 2 additional days at pickup counter"
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
              disabled={!reason.trim() || modifyBooking.isPending}
            >
              {modifyBooking.isPending ? "Updating..." : "Confirm Modification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
