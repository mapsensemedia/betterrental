/**
 * PayNowCard - lets a customer who chose "pay at pickup" pay their rental
 * online from the booking page. Charges the rental amount, then places the
 * security deposit hold on the same card (same two-step sequence as checkout).
 *
 * No repricing happens here: amounts come straight from the booking record and
 * all financial writes stay in the wl-pay / wl-authorize edge functions.
 */
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { WorldlineCheckout, type WorldlineCheckoutHandle } from "@/components/payments/WorldlineCheckout";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PayNowCardProps {
  bookingId: string;
  amount: number;
  depositAmount: number;
}

export function PayNowCard({ bookingId, amount, depositAmount }: PayNowCardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "paying" | "deposit">("idle");
  const [error, setError] = useState<string | null>(null);
  const worldlineRef = useRef<WorldlineCheckoutHandle>(null);
  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-payments", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["receipts", bookingId] });
  };

  if (!open) {
    return (
      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Changed your mind?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pay now to speed things up at pickup and enjoy a hassle-free handover.
            </p>
            <Button className="mt-3" onClick={() => setOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay now — ${amount.toFixed(2)}
              {depositAmount > 0 ? ` + $${depositAmount.toFixed(2)} hold` : ""}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="mt-4 border-primary/30">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Card Details
          </h3>
          {step === "idle" && (
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          You'll be charged ${amount.toFixed(2)} for your rental
          {depositAmount > 0 ? `, plus a $${depositAmount.toFixed(2)} refundable security hold on the same card.` : "."}
        </p>

        {step !== "idle" && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              {step === "paying" ? "Charging rental amount..." : "Placing deposit hold..."}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <WorldlineCheckout
          ref={worldlineRef}
          mode="pay"
          bookingId={bookingId}
          amount={amount}
          buttonLabel={`Pay $${amount.toFixed(2)}`}
          onProcessingChange={(processing) => setStep(processing ? "paying" : "idle")}
          onSuccess={async () => {
            setError(null);

            let depositFailed = false;
            if (depositAmount > 0) {
              setStep("deposit");
              try {
                const tokenResult = await worldlineRef.current?.getToken();
                if (tokenResult) {
                  const { data: authData, error: authError } = await supabase.functions.invoke("wl-authorize", {
                    body: {
                      bookingId,
                      token: tokenResult.token,
                      name: tokenResult.name || worldlineRef.current?.getCardholderName()?.trim() || "Cardholder",
                    },
                  });
                  if (authError || authData?.error) {
                    depositFailed = true;
                    console.warn("[pay-now] deposit hold failed:", authError || authData?.error);
                  }
                } else {
                  depositFailed = true;
                }
              } catch (depositErr) {
                depositFailed = true;
                console.warn("[pay-now] deposit hold exception:", depositErr);
              }
            }

            try {
              await supabase.functions.invoke("check-booking-payment-integrity", { body: { bookingId } });
            } catch (intErr) {
              console.warn("[pay-now] integrity check failed (non-blocking):", intErr);
            }

            setStep("idle");
            setOpen(false);
            refresh();

            if (depositFailed) {
              toast.success("Payment received", {
                description: "We couldn't place the security hold — staff will take it at pickup.",
              });
            } else {
              toast.success("Payment received — you're all set for pickup.");
            }
          }}
          onError={(errorMsg) => {
            setError(errorMsg);
            setStep("idle");
          }}
        />
      </CardContent>
    </Card>
  );
}
