import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaymentDepositStatus, useReleaseDeposit, useRecordPaymentDeposit } from "@/hooks/use-payment-deposit";
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
} from "lucide-react";

interface StepReturnDepositProps {
  bookingId: string;
  booking: any;
  completion: {
    processed: boolean;
  };
}

export function StepReturnDeposit({ bookingId, booking, completion }: StepReturnDepositProps) {
  const queryClient = useQueryClient();
  const { data: depositData, isLoading, refetch } = usePaymentDepositStatus(bookingId);
  const releaseDeposit = useReleaseDeposit();
  const [releaseReason, setReleaseReason] = useState("Vehicle returned in good condition - no damages");
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [withholdReason, setWithholdReason] = useState("");

  const depositAmount = booking.deposit_amount || 0;
  const hasDeposit = depositAmount > 0;
  const depositHeld = depositData?.depositHeld || 0;
  const depositStatus = depositData?.depositStatus || "none";
  const isReleased = depositStatus === "released";
  const isHeld = depositStatus === "held";

  const handleReleaseFullDeposit = async () => {
    if (!hasDeposit) return;
    
    setIsProcessing(true);
    try {
      // Find the deposit payment
      const { data: payments } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("payment_type", "deposit")
        .eq("status", "completed")
        .limit(1);
      
      if (!payments || payments.length === 0) {
        toast.error("No deposit payment found");
        return;
      }

      await releaseDeposit.mutateAsync({
        bookingId,
        paymentId: payments[0].id,
        reason: releaseReason,
      });
      
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
      toast.success("Deposit released successfully");
    } catch (error) {
      console.error("Error releasing deposit:", error);
      toast.error("Failed to release deposit");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithholdPartial = async () => {
    if (!hasDeposit || !partialAmount || !withholdReason.trim()) return;
    
    const amountToWithhold = parseFloat(partialAmount);
    if (isNaN(amountToWithhold) || amountToWithhold <= 0 || amountToWithhold > depositHeld) {
      toast.error("Invalid withhold amount");
      return;
    }
    
    setIsProcessing(true);
    try {
      // Find the deposit payment
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount")
        .eq("booking_id", bookingId)
        .eq("payment_type", "deposit")
        .eq("status", "completed")
        .limit(1);
      
      if (!payments || payments.length === 0) {
        toast.error("No deposit payment found");
        return;
      }

      // Create a deposit ledger entry for the withholding
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase.from("deposit_ledger").insert({
        booking_id: bookingId,
        payment_id: payments[0].id,
        action: "withhold",
        amount: amountToWithhold,
        reason: withholdReason,
        created_by: user.id,
      });

      // Calculate remaining amount to release
      const remainingToRelease = depositHeld - amountToWithhold;
      
      if (remainingToRelease > 0) {
        // Add ledger entry for partial release
        await supabase.from("deposit_ledger").insert({
          booking_id: bookingId,
          payment_id: payments[0].id,
          action: "partial_release",
          amount: remainingToRelease,
          reason: `Partial release after withholding $${amountToWithhold.toFixed(2)} for: ${withholdReason}`,
          created_by: user.id,
        });
      }

      // Mark the deposit as refunded (processed)
      await releaseDeposit.mutateAsync({
        bookingId,
        paymentId: payments[0].id,
        reason: `Partial withhold: $${amountToWithhold.toFixed(2)} for ${withholdReason}. Released: $${remainingToRelease.toFixed(2)}`,
      });

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
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

          {/* Release Options - Only show if deposit is held and not released */}
          {hasDeposit && isHeld && !isReleased && (
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
                      Release Full Deposit (${depositHeld.toFixed(2)})
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
                      max={depositHeld}
                      min={0}
                    />
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
                The customer's security deposit has been handled
              </p>
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
