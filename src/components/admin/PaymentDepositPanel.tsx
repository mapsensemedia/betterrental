import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  usePaymentDepositStatus,
  useRecordPaymentDeposit,
  useSendPaymentRequest,
  useReleaseDeposit,
  type PaymentMethod,
  type PaymentType,
} from '@/hooks/use-payment-deposit';
import {
  CreditCard,
  DollarSign,
  Banknote,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  RefreshCcw,
  ChevronRight,
} from 'lucide-react';

interface PaymentDepositPanelProps {
  bookingId: string;
  onComplete?: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card_terminal', label: 'Card Terminal' },
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'card', label: 'Online Card' },
  { value: 'other', label: 'Other' },
];

export function PaymentDepositPanel({ bookingId, onComplete }: PaymentDepositPanelProps) {
  const { data: status, isLoading } = usePaymentDepositStatus(bookingId);
  const recordPayment = useRecordPaymentDeposit();
  const sendRequest = useSendPaymentRequest();
  const releaseDeposit = useReleaseDeposit();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('rental');
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash' as PaymentMethod,
    reference: '',
  });

  const [sendRequestOpen, setSendRequestOpen] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestChannel, setRequestChannel] = useState<'email' | 'sms' | 'both'>('email');

  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);

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

  const handleOpenPaymentDialog = (type: PaymentType) => {
    setPaymentType(type);
    const defaultAmount = type === 'deposit' 
      ? (status.depositRequired - status.depositHeld)
      : status.balance;
    setPaymentData({
      amount: defaultAmount > 0 ? defaultAmount.toFixed(2) : '',
      method: 'cash',
      reference: '',
    });
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = () => {
    // Show confirmation dialog before recording
    setConfirmPaymentOpen(true);
  };

  const confirmAndRecordPayment = () => {
    if (!paymentData.amount) return;

    recordPayment.mutate({
      bookingId,
      amount: parseFloat(paymentData.amount),
      paymentType,
      method: paymentData.method,
      reference: paymentData.reference || undefined,
    }, {
      onSuccess: () => {
        setConfirmPaymentOpen(false);
        setPaymentDialogOpen(false);
        setPaymentData({ amount: '', method: 'cash', reference: '' });
        if (status.paymentStatus === 'paid' && status.depositStatus !== 'pending') {
          onComplete?.();
        }
      },
    });
  };

  const handleSendRequest = () => {
    if (!requestAmount) return;
    
    sendRequest.mutate({
      bookingId,
      amount: parseFloat(requestAmount),
      channel: requestChannel,
    }, {
      onSuccess: () => {
        setSendRequestOpen(false);
        setRequestAmount('');
      },
    });
  };

  const handleReleaseDeposit = (paymentId: string) => {
    setSelectedDepositId(paymentId);
    setReleaseDialogOpen(true);
  };

  const confirmReleaseDeposit = () => {
    if (!selectedDepositId) return;
    
    releaseDeposit.mutate({
      bookingId,
      paymentId: selectedDepositId,
    }, {
      onSuccess: () => {
        setReleaseDialogOpen(false);
        setSelectedDepositId(null);
      },
    });
  };

  const getPaymentStatusBadge = () => {
    switch (status.paymentStatus) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  };

  const getDepositStatusBadge = () => {
    switch (status.depositStatus) {
      case 'held':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Held</Badge>;
      case 'released':
        return <Badge variant="secondary">Released</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Not Required</Badge>;
    }
  };

  const depositPayments = status.payments.filter(p => p.paymentType === 'deposit' && p.status === 'completed');

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment & Deposit
            </CardTitle>
            {status.allComplete && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Summary Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Rental Payment */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Rental</span>
                {getPaymentStatusBadge()}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Due</span>
                  <span className="font-medium">${status.totalDue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-green-600 font-medium">${status.totalPaid.toFixed(2)}</span>
                </div>
                {status.balance > 0 && (
                  <div className="flex justify-between text-sm pt-1 border-t">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="text-destructive font-semibold">${status.balance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security Deposit */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Deposit</span>
                {getDepositStatusBadge()}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Required</span>
                  <span className="font-medium">${status.depositRequired.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Held</span>
                  <span className={status.depositHeld > 0 ? "text-blue-600 font-medium" : ""}>
                    ${status.depositHeld.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {(!status.allComplete || status.balance > 0 || status.depositStatus === 'pending') && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {status.balance > 0 && (
                  <>
                    <Button size="sm" onClick={() => handleOpenPaymentDialog('rental')}>
                      <Banknote className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setRequestAmount(status.balance.toFixed(2));
                      setSendRequestOpen(true);
                    }}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Request
                    </Button>
                  </>
                )}
                {status.depositStatus === 'pending' && (
                  <Button size="sm" variant="secondary" onClick={() => handleOpenPaymentDialog('deposit')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Deposit
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Release Deposit (for completed bookings) */}
          {status.depositStatus === 'held' && depositPayments.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Deposit held: ${status.depositHeld.toFixed(2)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReleaseDeposit(depositPayments[0].id)}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Release Deposit
                </Button>
              </div>
            </>
          )}

          {/* Transaction History */}
          {status.payments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Transactions
                </p>
                <div className="space-y-2">
                  {status.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {payment.paymentType}
                        </Badge>
                        <span className="text-muted-foreground">
                          {payment.paymentMethod || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${payment.amount.toFixed(2)}</span>
                        <Badge
                          variant={payment.status === 'completed' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Next Steps - Show after payment complete */}
          {status.allComplete && (
            <>
              <Separator />
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Next steps:</strong> Agreement signing → Vehicle walkaround
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {paymentType === 'deposit' ? 'Record Deposit Hold' : 'Record Payment'}
            </DialogTitle>
            <DialogDescription>
              {paymentType === 'deposit'
                ? 'Record a security deposit authorization or hold'
                : 'Record a rental payment received from the customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentData.method}
                onValueChange={(v) => setPaymentData({ ...paymentData, method: v as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference / Transaction ID (optional)</Label>
              <Input
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="Receipt #, auth code, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={!paymentData.amount || parseFloat(paymentData.amount) <= 0}
            >
              {paymentType === 'deposit' ? 'Confirm Hold' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Alert */}
      <AlertDialog open={confirmPaymentOpen} onOpenChange={setConfirmPaymentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {paymentType === 'deposit' ? 'Deposit Hold' : 'Payment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {paymentType === 'deposit' ? (
                <>
                  This will mark <strong>${paymentData.amount}</strong> as held via{' '}
                  <strong>{paymentMethods.find(m => m.value === paymentData.method)?.label}</strong>.
                  The deposit status will change to "Held".
                </>
              ) : (
                <>
                  This will record <strong>${paymentData.amount}</strong> received via{' '}
                  <strong>{paymentMethods.find(m => m.value === paymentData.method)?.label}</strong>.
                  {parseFloat(paymentData.amount) >= status.balance && (
                    <> Payment status will change to "Paid".</>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAndRecordPayment}
              disabled={recordPayment.isPending}
            >
              {recordPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Payment Request Dialog */}
      <Dialog open={sendRequestOpen} onOpenChange={setSendRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Request</DialogTitle>
            <DialogDescription>
              Send a payment link to the customer to collect the balance due
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount to Request</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Send via</Label>
              <Select
                value={requestChannel}
                onValueChange={(v) => setRequestChannel(v as 'email' | 'sms' | 'both')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              disabled={!requestAmount || sendRequest.isPending}
            >
              {sendRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Deposit Confirmation */}
      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Security Deposit</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the deposit as released/refunded. Make sure you have processed
              the actual refund before confirming.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReleaseDeposit}
              disabled={releaseDeposit.isPending}
            >
              {releaseDeposit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Release Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
