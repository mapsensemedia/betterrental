import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/use-admin";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";

const CANCELLATION_REASONS = [
  { value: "customer_request", label: "Customer Request" },
  { value: "vehicle_unavailable", label: "Vehicle Unavailable" },
  { value: "license_rejected", label: "License Rejected" },
  { value: "payment_failed", label: "Payment Failed" },
  { value: "no_show", label: "Customer No-Show" },
  { value: "duplicate_booking", label: "Duplicate Booking" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  customerName?: string;
  vehicleName?: string;
  onSuccess?: () => void;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
  customerName,
  vehicleName,
  onSuccess,
}: CancelBookingDialogProps) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const [reasonType, setReasonType] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!reasonType) {
        throw new Error("Please select a cancellation reason");
      }

      const fullReason = reasonDetails 
        ? `${CANCELLATION_REASONS.find(r => r.value === reasonType)?.label}: ${reasonDetails}`
        : CANCELLATION_REASONS.find(r => r.value === reasonType)?.label || reasonType;

      // Update booking status
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled",
          notes: fullReason,
          actual_return_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Log the action
      await logAction("booking_cancelled", "booking", bookingId, {
        reason_type: reasonType,
        reason_details: reasonDetails,
        full_reason: fullReason,
      });

      // Create admin alert
      await supabase.from("admin_alerts").insert([
        {
          alert_type: "customer_issue",
          title: `Booking Cancelled - ${bookingCode}`,
          message: `Booking ${bookingCode} was cancelled. Reason: ${fullReason}`,
          booking_id: bookingId,
          status: "new",
        } as any,
      ]);

      // Send admin notification
      try {
        await supabase.functions.invoke("notify-admin", {
          body: {
            eventType: "booking_cancelled",
            bookingId,
            bookingCode,
            customerName,
            vehicleName,
            details: fullReason,
          },
        });
      } catch (err) {
        console.error("Failed to send admin notification:", err);
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["pending-alerts-count"] });
      toast.success("Booking cancelled successfully");
      onOpenChange(false);
      setReasonType("");
      setReasonDetails("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel booking");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Booking
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for cancelling booking <strong>{bookingCode}</strong>.
            The admin will be notified via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason-type">Cancellation Reason *</Label>
            <Select value={reasonType} onValueChange={setReasonType}>
              <SelectTrigger id="reason-type">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason-details">Additional Details</Label>
            <Textarea
              id="reason-details"
              placeholder="Provide any additional context..."
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              rows={3}
            />
          </div>

          {customerName && (
            <div className="text-sm text-muted-foreground">
              <strong>Customer:</strong> {customerName}
            </div>
          )}
          {vehicleName && (
            <div className="text-sm text-muted-foreground">
              <strong>Vehicle:</strong> {vehicleName}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || !reasonType}
          >
            {cancelMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Booking"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
