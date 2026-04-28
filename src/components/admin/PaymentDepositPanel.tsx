/**
 * PaymentDepositPanel
 *
 * Simple payment status panel showing payments received on a booking.
 * Additional charges are collected at the counter via the Worldline POS flow
 * (see OpsPaymentAndDeposit) — there is no "send payment link" action here.
 */

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePaymentDepositStatus } from '@/hooks/use-payment-deposit';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Loader2,
  Info,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentDepositPanelProps {
  bookingId: string;
  bookingStatus?: string;
  onComplete?: () => void;
}

export function PaymentDepositPanel({
  bookingId,
}: PaymentDepositPanelProps) {
  const { data: status, isLoading } = usePaymentDepositStatus(bookingId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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

  if (!status) return null;

  const allComplete = status.paymentStatus === 'paid';
  const isAuthorized = status.paymentStatus === 'authorized';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Status
          </CardTitle>
          {allComplete && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Paid
            </Badge>
          )}
          {isAuthorized && (
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              <CreditCard className="h-3 w-3 mr-1" />
              Authorized — Capture Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="p-4 rounded-lg border bg-card space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Due</span>
            <span className="font-medium font-mono">${status.totalDue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Paid (captured)</span>
            <span className="font-medium font-mono text-emerald-600">${status.totalPaid.toFixed(2)}</span>
          </div>
          {status.totalAuthorized > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Authorized (not yet captured)</span>
              <span className="font-medium font-mono text-blue-600">${status.totalAuthorized.toFixed(2)}</span>
            </div>
          )}
          {status.balance > 0 && !isAuthorized && (
            <div className="flex justify-between text-sm font-medium">
              <span className="text-destructive">Balance Remaining</span>
              <span className="font-mono text-destructive">${status.balance.toFixed(2)}</span>
            </div>
          )}
          {isAuthorized && (
            <p className="text-xs text-muted-foreground pt-1">
              Funds held on card. Capture from the Operations panel when ready.
            </p>
          )}
        </div>

        {/* Payment History */}
        {status.payments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Payment History</p>
            {status.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <span className="font-medium capitalize">{payment.paymentType}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {format(new Date(payment.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${payment.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {payment.amount < 0 ? '-' : ''}${Math.abs(payment.amount).toFixed(2)}
                  </span>
                  <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                    {payment.status}
                  </Badge>
                  {payment.transactionId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(payment.transactionId!, "Transaction ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Payments */}
        {status.payments.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No payments recorded</p>
            <p className="text-sm mt-1">Collect payment via the Worldline counter flow.</p>
          </div>
        )}

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm text-muted-foreground">
            Payments are processed through Worldline/Bambora. Additional charges
            (deposits, damages, fees) are collected at the counter via the POS
            flow.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
