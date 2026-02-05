/**
 * ReleaseHoldDialog
 * 
 * Confirmation dialog for releasing a deposit authorization hold
 * Validates requirements before allowing release
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, CreditCard, Shield, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useReleaseDepositHold, DepositHoldInfo } from "@/hooks/use-deposit-hold";

interface ReleaseHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depositInfo: DepositHoldInfo;
  bookingStatus: string;
  onSuccess?: () => void;
}

interface Requirement {
  label: string;
  met: boolean;
  critical: boolean;
}

export function ReleaseHoldDialog({
  open,
  onOpenChange,
  depositInfo,
  bookingStatus,
  onSuccess,
}: ReleaseHoldDialogProps) {
  const [reason, setReason] = useState("");
  const releaseHold = useReleaseDepositHold();

  const requirements: Requirement[] = [
    {
      label: `Rental status: ${bookingStatus}`,
      met: ["completed", "voided"].includes(bookingStatus),
      critical: true,
    },
    {
      label: "Deposit is currently authorized",
      met: depositInfo.status === "authorized",
      critical: true,
    },
    {
      label: "Release reason provided",
      met: reason.trim().length > 0,
      critical: true,
    },
  ];

  const allRequirementsMet = requirements.every(r => r.met);

  const handleRelease = async () => {
    if (!allRequirementsMet) return;

    await releaseHold.mutateAsync({
      bookingId: depositInfo.bookingId,
      reason: reason.trim(),
    });

    onSuccess?.();
    onOpenChange(false);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Release Authorization Hold
          </DialogTitle>
          <DialogDescription>
            This will cancel the Stripe authorization hold. The customer's card will NOT be charged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hold Details */}
          <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
            <div className="text-sm font-medium">Hold Details</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Amount:</div>
              <div className="font-mono font-medium">${depositInfo.amount.toFixed(2)} CAD</div>
              
              {depositInfo.cardLast4 && (
                <>
                  <div className="text-muted-foreground">Card:</div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    •••• {depositInfo.cardLast4}
                  </div>
                </>
              )}
              
              {depositInfo.stripePaymentIntentId && (
                <>
                  <div className="text-muted-foreground">Stripe PI:</div>
                  <code className="text-xs font-mono truncate">
                    {depositInfo.stripePaymentIntentId}
                  </code>
                </>
              )}
              
              {depositInfo.authorizedAt && (
                <>
                  <div className="text-muted-foreground">Held Since:</div>
                  <div>{format(new Date(depositInfo.authorizedAt), "MMM d, yyyy")}</div>
                </>
              )}
            </div>
          </div>

          {/* Release Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Release Reason (required)</Label>
            <Textarea
              id="reason"
              placeholder="Vehicle returned in good condition - no damages"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Requirements Check */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              ⚠️ Requirements before release:
            </div>
            <div className="space-y-1">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className={cn(
                      "h-4 w-4",
                      req.critical ? "text-destructive" : "text-amber-600"
                    )} />
                  )}
                  <span className={req.met ? "text-muted-foreground" : ""}>
                    {req.label}
                  </span>
                  {req.met && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-xs">
                      ✓
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warning if requirements not met */}
          {!allRequirementsMet && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!["completed", "voided"].includes(bookingStatus) 
                  ? "Cannot release deposit until rental is completed or voided."
                  : "Please fill in all required fields."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={releaseHold.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleRelease}
            disabled={!allRequirementsMet || releaseHold.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {releaseHold.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Releasing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Release ($0 charged)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
