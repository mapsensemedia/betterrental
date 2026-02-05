/**
 * PaymentDepositPanel
 * 
 * Comprehensive payment and deposit management panel
 * Now integrated with Stripe authorization holds for security deposits
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  useDepositHoldStatus,
  useCreateDepositHold,
  useRealtimeDepositStatus,
} from '@/hooks/use-deposit-hold';
import {
  DepositHoldVisualizer,
  ReleaseHoldDialog,
  CaptureDepositDialog,
} from '@/components/admin/deposit';
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
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentDepositPanelProps {
  bookingId: string;
  bookingStatus?: string;
  onComplete?: () => void;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card_terminal', label: 'Card Terminal' },
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'card', label: 'Online Card' },
  { value: 'other', label: 'Other' },
];

export function PaymentDepositPanel({ 
  bookingId, 
  bookingStatus = 'confirmed',
  onComplete 
}: PaymentDepositPanelProps) {
  const { data: status, isLoading } = usePaymentDepositStatus(bookingId);
  const { data: depositHoldInfo, isLoading: depositLoading } = useDepositHoldStatus(bookingId);
  const recordPayment = useRecordPaymentDeposit();
  const sendRequest = useSendPaymentRequest();
  const releaseDeposit = useReleaseDeposit();
  const createDepositHold = useCreateDepositHold();

  // Real-time subscription for deposit status
  useRealtimeDepositStatus(bookingId);

  const [activeTab, setActiveTab] = useState<'payment' | 'deposit'>('payment');
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
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [legacyReleaseDialogOpen, setLegacyReleaseDialogOpen] = useState(false);

  if (isLoading || depositLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  // Determine if using Stripe hold or legacy manual tracking
  const hasStripeHold = depositHoldInfo && 
    ['requires_payment', 'authorizing', 'authorized', 'capturing', 'captured', 'releasing', 'released'].includes(depositHoldInfo.status);
  const canCreateStripeHold = !hasStripeHold && status.depositRequired > 0;

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

  const handleCreateStripeHold = () => {
    createDepositHold.mutate({
      bookingId,
      amount: status.depositRequired,
    });
  };

  const handleLegacyReleaseDeposit = (paymentId: string) => {
    setSelectedDepositId(paymentId);
    setLegacyReleaseDialogOpen(true);
  };

  const confirmLegacyReleaseDeposit = () => {
    if (!selectedDepositId) return;
    
    releaseDeposit.mutate({
      bookingId,
      paymentId: selectedDepositId,
    }, {
      onSuccess: () => {
        setLegacyReleaseDialogOpen(false);
        setSelectedDepositId(null);
      },
    });
  };

  const getPaymentStatusBadge = () => {
    switch (status.paymentStatus) {
      case 'paid':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  };

  const getDepositStatusBadge = () => {
    if (hasStripeHold && depositHoldInfo) {
      const holdStatus = depositHoldInfo.status;
      if (holdStatus === 'authorized') {
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Shield className="h-3 w-3 mr-1" /> Hold Active
        </Badge>;
      }
      if (holdStatus === 'captured') {
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Captured</Badge>;
      }
      if (holdStatus === 'released') {
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Released</Badge>;
      }
      if (['authorizing', 'capturing', 'releasing'].includes(holdStatus)) {
        return <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
        </Badge>;
      }
    }

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
            {status.allComplete && !hasStripeHold && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
            {hasStripeHold && depositHoldInfo?.status === 'authorized' && status.paymentStatus === 'paid' && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'payment' | 'deposit')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payment" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payment
                {status.paymentStatus !== 'paid' && status.balance > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    ${status.balance.toFixed(0)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="deposit" className="gap-2">
                <Shield className="h-4 w-4" />
                Deposit
                {hasStripeHold && depositHoldInfo?.status === 'authorized' && (
                  <div className="ml-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Payment Tab */}
            <TabsContent value="payment" className="mt-4 space-y-4">
              {/* Payment Summary */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Rental Payment</span>
                  {getPaymentStatusBadge()}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Due</span>
                    <span className="font-medium font-mono">${status.totalDue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-emerald-600 font-medium font-mono">${status.totalPaid.toFixed(2)}</span>
                  </div>
                  {status.balance > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="font-medium">Balance Due</span>
                      <span className="text-destructive font-semibold font-mono">${status.balance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Actions */}
              {status.balance > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleOpenPaymentDialog('rental')}>
                    <Banknote className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setRequestAmount(status.balance.toFixed(2));
                    setSendRequestOpen(true);
                  }}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Link
                  </Button>
                </div>
              )}

              {/* Transaction History */}
              {status.payments.filter(p => p.paymentType === 'rental').length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Transactions
                  </p>
                  <div className="space-y-2">
                    {status.payments.filter(p => p.paymentType === 'rental').map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(payment.createdAt), 'MMM d')}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {payment.paymentMethod || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono">${payment.amount.toFixed(2)}</span>
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Deposit Tab */}
            <TabsContent value="deposit" className="mt-4 space-y-4">
              {/* Stripe Hold Visualizer */}
              {hasStripeHold && depositHoldInfo && (
                <DepositHoldVisualizer depositInfo={depositHoldInfo} />
              )}

              {/* No deposit required */}
              {status.depositRequired === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No security deposit required</p>
                </div>
              )}

              {/* Create Stripe Hold Option */}
              {canCreateStripeHold && (
                <div className="p-4 rounded-lg border border-dashed bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm">Stripe Authorization Hold</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Place a ${status.depositRequired.toFixed(2)} hold on customer's card without charging.
                    Can be captured for damages or released when rental completes.
                  </p>
                  <Button 
                    size="sm" 
                    onClick={handleCreateStripeHold}
                    disabled={createDepositHold.isPending}
                  >
                    {createDepositHold.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Create Hold
                  </Button>
                </div>
              )}

              {/* Legacy Manual Deposit */}
              {!hasStripeHold && status.depositRequired > 0 && (
                <>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Manual Deposit</span>
                      {getDepositStatusBadge()}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Required</span>
                        <span className="font-medium font-mono">${status.depositRequired.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Held</span>
                        <span className={cn(
                          "font-mono",
                          status.depositHeld > 0 ? "text-blue-600 font-medium" : ""
                        )}>
                          ${status.depositHeld.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {status.depositStatus === 'pending' && (
                    <Button size="sm" variant="secondary" onClick={() => handleOpenPaymentDialog('deposit')}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Record Deposit (Manual)
                    </Button>
                  )}

                  {status.depositStatus === 'held' && depositPayments.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">
                        Deposit held: <span className="font-mono font-medium">${status.depositHeld.toFixed(2)}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLegacyReleaseDeposit(depositPayments[0].id)}
                      >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Release
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Stripe Hold Actions */}
              {hasStripeHold && depositHoldInfo?.status === 'authorized' && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setReleaseDialogOpen(true)}
                    className="flex-1"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Release Hold
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setCaptureDialogOpen(true)}
                    className="flex-1"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Next Steps Alert */}
          {status.paymentStatus === 'paid' && 
           (status.depositStatus === 'held' || (hasStripeHold && depositHoldInfo?.status === 'authorized')) && (
            <>
              <Separator />
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Ready for handover:</strong> Agreement signing → Vehicle walkaround
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stripe Hold Dialogs */}
      {depositHoldInfo && (
        <>
          <ReleaseHoldDialog
            open={releaseDialogOpen}
            onOpenChange={setReleaseDialogOpen}
            depositInfo={depositHoldInfo}
            bookingStatus={bookingStatus}
            onSuccess={() => setReleaseDialogOpen(false)}
          />
          <CaptureDepositDialog
            open={captureDialogOpen}
            onOpenChange={setCaptureDialogOpen}
            depositInfo={depositHoldInfo}
            onSuccess={() => setCaptureDialogOpen(false)}
          />
        </>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {paymentType === 'deposit' ? 'Record Deposit (Manual)' : 'Record Payment'}
            </DialogTitle>
            <DialogDescription>
              {paymentType === 'deposit'
                ? 'Record a security deposit received manually (cash, terminal, etc.)'
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
                  className="pl-7 font-mono"
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
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Alert */}
      <AlertDialog open={confirmPaymentOpen} onOpenChange={setConfirmPaymentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {paymentType === 'deposit' ? 'Deposit' : 'Payment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {paymentType === 'deposit' ? (
                <>
                  This will mark <strong>${paymentData.amount}</strong> as held via{' '}
                  <strong>{paymentMethods.find(m => m.value === paymentData.method)?.label}</strong>.
                </>
              ) : (
                <>
                  This will record <strong>${paymentData.amount}</strong> received via{' '}
                  <strong>{paymentMethods.find(m => m.value === paymentData.method)?.label}</strong>.
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
              {recordPayment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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
              Send a payment link to the customer to collect the balance
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
                  className="pl-7 font-mono"
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
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legacy Release Deposit Confirmation */}
      <AlertDialog open={legacyReleaseDialogOpen} onOpenChange={setLegacyReleaseDialogOpen}>
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
              onClick={confirmLegacyReleaseDeposit}
              disabled={releaseDeposit.isPending}
            >
              {releaseDeposit.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Release Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
