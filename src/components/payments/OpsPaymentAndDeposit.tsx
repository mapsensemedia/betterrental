/**
 * OpsPaymentAndDeposit — Dedicated Ops payment component
 *
 * For pay+hold flows, rental is charged first and the deposit hold is then
 * collected with a fresh hosted-fields instance so wl-authorize always uses
 * a real card token.
 */
import { useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { WorldlineCheckout } from "@/components/payments/WorldlineCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_DEPOSIT_AMOUNT } from "@/lib/pricing";

interface OpsPaymentAndDepositProps {
  bookingId: string;
  rentalAmount: number;
  depositAmount?: number;
  onUpdated: () => void;
}

type FlowStep = "idle" | "collecting-deposit" | "done";

export function OpsPaymentAndDeposit({
  bookingId,
  rentalAmount,
  depositAmount = DEFAULT_DEPOSIT_AMOUNT,
  onUpdated,
}: OpsPaymentAndDepositProps) {
  const [step, setStep] = useState<FlowStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [formInstanceKey, setFormInstanceKey] = useState(0);

  const isPayAndHold = rentalAmount > 0;

  const resetFormInstance = useCallback(() => {
    setFormInstanceKey((value) => value + 1);
  }, []);

  const verifyServerState = useCallback(async (): Promise<{
    rentalPaid: boolean;
    depositAuthorized: boolean;
    wlTransactionId: string | null;
    wlDepositTransactionId: string | null;
  }> => {
    const { data: booking } = await supabase
      .from("bookings")
      .select("status, wl_transaction_id, wl_auth_status, wl_deposit_transaction_id, wl_deposit_auth_status, deposit_status")
      .eq("id", bookingId)
      .single();

    return {
      rentalPaid: !!booking?.wl_transaction_id && (booking.status === "confirmed" || booking.status === "active"),
      depositAuthorized:
        !!booking?.wl_deposit_transaction_id &&
        [booking?.deposit_status, booking?.wl_deposit_auth_status]
          .map((value) => value?.toLowerCase().trim())
          .some((value) => value === "authorized" || value === "hold_created"),
      wlTransactionId: booking?.wl_transaction_id || null,
      wlDepositTransactionId: booking?.wl_deposit_transaction_id || null,
    };
  }, [bookingId]);

  const handleDepositSuccess = useCallback(() => {
    toast.success(isPayAndHold ? "Payment and deposit hold completed successfully" : "Deposit hold placed successfully");
    setError(null);
    setStep("done");
    onUpdated();
  }, [isPayAndHold, onUpdated]);

  const handleDepositError = useCallback(async (errorMsg: string) => {
    try {
      const truth = await verifyServerState();
      if (truth.depositAuthorized) {
        handleDepositSuccess();
        return;
      }
    } catch {
      // fall through to show original error
    }

    setError(errorMsg);
    if (isPayAndHold) {
      setStep("collecting-deposit");
    }
    resetFormInstance();
  }, [handleDepositSuccess, isPayAndHold, resetFormInstance, verifyServerState]);

  const handlePaySuccess = useCallback(() => {
    setError(null);
    setStep("collecting-deposit");
    resetFormInstance();
    toast.success("Rental payment received. Re-enter card details to place the real deposit hold.");
    onUpdated();
  }, [onUpdated, resetFormInstance]);

  const handlePayError = useCallback(async (errorMsg: string) => {
    try {
      const truth = await verifyServerState();
      if (truth.rentalPaid) {
        setError(null);
        if (truth.depositAuthorized) {
          handleDepositSuccess();
        } else {
          setStep("collecting-deposit");
          resetFormInstance();
          toast.success("Rental payment confirmed. Collect deposit card details below.");
          onUpdated();
        }
        return;
      }
    } catch {
      // verification failed, show original error
    }

    setError(errorMsg);
  }, [handleDepositSuccess, onUpdated, resetFormInstance, verifyServerState]);

  if (step === "done") {
    return (
      <Alert className="border-border bg-muted/40">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          <p className="font-medium">
            {isPayAndHold ? "Payment and deposit hold completed successfully" : "Deposit hold placed successfully"}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (step === "collecting-deposit") {
    return (
      <div className="space-y-3">
        <Alert className="border-border bg-muted/40">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            <p className="font-medium">Rental payment received</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the fresh secure card form below to create the real deposit hold.</p>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <WorldlineCheckout
          key={`deposit-${bookingId}-${formInstanceKey}`}
          mode="authorize"
          bookingId={bookingId}
          amount={depositAmount}
          onSuccess={handleDepositSuccess}
          onError={(message) => {
            void handleDepositError(message);
          }}
          buttonLabel={`Create $${depositAmount.toFixed(2)} deposit hold`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Alert className="border-border bg-muted/40">
        <CreditCard className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          <p className="font-medium mb-1">{isPayAndHold ? "Take Payment" : "Place Deposit Hold"}</p>
          <p className="text-sm text-muted-foreground">
            {isPayAndHold
              ? `Charge the rental first, then collect a real $${depositAmount.toFixed(2)} deposit hold using a fresh secure card form.`
              : `Enter card details to place a real $${depositAmount.toFixed(2)} deposit hold.`}
          </p>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <WorldlineCheckout
        key={isPayAndHold ? `pay-${bookingId}` : `authorize-${bookingId}-${formInstanceKey}`}
        mode={isPayAndHold ? "pay" : "authorize"}
        bookingId={bookingId}
        amount={isPayAndHold ? rentalAmount : depositAmount}
        onSuccess={isPayAndHold ? handlePaySuccess : handleDepositSuccess}
        onError={(message) => {
          void (isPayAndHold ? handlePayError(message) : handleDepositError(message));
        }}
        buttonLabel={
          isPayAndHold
            ? `Charge $${rentalAmount.toFixed(2)} rental`
            : `Create $${depositAmount.toFixed(2)} deposit hold`
        }
      />
    </div>
  );
}
