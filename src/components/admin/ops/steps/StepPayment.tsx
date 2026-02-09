/**
 * StepPayment - Simple payment status display
 * 
 * Shows payment status from Stripe. No manual authorization hold management.
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
  ExternalLink,
  Send,
} from "lucide-react";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

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

          {/* Stripe transaction IDs */}
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
                    {payment.transactionId.startsWith("pi_") && (
                      <a
                        href={`https://dashboard.stripe.com/payments/${payment.transactionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* No payment - send request */}
          {!isPaid && (
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
