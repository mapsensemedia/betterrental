/**
 * StepPayment - Payment status display with Worldline auth controls
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { 
  CheckCircle2, 
  CreditCard, 
  Clock, 
  Loader2,
  AlertCircle,
  Copy,
  Send,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Info,
} from "lucide-react";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface StepPaymentProps {
  bookingId: string;
  completion: {
    paymentComplete: boolean;
    depositCollected: boolean;
  };
}

export function StepPayment({ bookingId, completion }: StepPaymentProps) {
  const { data: paymentStatus, isLoading } = usePaymentDepositStatus(bookingId);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isPlacingHold, setIsPlacingHold] = useState(false);
  const queryClient = useQueryClient();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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
      toast.error("Failed to send request: " + (err.message || "Unknown error"));
    } finally {
      setIsSendingRequest(false);
    }
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
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      toast.success("Hold released successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
    } catch (err: any) {
      toast.error("Release failed: " + (err.message || "Unknown error"));
    } finally {
      setIsReleasing(false);
    }
  };

  const handlePlaceDepositHold = async () => {
    setIsPlacingHold(true);
    try {
      const { data, error } = await supabase.functions.invoke("wl-authorize", {
        body: { bookingId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      toast.success("Deposit hold placed successfully");
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.includes("token") || msg.includes("required")) {
        toast.error("Cannot place hold — no card token on file. The customer must complete a new checkout to provide card details.");
      } else {
        toast.error("Failed to place deposit hold: " + msg);
      }
    } finally {
      setIsPlacingHold(false);
    }
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
  const depositDbStatus = paymentStatus?.depositDbStatus;
  const isAuthorized = wlAuthStatus === "authorized";
  const needsDepositHold = wlAuthStatus === "completed" && (!depositDbStatus || depositDbStatus === "none");

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

          {/* Worldline Auth Status */}
          {(wlAuthStatus || wlTransactionId) && (
            <div className="p-3 rounded-md bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Authorization</p>
              {wlAuthStatus && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Auth Status</span>
                  <Badge variant={isAuthorized ? "default" : "secondary"} className="text-xs capitalize">
                    {wlAuthStatus}
                  </Badge>
                </div>
              )}
              {depositDbStatus && depositDbStatus !== "none" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Deposit Status</span>
                  <Badge variant={depositDbStatus === "authorized" ? "default" : "secondary"} className="text-xs capitalize">
                    {depositDbStatus}
                  </Badge>
                </div>
              )}
              {wlTransactionId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <div className="flex items-center gap-1">
                    <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                      {wlTransactionId.length > 16 ? `${wlTransactionId.slice(0, 16)}…` : wlTransactionId}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(wlTransactionId, "Transaction ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Capture / Release buttons */}
              {isAuthorized && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleCapture}
                    disabled={isCapturing || isReleasing}
                    className="flex-1"
                  >
                    {isCapturing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Capture Deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRelease}
                    disabled={isCapturing || isReleasing}
                    className="flex-1"
                  >
                    {isReleasing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-1" />}
                    Release Hold
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Place Deposit Hold — for paid bookings missing a deposit hold */}
          {needsDepositHold && (
            <div className="p-3 rounded-md border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No deposit hold on file</p>
                  <p className="text-xs text-muted-foreground">
                    This booking was paid before the two-step deposit flow was implemented. 
                    You can attempt to place a $350 hold using the card on file. If no card token 
                    is available, the customer will need to complete a new checkout.
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPlacingHold}
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    {isPlacingHold ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Placing hold...
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        Place $350 Deposit Hold
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Place Deposit Hold</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        Place a <strong>$350.00</strong> pre-authorization hold on the customer's card on file?
                      </span>
                      <span className="block text-xs">
                        This will not charge the card — it only places a temporary hold that can be captured or released later. 
                        If no card token is saved for this booking, the operation will fail and the customer will need to go through checkout again.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePlaceDepositHold}>
                      Place Hold
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Legacy transaction IDs */}
          {paymentStatus?.payments.filter(p => p.transactionId).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <span className="text-muted-foreground capitalize">{payment.paymentType}</span>
              <div className="flex items-center gap-2">
                {payment.transactionId && (
                  <>
                    <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                      {payment.transactionId.slice(0, 20)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(payment.transactionId!, "Transaction ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* No payment - send request */}
          {!isPaid && !wlAuthStatus && (
            <div className="space-y-3">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Payment not yet received</p>
                  <p className="text-sm">
                    The customer hasn't completed checkout or needs to pay an outstanding balance.
                  </p>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleSendPaymentRequest}
                disabled={isSendingRequest}
                className="w-full"
                variant="default"
              >
                {isSendingRequest ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Payment Link to Customer
                  </>
                )}
              </Button>
            </div>
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
