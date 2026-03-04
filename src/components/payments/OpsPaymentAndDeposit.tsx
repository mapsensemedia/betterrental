/**
 * OpsPaymentAndDeposit — Dedicated Ops payment component
 * 
 * Two modes:
 *  - pay+hold: Charge rental, then place deposit hold (sequential, same card)
 *  - hold-only: Place deposit hold only (rental already paid)
 * 
 * Uses WorldlineCheckout hosted fields for PCI compliance.
 * Implements server-truth reconciliation on all error paths.
 */
import { useRef, useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, AlertCircle, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react";
import { WorldlineCheckout } from "@/components/payments/WorldlineCheckout";
import type { WorldlineCheckoutHandle } from "@/components/payments/WorldlineCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_DEPOSIT_AMOUNT } from "@/lib/pricing";

interface OpsPaymentAndDepositProps {
  bookingId: string;
  rentalAmount: number;
  depositAmount?: number;
  onUpdated: () => void;
}

type FlowStep = "idle" | "paying" | "depositing" | "done" | "rental-only";

export function OpsPaymentAndDeposit({
  bookingId,
  rentalAmount,
  depositAmount = DEFAULT_DEPOSIT_AMOUNT,
  onUpdated,
}: OpsPaymentAndDepositProps) {
  const worldlineRef = useRef<WorldlineCheckoutHandle>(null);
  const [step, setStep] = useState<FlowStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rentalPaid, setRentalPaid] = useState(false);

  // Determine mode: if rental amount > 0 → pay+hold, else hold-only
  const isPayAndHold = rentalAmount > 0;

  /**
   * Server-truth reconciliation: check DB state before showing error
   */
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
      depositAuthorized: booking?.deposit_status === "authorized" || booking?.wl_deposit_auth_status === "authorized",
      wlTransactionId: booking?.wl_transaction_id || null,
      wlDepositTransactionId: booking?.wl_deposit_transaction_id || null,
    };
  }, [bookingId]);

  /**
   * Full flow: Pay rental → Place deposit hold
   */
  const handlePaySuccess = useCallback(async (result: { transactionId: string; lastFour: string }) => {
    setRentalPaid(true);
    setStep("depositing");
    setError(null);

    try {
      // Get fresh token for deposit hold
      const tokenData = await worldlineRef.current!.getToken();

      const { data, error: fnError } = await supabase.functions.invoke("wl-authorize", {
        body: { bookingId, token: tokenData.token, name: tokenData.name },
      });

      if (fnError || data?.error || data?.declined) {
        // Verify server-side truth before showing failure
        const truth = await verifyServerState();
        if (truth.depositAuthorized) {
          toast.success("Payment and deposit hold completed");
          setStep("done");
          onUpdated();
          return;
        }
        console.warn("[OpsPayment] Deposit hold failed after rental:", fnError || data?.error);
        toast.info("Rental paid ✅ — Deposit hold failed. Use 'Retry Deposit Hold' below.");
        setStep("rental-only");
        onUpdated();
        return;
      }

      toast.success("Payment and deposit hold completed successfully");
      setStep("done");
      onUpdated();
    } catch (err: any) {
      // Check server truth
      const truth = await verifyServerState();
      if (truth.depositAuthorized) {
        toast.success("Payment and deposit hold completed");
        setStep("done");
        onUpdated();
        return;
      }
      console.warn("[OpsPayment] Deposit hold error:", err);
      toast.info("Rental paid ✅ — Deposit hold failed. Use 'Retry Deposit Hold' below.");
      setStep("rental-only");
      onUpdated();
    }
  }, [bookingId, onUpdated, verifyServerState]);

  /**
   * Handle rental payment error with server-truth check
   */
  const handlePayError = useCallback(async (errorMsg: string) => {
    try {
      const truth = await verifyServerState();
      if (truth.rentalPaid) {
        toast.success("Payment confirmed (server verified)");
        setRentalPaid(true);
        if (truth.depositAuthorized) {
          setStep("done");
        } else {
          setStep("rental-only");
        }
        onUpdated();
        return;
      }
    } catch {
      // verification failed, show original error
    }
    setError(errorMsg);
  }, [verifyServerState, onUpdated]);

  /**
   * Retry deposit hold only (rental already paid)
   */
  const handleRetryDeposit = useCallback(async () => {
    if (!worldlineRef.current?.isReady()) {
      toast.error("Please fill in card details first");
      return;
    }
    setStep("depositing");
    setError(null);

    try {
      const tokenData = await worldlineRef.current.getToken();

      const { data, error: fnError } = await supabase.functions.invoke("wl-authorize", {
        body: { bookingId, token: tokenData.token, name: tokenData.name },
      });

      if (fnError || data?.error || data?.declined) {
        const truth = await verifyServerState();
        if (truth.depositAuthorized) {
          toast.success("Deposit hold placed successfully");
          setStep("done");
          onUpdated();
          return;
        }
        setError(data?.error || "Deposit hold failed. Please try again.");
        setStep("rental-only");
        return;
      }

      toast.success("Deposit hold placed successfully");
      setStep("done");
      onUpdated();
    } catch (err: any) {
      const truth = await verifyServerState();
      if (truth.depositAuthorized) {
        toast.success("Deposit hold placed successfully");
        setStep("done");
        onUpdated();
        return;
      }
      setError(err.message || "Deposit hold failed");
      setStep("rental-only");
    }
  }, [bookingId, onUpdated, verifyServerState]);

  // Done state
  if (step === "done") {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 dark:text-emerald-200">
          <p className="font-medium">Payment and deposit hold completed successfully</p>
        </AlertDescription>
      </Alert>
    );
  }

  // Rental paid but deposit failed — show retry
  if (step === "rental-only") {
    return (
      <div className="space-y-3">
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-200">
            <p className="font-medium">Rental paid ✅</p>
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="font-medium">Deposit hold not placed</p>
            <p className="text-sm mt-1">Enter card details below and retry the deposit hold.</p>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <WorldlineCheckout
          ref={worldlineRef}
          mode="authorize"
          bookingId={bookingId}
          amount={depositAmount}
          onSuccess={(result) => {
            toast.success("Deposit hold placed successfully");
            setStep("done");
            onUpdated();
          }}
          onError={(err) => setError(err)}
          headless={true}
        />

        <Button
          onClick={handleRetryDeposit}
          disabled={false}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry Deposit Hold (${depositAmount.toFixed(2)})
        </Button>
      </div>
    );
  }

  // Primary form
  return (
    <div className="space-y-3">
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CreditCard className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">
            {isPayAndHold ? "Take Payment" : "Place Deposit Hold"}
          </p>
          <p className="text-sm">
            {isPayAndHold
              ? `Enter the customer's card details below to charge the rental and place a $${depositAmount.toFixed(0)} deposit hold.`
              : `Enter card details to place a $${depositAmount.toFixed(0)} deposit hold.`}
          </p>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <WorldlineCheckout
          ref={worldlineRef}
          mode={isPayAndHold ? "pay" : "authorize"}
          bookingId={bookingId}
          amount={isPayAndHold ? rentalAmount : depositAmount}
          onSuccess={isPayAndHold ? handlePaySuccess : (result) => {
            toast.success("Deposit hold placed successfully");
            setStep("done");
            onUpdated();
          }}
          onError={handlePayError}
          disabled={step === "depositing"}
          buttonLabel={
            isPayAndHold
              ? `Pay $${rentalAmount.toFixed(2)} + $${depositAmount.toFixed(2)} deposit hold`
              : `Create $${depositAmount.toFixed(2)} deposit hold`
          }
          headless={false}
        />

        {/* Overlay during deposit step */}
        {step === "depositing" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">Placing ${depositAmount.toFixed(2)} deposit hold...</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait, do not close this panel</p>
          </div>
        )}
      </div>
    </div>
  );
}
