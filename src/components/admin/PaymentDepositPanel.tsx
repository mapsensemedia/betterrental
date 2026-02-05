/**
 * PaymentDepositPanel
 * 
 * Stripe-only payment and deposit management panel.
 * Displays authorization hold status - no manual payment recording.
 * 
 * Authorization is collected at customer checkout via Stripe Elements.
 * At closeout, rental is captured and deposit is released (or captured for damages).
 */

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  usePaymentDepositStatus,
} from '@/hooks/use-payment-deposit';
import {
  useDepositHoldStatus,
  useRealtimeDepositStatus,
} from '@/hooks/use-deposit-hold';
import { useCreateCheckoutHold } from '@/hooks/use-checkout-hold';
import {
  DepositHoldVisualizer,
  ReleaseHoldDialog,
  CaptureDepositDialog,
} from '@/components/admin/deposit';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Shield,
  Info,
  Plus,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

interface PaymentDepositPanelProps {
  bookingId: string;
  bookingStatus?: string;
  onComplete?: () => void;
}

export function PaymentDepositPanel({ 
  bookingId, 
  bookingStatus = 'confirmed',
  onComplete 
}: PaymentDepositPanelProps) {
  const { data: status, isLoading } = usePaymentDepositStatus(bookingId);
  const { data: depositHoldInfo, isLoading: depositLoading } = useDepositHoldStatus(bookingId);
  const [activeTab, setActiveTab] = useState<'payment' | 'deposit'>('payment');
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  
  const createHoldMutation = useCreateCheckoutHold();

  // Real-time subscription for deposit status
  useRealtimeDepositStatus(bookingId);

  const handleCreateHold = () => {
    if (!status) return;
    
    createHoldMutation.mutate({
      bookingId,
      depositAmount: status.depositRequired || 350,
      rentalAmount: status.totalDue || 0,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

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

  // Determine authorization status
  const hasStripeHold = depositHoldInfo && 
    ['requires_payment', 'authorizing', 'authorized', 'capturing', 'captured', 'releasing', 'released'].includes(depositHoldInfo.status);
  const isAuthorized = depositHoldInfo?.status === 'authorized';
  const isPending = depositHoldInfo?.status === 'requires_payment' || depositHoldInfo?.status === 'authorizing';
  const isCaptured = depositHoldInfo?.status === 'captured';
  const isReleased = depositHoldInfo?.status === 'released';

  const getPaymentStatusBadge = () => {
    if (isAuthorized) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Authorized
      </Badge>;
    }
    if (isPending) {
      return <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Awaiting Payment
      </Badge>;
    }
    if (isCaptured) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Captured</Badge>;
    }
    if (isReleased) {
      return <Badge variant="outline">Released</Badge>;
    }
    return <Badge variant="outline">No Authorization</Badge>;
  };

  const getDepositStatusBadge = () => {
    if (isAuthorized) {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
        <Shield className="h-3 w-3 mr-1" /> Hold Active
      </Badge>;
    }
    if (isCaptured) {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Captured</Badge>;
    }
    if (isReleased) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Released</Badge>;
    }
    if (isPending) {
      return <Badge variant="secondary">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
      </Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  // Check if all complete for handover
  const allComplete = isAuthorized || isCaptured;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment & Deposit
            </CardTitle>
            {allComplete && (
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
              </TabsTrigger>
              <TabsTrigger value="deposit" className="gap-2">
                <Shield className="h-4 w-4" />
                Deposit
                {isAuthorized && (
                  <div className="ml-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Payment Tab */}
            <TabsContent value="payment" className="mt-4 space-y-4">
              {/* Authorization Status */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Authorization Status</span>
                  {getPaymentStatusBadge()}
                </div>
                
                {/* Show Stripe IDs when hold exists */}
                {hasStripeHold && depositHoldInfo?.stripePaymentIntentId && (
                  <div className="mb-3 p-3 rounded-md bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Hold ID (PI)</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                          {depositHoldInfo.stripePaymentIntentId.slice(0, 20)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(depositHoldInfo.stripePaymentIntentId!, "Hold ID")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <a
                          href={`https://dashboard.stripe.com/payments/${depositHoldInfo.stripePaymentIntentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    
                    {depositHoldInfo.stripeChargeId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Charge ID</span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs bg-background px-2 py-0.5 rounded">
                            {depositHoldInfo.stripeChargeId.slice(0, 20)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(depositHoldInfo.stripeChargeId!, "Charge ID")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {depositHoldInfo.cardLast4 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Card</span>
                        <span className="font-mono">
                          {depositHoldInfo.cardBrand || 'Card'} •••• {depositHoldInfo.cardLast4}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {isAuthorized && depositHoldInfo && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Authorized</span>
                      <span className="font-medium font-mono">${depositHoldInfo.amount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rental Portion</span>
                      <span className="font-mono">${status.totalDue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit Portion</span>
                      <span className="font-mono">${status.depositRequired.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {isPending && (
                  <p className="text-sm text-muted-foreground">
                    Customer has not completed checkout payment yet.
                  </p>
                )}

                {!hasStripeHold && (
                  <div className="space-y-3">
                    <Alert variant="default" className="border-amber-500/20 bg-amber-500/5">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-sm">
                        <p className="font-medium text-amber-700">No payment authorization found</p>
                        <p className="text-muted-foreground mt-1">
                          The customer needs to complete checkout with their credit card. Authorization is collected automatically during the booking process.
                        </p>
                      </AlertDescription>
                    </Alert>
                    
                    <Button 
                      onClick={handleCreateHold}
                      disabled={createHoldMutation.isPending}
                      className="w-full"
                      variant="outline"
                    >
                      {createHoldMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Hold...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Authorization Hold
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Creates a ${((status.totalDue || 0) + (status.depositRequired || 350)).toFixed(2)} hold 
                      (Rental: ${status.totalDue?.toFixed(2)} + Deposit: ${(status.depositRequired || 350).toFixed(2)})
                    </p>
                  </div>
                )}
              </div>

              {/* How It Works Info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-1">Stripe Authorization Flow</p>
                  <p className="text-muted-foreground">
                    Payment is collected at checkout via Stripe. The combined rental + deposit 
                    amount is authorized (held) on the customer's card. At closeout, the rental 
                    is captured and the deposit is released automatically.
                  </p>
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Deposit Tab */}
            <TabsContent value="deposit" className="mt-4 space-y-4">
              {/* Stripe Hold Visualizer */}
              {hasStripeHold && depositHoldInfo && (
                <DepositHoldVisualizer depositInfo={depositHoldInfo} />
              )}

              {/* No deposit info */}
              {!hasStripeHold && (
                <div className="text-center py-6 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No deposit authorization</p>
                  <p className="text-sm mt-1">
                    Customer must complete checkout to authorize deposit.
                  </p>
                </div>
              )}

              {/* Deposit Summary */}
              {isAuthorized && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Deposit Hold</span>
                    {getDepositStatusBadge()}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit Amount</span>
                      <span className="font-medium font-mono">${status.depositRequired.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-blue-600 font-medium">Held on Card</span>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground">
                    Deposit is held as part of the authorization. It will be released automatically 
                    when the rental is completed, or captured if there are damages.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs for manual capture/release (admin override) */}
      {depositHoldInfo && (
        <>
          <ReleaseHoldDialog
            open={releaseDialogOpen}
            onOpenChange={setReleaseDialogOpen}
            depositInfo={depositHoldInfo}
            bookingStatus={bookingStatus}
          />
          <CaptureDepositDialog
            open={captureDialogOpen}
            onOpenChange={setCaptureDialogOpen}
            depositInfo={depositHoldInfo}
          />
        </>
      )}
    </>
  );
}
