/**
 * CaptureDepositDialog
 * 
 * Dialog for capturing a deposit hold (charging the customer)
 * Supports full and partial captures
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, AlertCircle, Loader2, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useCaptureDeposit, DepositHoldInfo } from "@/hooks/use-deposit-hold";

interface CaptureDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depositInfo: DepositHoldInfo;
  onSuccess?: () => void;
}

type CaptureType = "full" | "partial";

export function CaptureDepositDialog({
  open,
  onOpenChange,
  depositInfo,
  onSuccess,
}: CaptureDepositDialogProps) {
  const [captureType, setCaptureType] = useState<CaptureType>("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState("");
  const captureDeposit = useCaptureDeposit();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCaptureType("full");
      setPartialAmount("");
      setReason("");
    }
  }, [open]);

  const maxAmount = depositInfo.amount;
  const captureAmount = captureType === "full" 
    ? maxAmount 
    : Math.min(parseFloat(partialAmount) || 0, maxAmount);
  const releaseAmount = maxAmount - captureAmount;

  const isValid = 
    reason.trim().length > 0 && 
    captureAmount > 0 && 
    captureAmount <= maxAmount &&
    depositInfo.status === "authorized";

  const handleCapture = async () => {
    if (!isValid) return;

    await captureDeposit.mutateAsync({
      bookingId: depositInfo.bookingId,
      amount: captureType === "partial" ? captureAmount : undefined,
      reason: reason.trim(),
    });

    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Capture Deposit
          </DialogTitle>
          <DialogDescription>
            This will charge the customer's card for the specified amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              💰 This will charge the customer's card. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Authorization Amount */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Authorization Amount:</span>
              <span className="text-lg font-bold font-mono">${maxAmount.toFixed(2)} CAD</span>
            </div>
            {depositInfo.cardLast4 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <CreditCard className="h-3 w-3" />
                •••• {depositInfo.cardLast4}
              </div>
            )}
          </div>

          {/* Capture Type Selection */}
          <RadioGroup
            value={captureType}
            onValueChange={(v) => setCaptureType(v as CaptureType)}
            className="space-y-3"
          >
            <div className={cn(
              "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
              captureType === "full" && "border-primary bg-primary/5"
            )}>
              <RadioGroupItem value="full" id="full" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="full" className="cursor-pointer font-medium">
                  Capture Full Amount (${maxAmount.toFixed(2)})
                </Label>
                <p className="text-sm text-muted-foreground">
                  Customer will be charged the full authorization amount
                </p>
              </div>
            </div>

            <div className={cn(
              "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
              captureType === "partial" && "border-primary bg-primary/5"
            )}>
              <RadioGroupItem value="partial" id="partial" className="mt-0.5" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="partial" className="cursor-pointer font-medium">
                  Capture Partial Amount
                </Label>
                {captureType === "partial" && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="pl-7 w-32"
                        min="0"
                        max={maxAmount}
                        step="0.01"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      (max: ${maxAmount.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Capture Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Capture Reason (required)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Damage repair: Front bumper scratch"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary */}
          {captureAmount > 0 && (
            <div className="rounded-lg border p-3 space-y-1 bg-muted/50">
              <div className="text-sm font-medium">Summary:</div>
              <div className="flex justify-between text-sm">
                <span>• Capture:</span>
                <span className="font-mono font-medium text-red-600">
                  ${captureAmount.toFixed(2)}
                </span>
              </div>
              {releaseAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>• Release:</span>
                  <span className="font-mono font-medium text-emerald-600">
                    ${releaseAmount.toFixed(2)} (remaining authorization)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={captureDeposit.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleCapture}
            disabled={!isValid || captureDeposit.isPending}
          >
            {captureDeposit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Capture ${captureAmount.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
