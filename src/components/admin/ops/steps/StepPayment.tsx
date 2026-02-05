/**
 * StepPayment - Stripe-only payment status display
 * 
 * Shows authorization hold status from Stripe. No manual payment recording.
 * Payments are collected at checkout via Stripe authorization hold.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  CreditCard, 
  Shield, 
  Clock, 
  Loader2,
  AlertCircle,
  ExternalLink 
} from "lucide-react";
import { useDepositHoldStatus, useRealtimeDepositStatus } from "@/hooks/use-deposit-hold";
import { DepositHoldVisualizer } from "@/components/admin/deposit";
import { cn } from "@/lib/utils";

interface StepPaymentProps {
  bookingId: string;
  completion: {
    paymentComplete: boolean;
    depositCollected: boolean;
  };
}

export function StepPayment({ bookingId, completion }: StepPaymentProps) {
  const { data: depositInfo, isLoading } = useDepositHoldStatus(bookingId);
  
  // Real-time subscription for deposit status updates
  useRealtimeDepositStatus(bookingId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Determine hold status
  const hasActiveHold = depositInfo && 
    ["authorized", "requires_payment", "authorizing"].includes(depositInfo.status);
  const isAuthorized = depositInfo?.status === "authorized";
  const isPending = depositInfo?.status === "requires_payment" || depositInfo?.status === "authorizing";
  const isCaptured = depositInfo?.status === "captured";
  const isReleased = depositInfo?.status === "released";

  const getStatusBadge = () => {
    if (isAuthorized) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Authorization Held
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Badge variant="secondary" className="text-amber-600">
          <Clock className="w-3 h-3 mr-1" />
          Awaiting Customer Payment
        </Badge>
      );
    }
    if (isCaptured) {
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
          <CreditCard className="w-3 h-3 mr-1" />
          Captured
        </Badge>
      );
    }
    if (isReleased) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Released
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircle className="w-3 h-3 mr-1" />
        No Authorization
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Payment & Deposit Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Payment Authorization</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            {isAuthorized 
              ? "Customer's card has been authorized. Funds will be captured at rental closeout."
              : isPending 
                ? "Waiting for customer to complete payment at checkout."
                : isCaptured
                  ? "Payment has been captured from the customer's card."
                  : isReleased
                    ? "Authorization hold has been released."
                    : "No payment authorization on file."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stripe Hold Visualizer */}
          {depositInfo && hasActiveHold && (
            <DepositHoldVisualizer depositInfo={depositInfo} />
          )}

          {/* No Authorization Alert */}
          {!depositInfo?.stripePaymentIntentId && !isPending && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">No payment authorization found</p>
                <p className="text-sm text-muted-foreground">
                  The customer needs to complete checkout with their credit card. 
                  Authorization is collected automatically during the booking process.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Awaiting Payment Alert */}
          {isPending && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <p className="font-medium mb-1">Awaiting customer payment</p>
                <p className="text-sm">
                  The customer has started checkout but hasn't completed payment yet.
                  Once they confirm their card, the authorization will be placed.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary when authorized */}
          {isAuthorized && depositInfo && (
            <div className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <Shield className="h-4 w-4" />
                Ready for Handover
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Authorization Amount</p>
                  <p className="font-semibold font-mono">
                    ${depositInfo.amount?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Authorized At</p>
                  <p className="font-medium">
                    {depositInfo.authorizedAt 
                      ? new Date(depositInfo.authorizedAt).toLocaleDateString()
                      : "—"
                    }
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This authorization holds funds on the customer's card without charging. 
                At closeout, the rental amount is captured and any remaining deposit is released.
              </p>
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
              Payment {completion.paymentComplete ? "Authorized" : "Pending"}
            </div>
            <div className={cn(
              "flex items-center gap-2 text-sm",
              completion.depositCollected ? "text-emerald-600" : "text-muted-foreground"
            )}>
              {completion.depositCollected ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Deposit {completion.depositCollected ? "Held" : "Pending"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
