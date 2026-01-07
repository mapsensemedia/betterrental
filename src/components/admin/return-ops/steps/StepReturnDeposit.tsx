import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { usePaymentDepositStatus, useReleaseDeposit } from "@/hooks/use-payment-deposit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Wallet, 
  CheckCircle2,
  DollarSign,
  ArrowDownCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface StepReturnDepositProps {
  bookingId: string;
  booking: any;
  completion: {
    processed: boolean;
  };
}

export function StepReturnDeposit({ bookingId, booking, completion }: StepReturnDepositProps) {
  const { data: depositData, isLoading } = usePaymentDepositStatus(bookingId);
  const releaseDeposit = useReleaseDeposit();
  const [releaseReason, setReleaseReason] = useState("Vehicle returned in good condition - no damages");
  const [isProcessing, setIsProcessing] = useState(false);

  const depositAmount = booking.deposit_amount || 0;
  const hasDeposit = depositAmount > 0;
  const depositStatus = depositData?.depositStatus || "none";
  const isReleased = depositStatus === "released";
  const isHeld = depositStatus === "held";

  const handleReleaseDeposit = async () => {
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
      
      toast.success("Deposit released successfully");
    } catch (error) {
      console.error("Error releasing deposit:", error);
      toast.error("Failed to release deposit");
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
                <span className="font-medium">Deposit released</span>
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

          {hasDeposit && !isReleased && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Release Reason</label>
                <Textarea
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Enter reason for deposit release..."
                  rows={2}
                />
              </div>

              <Button
                onClick={handleReleaseDeposit}
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
                    Release Full Deposit
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                If damages were found, handle partial deposit retention through Billing
              </p>
            </>
          )}

          {isReleased && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Deposit Successfully Released
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                The customer's security deposit has been refunded
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
