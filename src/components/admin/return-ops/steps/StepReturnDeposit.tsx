/**
 * StepReturnDeposit - Simplified deposit/charges step
 * 
 * No longer manages Stripe authorization holds.
 * Simply shows any outstanding charges and allows sending payment links.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useGenerateReturnReceipt } from "@/hooks/use-return-receipt";
import { useCreateAuditLog } from "@/hooks/use-audit-logs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Wallet, 
  CheckCircle2,
  DollarSign,
  Loader2,
  AlertTriangle,
  Lock,
  Send,
} from "lucide-react";

interface StepReturnDepositProps {
  bookingId: string;
  booking: any;
  completion: { processed: boolean };
  totalDamageCost?: number;
  isLocked?: boolean;
  onComplete?: () => void;
}

export function StepReturnDeposit({ 
  bookingId, 
  booking, 
  completion,
  totalDamageCost = 0,
  isLocked,
  onComplete,
}: StepReturnDepositProps) {
  const { data: depositData, isLoading } = usePaymentDepositStatus(bookingId);
  const generateReceipt = useGenerateReturnReceipt();
  const createAuditLog = useCreateAuditLog();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const { data: damages = [] } = useQuery({
    queryKey: ["booking-damages", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("damage_reports")
        .select("id, severity, estimated_cost, description")
        .eq("booking_id", bookingId)
        .neq("status", "closed");
      return data || [];
    },
  });

  const handleCompleteReturn = async () => {
    if (isLocked) return;
    setIsProcessing(true);
    try {
      await createAuditLog.mutateAsync({
        action: "return_deposit_processed",
        entityType: "booking",
        entityId: bookingId,
        newData: { action: "return_completed", totalDamageCost },
      });

      await generateReceipt.mutateAsync({
        bookingId,
        depositReleased: 0,
        depositWithheld: 0,
      });

      toast.success("Return processed - receipt sent to customer");
      onComplete?.();
    } catch (error) {
      console.error("Error completing return:", error);
      toast.error("Failed to complete return");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendPaymentRequest = async () => {
    setIsSendingRequest(true);
    try {
      const { error } = await supabase.functions.invoke("send-payment-request", {
        body: { bookingId },
      });
      if (error) throw error;
      toast.success("Payment request sent to customer");
    } catch (err: any) {
      toast.error("Failed to send: " + (err.message || "Unknown error"));
    } finally {
      setIsSendingRequest(false);
    }
  };

  const isProcessed = completion.processed;

  return (
    <div className="space-y-6">
      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete the return closeout step to unlock this section.
          </AlertDescription>
        </Alert>
      )}

      <Card className={isProcessed ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${isProcessed ? "text-emerald-600" : "text-muted-foreground"}`}>
            {isProcessed ? (
              <><CheckCircle2 className="h-5 w-5" /><span className="font-medium">Return processed</span></>
            ) : (
              <><Wallet className="h-5 w-5" /><span className="font-medium">Awaiting return processing</span></>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {depositData && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm text-muted-foreground">Payments Received</p>
                <p className="text-2xl font-bold">${depositData.totalPaid.toFixed(2)}</p>
              </div>
              <Badge variant={depositData.paymentStatus === 'paid' ? "default" : "secondary"}>
                {depositData.paymentStatus === 'paid' ? "Paid" : depositData.paymentStatus === 'partial' ? "Partial" : "Unpaid"}
              </Badge>
            </div>
          )}

          {totalDamageCost > 0 && (
            <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">Damages Detected</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Total damage estimate: <strong>${totalDamageCost.toFixed(2)}</strong>
                  </p>
                  {damages.map(d => (
                    <p key={d.id} className="text-xs text-amber-600 mt-1">
                      • {d.severity}: {d.description?.slice(0, 50)}... (${d.estimated_cost || 0})
                    </p>
                  ))}
                  <Button
                    onClick={handleSendPaymentRequest}
                    disabled={isSendingRequest}
                    variant="outline"
                    size="sm"
                    className="mt-3"
                  >
                    {isSendingRequest ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                    Send Payment Link for Damages
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isProcessed && !isLocked && (
            <Button
              onClick={handleCompleteReturn}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" />Complete Return & Send Receipt</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
