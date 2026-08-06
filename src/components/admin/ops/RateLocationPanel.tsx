/**
 * RateLocationPanel - Change the agreed daily rate and the pickup location.
 *
 * Dates deliberately live in the Dates & duration section of ModifyRentalPanel
 * so every duration change goes through the priced, recorded extension path.
 * All financial writes go through the reprice-booking edge function.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DollarSign, MapPin } from "lucide-react";
import { useEditBooking, useLocations } from "@/hooks/use-booking-edit";

interface RateLocationPanelProps {
  booking: {
    id: string;
    daily_rate: number;
    location_id: string;
    total_days: number;
    status: string;
  };
}

export function RateLocationPanel({ booking }: RateLocationPanelProps) {
  const [dailyRate, setDailyRate] = useState(booking.daily_rate.toString());
  const [locationId, setLocationId] = useState(booking.location_id);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const editBooking = useEditBooking();
  const { data: locations = [] } = useLocations();

  const parsedRate = parseFloat(dailyRate);
  const rateChanged = !isNaN(parsedRate) && parsedRate !== booking.daily_rate;
  const locationChanged = locationId !== booking.location_id;
  const hasChanges = rateChanged || locationChanged;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    editBooking.mutate(
      {
        bookingId: booking.id,
        dailyRate: rateChanged ? parsedRate : undefined,
        currentDailyRate: booking.daily_rate,
        locationId: locationChanged ? locationId : undefined,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setReason("");
        },
      },
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label htmlFor="modify-rate" className="text-sm font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Daily Rate (CAD)
          </Label>
          <Input
            id="modify-rate"
            type="number"
            step="0.01"
            min="0"
            className="mt-1.5"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
          />
          {rateChanged && (
            <p className="text-xs text-amber-600 mt-1">
              Rate override: ${booking.daily_rate.toFixed(2)} → ${parsedRate.toFixed(2)}/day
              {" "}(× {booking.total_days} day{booking.total_days !== 1 ? "s" : ""})
            </p>
          )}
        </div>

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
              Changing location will clear the assigned vehicle.
            </p>
          )}
        </div>

        <Separator />

        <Button
          className="w-full"
          disabled={!hasChanges || editBooking.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {editBooking.isPending ? "Saving..." : "Apply Rate / Location Change"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Pricing is recalculated server-side and the change is written to the booking audit trail.
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm rate / location change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1">
                {rateChanged && (
                  <p>Daily rate: ${booking.daily_rate.toFixed(2)} → ${parsedRate.toFixed(2)}/day</p>
                )}
                {locationChanged && <p>Location changed — vehicle assignment will be cleared.</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Label htmlFor="modify-rate-reason" className="text-sm font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="modify-rate-reason"
              placeholder="e.g., Manager-approved rate for repeat customer"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={!reason.trim() || editBooking.isPending}>
              {editBooking.isPending ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
