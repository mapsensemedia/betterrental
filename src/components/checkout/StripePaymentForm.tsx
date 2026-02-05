/**
 * StripePaymentForm - Stripe Elements integration for checkout deposit authorization
 * 
 * Creates an authorization hold (manual capture PaymentIntent) on the customer's card
 * during checkout. The hold can later be captured or released by ops.
 */
import { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, CreditCard, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StripePaymentFormProps {
  clientSecret: string;
  depositAmount: number;
  rentalAmount: number;
  onSuccess: (paymentIntentId: string, paymentMethodId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function StripePaymentForm({
  clientSecret,
  depositAmount,
  rentalAmount,
  onSuccess,
  onError,
  disabled = false,
  className,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements || disabled) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the PaymentIntent (this places the authorization hold)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href, // Not used for manual capture
        },
        redirect: "if_required", // Only redirect if 3DS is required
      });

      if (error) {
        // Handle specific error types
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(error.message || "Card validation failed");
        } else if (error.code === "card_declined") {
          setErrorMessage("Your card was declined. Please try a different card.");
        } else if (error.code === "insufficient_funds") {
          setErrorMessage("Insufficient funds for this authorization.");
        } else {
          setErrorMessage(error.message || "An unexpected error occurred");
        }
        onError(error.message || "Payment failed");
      } else if (paymentIntent) {
        // Authorization was successful
        if (paymentIntent.status === "requires_capture") {
          // Perfect - the hold is placed and waiting for capture
          onSuccess(paymentIntent.id, paymentIntent.payment_method as string);
        } else if (paymentIntent.status === "succeeded") {
          // Shouldn't happen with manual capture, but handle it
          onSuccess(paymentIntent.id, paymentIntent.payment_method as string);
        } else {
          setErrorMessage(`Unexpected status: ${paymentIntent.status}`);
          onError(`Unexpected status: ${paymentIntent.status}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
      onError(err.message || "Payment processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Payment Details</h3>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span className="text-xs">Secure</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="border rounded-lg p-4 bg-card">
        <PaymentElement 
          onReady={() => setIsReady(true)}
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            business: {
              name: "C2C Car Rental",
            },
          }}
        />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Authorization Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Authorization Hold Notice
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A hold of <strong>${depositAmount.toFixed(2)} CAD</strong> will be placed on your card for the security deposit. 
              This is not a charge - the hold will be released when you return the vehicle in good condition.
            </p>
          </div>
        </div>
      </div>

      {/* Debit Card Warning */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          ⚠️ Debit and prepaid cards are not accepted.
        </p>
      </div>

      {/* Policy Text */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        A valid credit card (not debit) is required at pickup. An authorization hold of up to CAD ${depositAmount.toFixed(2)} plus estimated charges will be placed on your card.
      </p>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!stripe || !elements || !isReady || isProcessing || disabled}
        className="w-full h-14 text-lg"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Authorizing...
          </>
        ) : (
          <>
            Authorize ${depositAmount.toFixed(2)} CAD & Complete Booking
          </>
        )}
      </Button>
    </div>
  );
}
