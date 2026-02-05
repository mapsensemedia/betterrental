/**
 * VoidBookingDialog - Admin-only component for voiding bookings
 * Requires mandatory reason, notes (20+ chars), and optional refund amount
 * Writes to audit_logs via edge function
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { voidBooking } from "@/domain/bookings/mutations";

const VOID_REASONS = [
  { value: "fraud_detected", label: "Fraud Detected" },
  { value: "booking_error", label: "Booking Error" },
  { value: "dispute_resolution", label: "Dispute Resolution" },
  { value: "duplicate_entry", label: "Duplicate Entry" },
  { value: "customer_request", label: "Customer Request" },
  { value: "other", label: "Other" },
] as const;

interface VoidBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  panelSource?: "admin" | "ops";
  onSuccess?: () => void;
}

export function VoidBookingDialog({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
  panelSource = "admin",
  onSuccess,
}: VoidBookingDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const voidMutation = useMutation({
    mutationFn: async () => {
      const reasonLabel = VOID_REASONS.find(r => r.value === reason)?.label || reason;
      const fullReason = `${reasonLabel}: ${notes}`;
      
      await voidBooking({
        bookingId,
        reason: fullReason,
        refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
        panelSource,
      });
    },
    onSuccess: () => {
      toast.success("Booking voided successfully", {
        description: `Booking ${bookingCode} has been voided and logged.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Failed to void booking:", error);
      toast.error("Failed to void booking", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const resetForm = () => {
    setReason("");
    setNotes("");
    setRefundAmount("");
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const isValid = reason && notes.trim().length >= 20;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Booking
          </AlertDialogTitle>
          <AlertDialogDescription>
            Booking <span className="font-mono font-semibold">{bookingCode}</span> will be permanently voided.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="void-reason">
              Reason for voiding <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="void-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {VOID_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="void-notes">
              Detailed explanation <span className="text-destructive">*</span>
              <span className="text-muted-foreground text-xs ml-1">
                (min 20 characters)
              </span>
            </Label>
            <Textarea
              id="void-notes"
              placeholder="Provide detailed explanation for voiding this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
            {notes.length > 0 && notes.length < 20 && (
              <p className="text-xs text-muted-foreground">
                {20 - notes.length} more characters required
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-amount">
              Refund amount (optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="refund-amount"
                type="number"
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="pl-7"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For tracking purposes only. Refunds must be processed separately.
            </p>
          </div>

          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. The booking will be marked as voided and logged in the audit trail.
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={voidMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => voidMutation.mutate()}
            disabled={!isValid || voidMutation.isPending}
          >
            {voidMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Voiding...
              </>
            ) : (
              "Void Booking"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
