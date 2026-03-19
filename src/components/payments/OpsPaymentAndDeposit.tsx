/**
 * OpsPaymentAndDeposit — Dedicated Ops payment component
 *
 * For pay+hold flows, a single WorldlineCheckout instance is kept in headless
 * mode. Staff enter card details once; two tokens are generated sequentially
 * (rental charge → deposit authorization) without remounting the form.
 */
import { useState, useCallback, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { WorldlineCheckout, WorldlineCheckoutHandle } from "@/components/payments/WorldlineCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_DEPOSIT_AMOUNT } from "@/lib/pricing";

interface OpsPaymentAndDepositProps {
  bookingId: string;
  rentalAmount: number;
  depositAmount?: number;
  onUpdated: () => void;
}

type FlowStep = "idle" | "processing" | "done";

export function OpsPaymentAndDeposit({
  bookingId,
  rentalAmount,
  depositAmount = DEFAULT_DEPOSIT_AMOUNT,
  onUpdated,
}: OpsPaymentAndDepositProps) {
  const [step, setStep] = useState<FlowStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCardReady, setIsCardReady] = useState(false);
  const checkoutRef = useRef<WorldlineCheckoutHandle>(null);

  const isPayAndHold = rentalAmount > 0;

  /* ------------------------------------------------------------------ */
  /*  Server-side truth check                                            */
  /* ------------------------------------------------------------------ */
  const verifyServerState = useCallback(async () => {
    const { data: booking } = await supabase
      .from("bookings")
      .select("status, wl_transaction_id, wl_auth_status, wl_deposit_transaction_id, wl_deposit_auth_status, deposit_status")
      .eq("id", bookingId)
      .single();

    return {
      rentalPaid:
        !!booking?.wl_transaction_id &&
        (booking.status === "confirmed" || booking.status === "active"),
      depositAuthorized:
        !!booking?.wl_deposit_transaction_id &&
        [booking?.deposit_status, booking?.wl_deposit_auth_status]
          .map((v) => v?.toLowerCase().trim())
          .some((v) => v === "authorized" || v === "hold_created"),
    };
  }, [bookingId]);

  /* ------------------------------------------------------------------ */
  /*  Pay + Hold sequential flow (single card entry)                     */
  /* ------------------------------------------------------------------ */
  const handlePayAndHold = useCallback(async () => {
    console.log("[OpsPayment] Charge click received", { hasRef: !!checkoutRef.current, isCardReady });
    if (!checkoutRef.current) {
      setError("Payment form not ready. Please wait for the card form to load.");
      toast.error("Payment form not ready");
      return;
    }
    setError(null);
    setStep("processing");

    // ── Step 1: Rental charge ──
    setStatusMessage("Charging rental…");
    let tokenA: { token: string; last4: string; name: string };
    try {
      tokenA = await checkoutRef.current.getToken();
    } catch (err: any) {
      setError(err.message || "Failed to tokenize card");
      setStep("idle");
      setStatusMessage(null);
      return;
    }

    const { data: payData, error: payError } = await supabase.functions.invoke("wl-pay", {
      body: { bookingId, token: tokenA.token, name: tokenA.name },
    });

    if (payError || payData?.error || payData?.declined) {
      // Check server truth before showing error
      try {
        const truth = await verifyServerState();
        if (truth.rentalPaid) {
          console.warn("[OpsPayment] Rental succeeded server-side despite client error");
          // Fall through to deposit step
        } else {
          const msg =
            payData?.error ||
            (payData?.declined ? "Card was declined. Please try a different card." : "Rental payment failed. Please try again.");
          setError(msg);
          setStep("idle");
          setStatusMessage(null);
          return;
        }
      } catch {
        setError("Rental payment failed. Please try again.");
        setStep("idle");
        setStatusMessage(null);
        return;
      }
    }

    // ── Step 2: Deposit authorization ──
    setStatusMessage("Placing deposit hold…");
    let tokenB: { token: string; last4: string; name: string };
    try {
      tokenB = await checkoutRef.current.getToken();
    } catch (err: any) {
      // Rental succeeded but second tokenization failed
      toast.info("Rental payment received. Deposit hold will be arranged separately.");
      setStep("done");
      setStatusMessage(null);
      onUpdated();
      return;
    }

    const { data: authData, error: authError } = await supabase.functions.invoke("wl-authorize", {
      body: { bookingId, token: tokenB.token, name: tokenB.name },
    });

    if (authError || authData?.error || authData?.declined) {
      // Check server truth
      try {
        const truth = await verifyServerState();
        if (truth.depositAuthorized) {
          console.warn("[OpsPayment] Deposit authorized server-side despite client error");
          toast.success("Payment and deposit hold completed successfully");
          setStep("done");
          setStatusMessage(null);
          onUpdated();
          return;
        }
      } catch {
        // fall through
      }
      toast.info("Rental payment received. Deposit hold will be arranged separately.");
      setStep("done");
      setStatusMessage(null);
      onUpdated();
      return;
    }

    // Both succeeded
    toast.success("Payment and deposit hold completed successfully");
    setError(null);
    setStep("done");
    setStatusMessage(null);
    onUpdated();
  }, [bookingId, onUpdated, verifyServerState]);

  /* ------------------------------------------------------------------ */
  /*  Deposit-only callbacks (standard non-headless mode)                */
  /* ------------------------------------------------------------------ */
  const handleDepositSuccess = useCallback(() => {
    toast.success("Deposit hold placed successfully");
    setError(null);
    setStep("done");
    onUpdated();
  }, [onUpdated]);

  const handleDepositError = useCallback(
    async (errorMsg: string) => {
      try {
        const truth = await verifyServerState();
        if (truth.depositAuthorized) {
          handleDepositSuccess();
          return;
        }
      } catch {
        // fall through
      }
      setError(errorMsg);
    },
    [handleDepositSuccess, verifyServerState],
  );

  /* ------------------------------------------------------------------ */
  /*  Render: Done state                                                 */
  /* ------------------------------------------------------------------ */
  if (step === "done") {
    return (
      <Alert className="border-border bg-muted/40">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          <p className="font-medium">
            {isPayAndHold ? "Payment and deposit hold completed" : "Deposit hold placed successfully"}
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render: Deposit-only mode (no rental to charge)                    */
  /* ------------------------------------------------------------------ */
  if (!isPayAndHold) {
    return (
      <div className="space-y-3">
        <Alert className="border-border bg-muted/40">
          <CreditCard className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            <p className="font-medium mb-1">Place Deposit Hold</p>
            <p className="text-sm text-muted-foreground">
              Enter card details to place a real ${depositAmount.toFixed(2)} deposit hold.
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
          mode="authorize"
          bookingId={bookingId}
          amount={depositAmount}
          onSuccess={handleDepositSuccess}
          onError={(msg) => void handleDepositError(msg)}
          buttonLabel={`Create $${depositAmount.toFixed(2)} deposit hold`}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render: Pay + Hold mode (single card entry, headless)              */
  /* ------------------------------------------------------------------ */
  return (
    <div className="space-y-3">
      <Alert className="border-border bg-muted/40">
        <CreditCard className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          <p className="font-medium mb-1">Take Payment &amp; Deposit Hold</p>
          <p className="text-sm text-muted-foreground">
            Enter card details once to charge the ${rentalAmount.toFixed(2)} rental and place a $
            {depositAmount.toFixed(2)} deposit hold.
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
        ref={checkoutRef}
        mode="pay"
        bookingId={bookingId}
        amount={rentalAmount}
        headless
        onSuccess={() => {}}
        onError={() => {}}
      />

      {/* Processing overlay */}
      {step === "processing" && statusMessage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          {statusMessage}
        </div>
      )}

      <Button
        onClick={handlePayAndHold}
        disabled={step === "processing" || !checkoutRef.current?.isReady()}
        className="w-full h-14 text-lg"
        size="lg"
      >
        {step === "processing" ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Charge ${rentalAmount.toFixed(2)} rental + ${depositAmount.toFixed(2)} deposit hold
          </>
        )}
      </Button>
    </div>
  );
}
