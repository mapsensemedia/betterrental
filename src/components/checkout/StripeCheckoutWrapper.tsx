/**
 * StripeCheckoutWrapper - Wraps the payment form with Stripe Elements provider
 */
import { useState, useEffect, useMemo } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripePaymentForm } from "./StripePaymentForm";
import { useStripeConfig } from "@/hooks/use-stripe-config";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripeCheckoutWrapperProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string, paymentMethodId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function StripeCheckoutWrapper({
  clientSecret,
  amount,
  onSuccess,
  onError,
  disabled,
}: StripeCheckoutWrapperProps) {
  const { data: config, isLoading: configLoading, error: configError } = useStripeConfig();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (config?.publishableKey && !stripePromise) {
      setStripePromise(loadStripe(config.publishableKey));
    }
  }, [config?.publishableKey, stripePromise]);

  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#0ea5e9",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "8px",
      },
    },
  }), [clientSecret]);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading payment form...</span>
      </div>
    );
  }

  if (configError || !config?.publishableKey) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Unable to load payment form. Please refresh and try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Initializing...</span>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentForm
        clientSecret={clientSecret}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        disabled={disabled}
      />
    </Elements>
  );
}
