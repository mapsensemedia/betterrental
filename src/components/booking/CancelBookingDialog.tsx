import { useState } from "react";
import { format, differenceInHours } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FREE_CANCELLATION_HOURS, calculateCancellationFee } from "@/lib/rental-rules";

interface CancelBookingDialogProps {
  bookingId: string;
  bookingCode: string;
  startAt: string;
  dailyRate: number;
  status: string;
  onCancelled?: () => void;
}

export function CancelBookingDialog({
  bookingId,
  bookingCode,
  startAt,
  dailyRate,
  status,
  onCancelled,
}: CancelBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hoursUntilPickup = differenceInHours(new Date(startAt), new Date());
  const cancellationInfo = calculateCancellationFee(hoursUntilPickup, dailyRate);
  const canCancelFree = cancellationInfo.isFree;
  const isWithin2Hours = hoursUntilPickup < 2;
  const canCancel = status === "pending" || status === "confirmed";

  // Don't show if booking cannot be cancelled (rental already started)
  if (!canCancel) {
    return null;
  }

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          notes: reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer",
          actual_return_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking cancelled successfully");
      setOpen(false);
      onCancelled?.();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Cancel Booking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Booking {bookingCode}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your pickup is scheduled for{" "}
              <strong>{format(new Date(startAt), "EEEE, MMMM d 'at' h:mm a")}</strong>.
            </p>
            
            {canCancelFree ? (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400">
                <p className="font-medium">✓ Free cancellation</p>
                <p className="text-sm">You're cancelling more than {FREE_CANCELLATION_HOURS} hours before pickup. No fees will be charged.</p>
              </div>
            ) : isWithin2Hours ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 dark:text-red-400">
                <p className="font-medium">⚠ Last-minute cancellation</p>
                <p className="text-sm">
                  Cancelling within 2 hours of pickup. A <strong>1-day rental penalty (${cancellationInfo.fee.toFixed(2)})</strong> will be charged.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
                <p className="font-medium">⚠ Late cancellation</p>
                <p className="text-sm">
                  Cancelling within {FREE_CANCELLATION_HOURS} hours of pickup. A <strong>1-day rental penalty (${cancellationInfo.fee.toFixed(2)})</strong> will be charged.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="cancel-reason" className="text-sm font-medium">
            Reason for cancellation (optional)
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="Let us know why you're cancelling..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Booking</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Yes, Cancel Booking"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
