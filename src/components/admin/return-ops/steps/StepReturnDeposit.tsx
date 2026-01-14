import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePaymentDepositStatus, useReleaseDeposit } from "@/hooks/use-payment-deposit";
import { useAddDepositLedgerEntry, useDepositLedger } from "@/hooks/use-deposit-ledger";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Wallet, 
  CheckCircle2,
  DollarSign,
  ArrowDownCircle,
  Loader2,
  MinusCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface StepReturnDepositProps {
  bookingId: string;
  booking: any;
  completion: {
    processed: boolean;
  };
  totalDamageCost?: number;
  isLocked?: boolean;
}

export function StepReturnDeposit({ 
  bookingId, 
  booking, 
  completion,
  totalDamageCost = 0,
  isLocked,
}: StepReturnDepositProps) {
  const queryClient = useQueryClient();
  const { data: depositData, isLoading, refetch } = usePaymentDepositStatus(bookingId);
  const { data: ledgerData } = useDepositLedger(bookingId);
  const releaseDeposit = useReleaseDeposit();
  const addLedgerEntry = useAddDepositLedgerEntry();
  
  const [releaseReason, setReleaseReason] = useState("Vehicle returned in good condition - no damages");
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [withholdReason, setWithholdReason] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  const depositAmount = booking.deposit_amount || 0;
  const hasDeposit = depositAmount > 0;
  const depositHeld = depositData?.depositHeld || 0;
  const depositStatus = depositData?.depositStatus || "none";
  
  // Check if deposit has been released via ledger entries or payment status
  const isReleased = depositStatus === "released" || ledgerData?.status === "released" || ledgerData?.status === "deducted";
  
  // Deposit is held if payment status says held OR we have ledger entries showing held status
  // Important: If depositHeld > 0 from payments, consider it "held" even without ledger entries
  const isHeld = depositStatus === "held" || (depositHeld > 0 && depositStatus !== "released");
  
  // Remaining deposit: use ledger if available, otherwise use full depositHeld from payments
  const remainingDeposit = ledgerData?.remaining ?? depositHeld;

  // Auto-populate withhold amount from damage costs
  useEffect(() => {
    if (totalDamageCost > 0 && !partialAmount) {
      const suggestedAmount = Math.min(totalDamageCost, remainingDeposit);
      setPartialAmount(suggestedAmount.toFixed(2));
      setWithholdReason(`Damage repair costs`);
    }
  }, [totalDamageCost, remainingDeposit, partialAmount]);

  // Send notification to customer
  const sendDepositNotification = async (action: "released" | "withheld", amount: number, reason?: string) => {
    try {
      setSendingNotification(true);
      
      await supabase.functions.invoke("send-deposit-notification", {
        body: {
          bookingId,
          action,
          amount,
          reason,
          withheldAmount: action === "withheld" ? amount : 0,
          releasedAmount: action === "released" ? amount : (remainingDeposit - amount),
        },
      });
      
      toast.success("Customer notified about deposit");
    } catch (error) {
      console.warn("Failed to send deposit notification:", error);
    } finally {
      setSendingNotification(false);
    }
  };

  const handleReleaseFullDeposit = async () => {
    if (!hasDeposit || remainingDeposit <= 0 || isLocked) return;
    
    setIsProcessing(true);
    try {
      await addLedgerEntry.mutateAsync({
        bookingId,
        action: "release",
        amount: remainingDeposit,
        reason: releaseReason,
      });

      const { data: payments } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payment_type", "deposit")
        .eq("status", "completed")
        .limit(1);
      
      if (payments && payments.length > 0) {
        await releaseDeposit.mutateAsync({
          bookingId,
          paymentId: payments[0].id,
          reason: releaseReason,
        });
      }

      await sendDepositNotification("released", remainingDeposit, releaseReason);
      
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger", bookingId] });
      toast.success("Full deposit released successfully");
    } catch (error) {
      console.error("Error releasing deposit:", error);
      toast.error("Failed to release deposit");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithholdPartial = async () => {
    if (!hasDeposit || !partialAmount || !withholdReason.trim() || isLocked) return;
    
    const amountToWithhold = parseFloat(partialAmount);
    if (isNaN(amountToWithhold) || amountToWithhold <= 0 || amountToWithhold > remainingDeposit) {
      toast.error("Invalid withhold amount");
      return;
    }
    
    setIsProcessing(true);
    try {
      await addLedgerEntry.mutateAsync({
        bookingId,
        action: "deduct",
        amount: amountToWithhold,
        reason: withholdReason,
      });

      const remainingToRelease = remainingDeposit - amountToWithhold;
      
      if (remainingToRelease > 0) {
        await addLedgerEntry.mutateAsync({
          bookingId,
          action: "release",
          amount: remainingToRelease,
          reason: `Partial release after withholding $${amountToWithhold.toFixed(2)} for: ${withholdReason}`,
        });
      }

      const { data: payments } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payment_type", "deposit")
        .eq("status", "completed")
        .limit(1);
      
      if (payments && payments.length > 0) {
        await releaseDeposit.mutateAsync({
          bookingId,
          paymentId: payments[0].id,
          reason: `Withheld: $${amountToWithhold.toFixed(2)} for ${withholdReason}. Released: $${remainingToRelease.toFixed(2)}`,
        });
      }

      await sendDepositNotification("withheld", amountToWithhold, withholdReason);

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger", bookingId] });
      toast.success(`Withheld $${amountToWithhold.toFixed(2)}, released $${remainingToRelease.toFixed(2)}`);
      setPartialAmount("");
      setWithholdReason("");
    } catch (error) {
      console.error("Error processing deposit:", error);
      toast.error("Failed to process deposit");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Locked Warning */}
      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete the return closeout step to unlock deposit processing.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className={
        isReleased 
          ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
          : !hasDeposit
            ? "border-muted"
            : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            isReleased ? "text-emerald-600" : !hasDeposit ? "text-muted-foreground" : "text-amber-600"
          }`}>
            {isReleased ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Deposit processed</span>
              </>
            ) : !hasDeposit ? (
              <>
                <Wallet className="h-5 w-5" />
                <span className="font-medium">No deposit to process</span>
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                <span className="font-medium">Deposit awaiting release</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deposit Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Deposit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="text-2xl font-bold">
                ${depositAmount.toFixed(2)}
              </p>
            </div>
            <Badge 
              variant={isReleased ? "default" : isHeld ? "secondary" : "outline"}
              className={isReleased ? "bg-emerald-500" : ""}
            >
              {isReleased ? "Released" : isHeld ? "Held" : "No Deposit"}
            </Badge>
          </div>

          {/* Damage Cost Warning */}
          {totalDamageCost > 0 && !isReleased && (
            <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Damages Detected
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Total damage estimate: <strong>${totalDamageCost.toFixed(2)}</strong>
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Withhold amount has been auto-calculated based on damages
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Release Options - Only show if deposit is held and not released */}
          {hasDeposit && isHeld && !isReleased && remainingDeposit > 0 && !isLocked && (
            <>
              {/* Full Release Option */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                  Release Full Deposit
                </h4>
                <div className="space-y-2">
                  <Label>Release Reason</Label>
                  <Textarea
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                    placeholder="Enter reason for deposit release..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleReleaseFullDeposit}
                  disabled={isProcessing || !releaseReason.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Release Full Deposit (${remainingDeposit.toFixed(2)})
                    </>
                  )}
                </Button>
              </div>

              {/* Partial Withhold Option */}
              <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <h4 className="font-medium flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-destructive" />
                  Withhold Partial Deposit
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Amount to Withhold ($)</Label>
                    <Input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="0.00"
                      max={remainingDeposit}
                      min={0}
                      step="0.01"
                    />
                    {totalDamageCost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Suggested: ${Math.min(totalDamageCost, remainingDeposit).toFixed(2)} (based on damage estimate)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reason for Withholding</Label>
                    <Textarea
                      value={withholdReason}
                      onChange={(e) => setWithholdReason(e.target.value)}
                      placeholder="e.g., Damage repair costs, cleaning fee..."
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleWithholdPartial}
                  disabled={isProcessing || !partialAmount || !withholdReason.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-4 w-4 mr-2" />
                      Withhold & Release Remainder
                    </>
                  )}
                </Button>
                
                {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) <= remainingDeposit && (
                  <p className="text-xs text-center text-muted-foreground">
                    Customer will be refunded: ${(remainingDeposit - parseFloat(partialAmount)).toFixed(2)}
                  </p>
                )}
              </div>
            </>
          )}

          {isReleased && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Deposit Successfully Processed
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                The customer has been notified
              </p>
              {ledgerData && (
                <div className="mt-3 text-xs text-emerald-600 space-y-1">
                  {ledgerData.deducted > 0 && (
                    <p>Withheld: ${ledgerData.deducted.toFixed(2)}</p>
                  )}
                  {ledgerData.released > 0 && (
                    <p>Released: ${ledgerData.released.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!hasDeposit && (
            <div className="py-6 text-center text-muted-foreground">
              <p className="text-sm">This booking has no security deposit</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
