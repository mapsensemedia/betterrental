/**
 * StepPayment - Payment & Deposit status display with ops controls
 * 
 * Shows rental status, deposit status, and action buttons.
 * Uses OpsPaymentAndDeposit for inline card form (no copy-link).
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2, 
  CreditCard, 
  Clock, 
  Loader2,
  AlertCircle,
  Copy,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
} from "lucide-react";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OpsPaymentAndDeposit } from "@/components/payments/OpsPaymentAndDeposit";
import { DEFAULT_DEPOSIT_AMOUNT } from "@/lib/pricing";

interface StepPaymentProps {
  bookingId: string;
  completion: {
    paymentComplete: boolean;
    depositCollected: boolean;
  };
}

export function StepPayment({ bookingId, completion }: StepPaymentProps) {
  const { data: paymentStatus, isLoading } = usePaymentDepositStatus(bookingId);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const queryClient = useQueryClient();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wl-capture", {
        body: { bookingId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      toast.success("Deposit captured successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
    } catch (err: any) {
      toast.error("Capture failed: " + (err.message || "Unknown error"));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("wl-cancel-auth", {
        body: { bookingId },
      });
      if (error || data?.error) {
        const msg = await extractEdgeFunctionError(data, error);
        throw new Error(msg);
      }
      toast.success("Hold released successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
    } catch (err: any) {
      toast.error("Release failed: " + (err.message || "Unknown error"));
    } finally {
      setIsReleasing(false);
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isPaid = paymentStatus?.paymentStatus === 'paid';
  const wlAuthStatus = paymentStatus?.wlAuthStatus;
  const wlTransactionId = paymentStatus?.wlTransactionId;
  const wlDepositTxnId = paymentStatus?.wlDepositTransactionId;
  const wlDepositAuthStatus = paymentStatus?.wlDepositAuthStatus;
  const depositDbStatus = paymentStatus?.depositDbStatus;
  const bookingStatus = paymentStatus?.bookingStatus;

  const depositIsAuthorized = depositDbStatus === "authorized" || wlDepositAuthStatus === "authorized";
  const depositIsCaptured = depositDbStatus === "captured" || wlDepositAuthStatus === "captured";
  const depositIsReleased = depositDbStatus === "released" || wlDepositAuthStatus === "released";
  const hasDeposit = depositIsAuthorized || depositIsCaptured || depositIsReleased;

  // Show inline payment form when unpaid
  const canShowPayForm = !isPaid && !wlTransactionId
    && (bookingStatus === "confirmed" || bookingStatus === "pending");

  // Show deposit-only form when paid but no deposit hold
  const canShowDepositOnly = isPaid && !hasDeposit && !wlDepositTxnId;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Payment Status</CardTitle>
            </div>
            {isPaid ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Paid
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-amber-600">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
          <CardDescription>
            {isPaid 
              ? "Payment has been received."
              : "Awaiting payment from customer."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment summary */}
          {paymentStatus && (
            <div className="p-3 rounded-md bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Due</span>
                <span className="font-mono font-medium">${paymentStatus.totalDue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-mono font-medium text-emerald-600">${paymentStatus.totalPaid.toFixed(2)}</span>
              </div>
              {paymentStatus.balance > 0 && (
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-destructive">Balance</span>
                  <span className="font-mono text-destructive">${paymentStatus.balance.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* === RENTAL SECTION === */}
          {wlTransactionId && (
            <div className="p-3 rounded-md bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rental</p>
              {wlAuthStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Auth Status</span>
                  <Badge variant="secondary" className="text-xs capitalize">{wlAuthStatus}</Badge>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction ID</span>
                <div className="flex items-center gap-1">
                  <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                    {wlTransactionId.length > 16 ? `${wlTransactionId.slice(0, 16)}…` : wlTransactionId}
                  </code>
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => copyToClipboard(wlTransactionId, "Transaction ID")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* === DEPOSIT SECTION === */}
          {(hasDeposit || wlDepositTxnId) && (
            <div className="p-3 rounded-md bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deposit</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge 
                  variant={depositIsAuthorized ? "default" : "secondary"} 
                  className={cn("text-xs capitalize", depositIsCaptured && "bg-emerald-500/10 text-emerald-600")}
                >
                  {depositDbStatus || wlDepositAuthStatus || "none"}
                </Badge>
              </div>
              {wlDepositTxnId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                      {wlDepositTxnId.length > 16 ? `${wlDepositTxnId.slice(0, 16)}…` : wlDepositTxnId}
                    </code>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => copyToClipboard(wlDepositTxnId, "Deposit Transaction ID")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Capture / Release buttons */}
              {depositIsAuthorized && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleCapture} disabled={isCapturing || isReleasing} className="flex-1">
                    {isCapturing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Capture Deposit
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRelease} disabled={isCapturing || isReleasing} className="flex-1">
                    {isReleasing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-1" />}
                    Release Hold
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* === INLINE PAYMENT FORM: pay+hold (unpaid) === */}
          {canShowPayForm && (
            <OpsPaymentAndDeposit
              bookingId={bookingId}
              rentalAmount={paymentStatus?.totalDue || 0}
              depositAmount={DEFAULT_DEPOSIT_AMOUNT}
              onUpdated={refreshData}
            />
          )}

          {/* === INLINE DEPOSIT-ONLY FORM (paid, no deposit) === */}
          {canShowDepositOnly && (
            <OpsPaymentAndDeposit
              bookingId={bookingId}
              rentalAmount={0}
              depositAmount={DEFAULT_DEPOSIT_AMOUNT}
              onUpdated={refreshData}
            />
          )}

          {/* No payment and not eligible for any form */}
          {!isPaid && !wlAuthStatus && !wlTransactionId && !canShowPayForm && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Payment not yet received</p>
                <p className="text-sm">The customer hasn't completed checkout.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Completion Indicators */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className={cn(
              "flex items-center gap-2 text-sm",
              completion.paymentComplete ? "text-emerald-600" : "text-muted-foreground"
            )}>
              {completion.paymentComplete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Payment {completion.paymentComplete ? "Complete" : "Pending"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
