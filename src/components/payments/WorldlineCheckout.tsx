/**
 * WorldlineCheckout - Bambora Custom Checkout SDK integration
 * 
 * Loads the hosted fields SDK and mounts secure card-number, cvv, expiry inputs.
 * On submit, creates a single-use token and calls the appropriate edge function.
 * 
 * Supports two modes:
 *  - Standalone: renders its own Pay button (default)
 *  - Headless: parent controls submission via ref.submit()
 */
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SDK_URL = "https://libs.na.bambora.com/customcheckout/1/customcheckout.js";

export interface WorldlineCheckoutHandle {
  /** Trigger tokenization + payment from the parent */
  submit: () => Promise<void>;
  /** Whether the card fields are valid and ready to submit */
  isReady: () => boolean;
  /** Get a single-use token from the mounted card fields (does NOT call any edge function) */
  getToken: () => Promise<{ token: string; last4: string; name: string }>;
}

interface WorldlineCheckoutProps {
  mode: "pay" | "authorize";
  bookingId: string;
  amount: number;
  accessToken?: string;
  onSuccess: (result: { transactionId: string; lastFour: string }) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  buttonLabel?: string;
  customerCode?: string;
  inlineError?: string;
  /** If true, hides the internal submit button — parent calls ref.submit() */
  headless?: boolean;
  /** Called when processing state changes */
  onProcessingChange?: (processing: boolean) => void;
}

interface FieldState {
  isValid: boolean;
  isEmpty: boolean;
  error: string;
}

declare global {
  interface Window {
    customcheckout?: () => CustomCheckoutInstance;
  }
}

interface CustomCheckoutInstance {
  create: (type: string, options?: Record<string, unknown>) => { mount: (selector: string) => void };
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  createToken: (callback: (result: TokenResult) => void) => void;
}

interface TokenResult {
  error?: { message: string };
  token?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
}

export const WorldlineCheckout = forwardRef<WorldlineCheckoutHandle, WorldlineCheckoutProps>(
  function WorldlineCheckout(
    {
      mode,
      bookingId,
      amount,
      accessToken,
      onSuccess,
      onError,
      disabled = false,
      buttonLabel,
      customerCode,
      inlineError,
      headless = false,
      onProcessingChange,
    },
    ref
  ) {
    const [sdkReady, setSdkReady] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardholderName, setCardholderName] = useState("");
    const [brand, setBrand] = useState("");
    const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({
      "card-number": { isValid: false, isEmpty: true, error: "" },
      cvv: { isValid: false, isEmpty: true, error: "" },
      expiry: { isValid: false, isEmpty: true, error: "" },
    });
    const checkoutRef = useRef<CustomCheckoutInstance | null>(null);
    const mountedRef = useRef(false);

    // Keep parent informed of processing state
    useEffect(() => {
      onProcessingChange?.(isProcessing);
    }, [isProcessing, onProcessingChange]);

    // We need stable refs for bookingId/accessToken/customerCode since they may change
    // after booking creation in headless mode
    const bookingIdRef = useRef(bookingId);
    const accessTokenRef = useRef(accessToken);
    const customerCodeRef = useRef(customerCode);
    useEffect(() => { bookingIdRef.current = bookingId; }, [bookingId]);
    useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);
    useEffect(() => { customerCodeRef.current = customerCode; }, [customerCode]);

    // Load SDK script
    useEffect(() => {
      if (document.querySelector(`script[src="${SDK_URL}"]`)) {
        if (window.customcheckout) {
          setSdkReady(true);
        }
        return;
      }

      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => onError("Failed to load payment SDK");
      document.head.appendChild(script);
    }, []);

    // Initialize hosted fields once SDK is ready
    useEffect(() => {
      if (!sdkReady || mountedRef.current || !window.customcheckout) return;
      mountedRef.current = true;

      const customCheckout = window.customcheckout();
      checkoutRef.current = customCheckout;

      const style = {
        base: {
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "16px",
          color: "hsl(var(--foreground))",
          "::placeholder": { color: "hsl(var(--muted-foreground))" },
        },
        error: { color: "hsl(var(--destructive))" },
      };

      const cardNumber = customCheckout.create("card-number", { style, placeholder: "4242 4242 4242 4242" });
      cardNumber.mount("#wl-card-number");

      const cvv = customCheckout.create("cvv", { style, placeholder: "123" });
      cvv.mount("#wl-cvv");

      const expiry = customCheckout.create("expiry", { style, placeholder: "MM / YY" });
      expiry.mount("#wl-expiry");

      customCheckout.on("brand", (event: unknown) => {
        const e = event as { brand?: string };
        setBrand(e.brand || "");
      });

      customCheckout.on("error", (event: unknown) => {
        const e = event as { field?: string; type?: string; message?: string };
        if (e.field) {
          setFieldStates((prev) => ({
            ...prev,
            [e.field!]: { ...prev[e.field!], isValid: false, error: e.message || "Invalid" },
          }));
        }
      });

      customCheckout.on("complete", (event: unknown) => {
        const e = event as { field?: string };
        if (e.field) {
          setFieldStates((prev) => ({
            ...prev,
            [e.field!]: { isValid: true, isEmpty: false, error: "" },
          }));
        }
      });

      customCheckout.on("empty", (event: unknown) => {
        const e = event as { field?: string; empty?: boolean };
        if (e.field) {
          setFieldStates((prev) => ({
            ...prev,
            [e.field!]: { ...prev[e.field!], isEmpty: !!e.empty },
          }));
        }
      });
    }, [sdkReady]);

    const allFieldsValid = fieldStates["card-number"].isValid && fieldStates.cvv.isValid && fieldStates.expiry.isValid;
    const canSubmit = allFieldsValid && cardholderName.trim().length > 0 && !isProcessing && !disabled;

    const handleSubmit = useCallback(async () => {
      if (!checkoutRef.current) {
        onError("Payment form not ready. Please wait a moment.");
        return;
      }
      if (!allFieldsValid || !cardholderName.trim()) {
        onError("Please fill in all card fields.");
        return;
      }
      setIsProcessing(true);

      return new Promise<void>((resolve) => {
        checkoutRef.current!.createToken(async (result: TokenResult) => {
          if (result.error || !result.token) {
            setIsProcessing(false);
            onError(result.error?.message || "Failed to tokenize card");
            resolve();
            return;
          }

          try {
            const functionName = mode === "authorize" ? "wl-authorize" : "wl-pay";
            const body: Record<string, unknown> = {
              bookingId: bookingIdRef.current,
              token: result.token,
              name: cardholderName.trim(),
            };
            if (accessTokenRef.current) body.accessToken = accessTokenRef.current;
            if (customerCodeRef.current) body.customerCode = customerCodeRef.current;

            const { data, error } = await supabase.functions.invoke(functionName, { body });

            if (error) {
              let parsed: any = null;
              try {
                const bodyText = await (error as any)?.context?.json?.();
                parsed = bodyText;
              } catch {
                try {
                  parsed = (error as any)?.context;
                } catch {}
              }

              if (parsed?.declined) {
                onError("Your card was declined. Please try a different card or contact your bank.");
              } else {
                onError(parsed?.error || "Payment failed. Please try again.");
              }
              setIsProcessing(false);
              resolve();
              return;
            }

            if (data?.declined) {
              onError("Your card was declined. Please try a different card or contact your bank.");
              setIsProcessing(false);
              resolve();
              return;
            }

            if (data?.error) {
              onError(data.error);
              setIsProcessing(false);
              resolve();
              return;
            }

            onSuccess({
              transactionId: data.transactionId || data.transaction_id || "",
              lastFour: result.last4 || "",
            });
          } catch (err: any) {
            onError(err.message || "Payment processing failed. Please try again.");
          } finally {
            setIsProcessing(false);
            resolve();
          }
        });
      });
    }, [allFieldsValid, cardholderName, mode, onSuccess, onError]);

    // Tokenize only — no edge function call
    const getToken = useCallback((): Promise<{ token: string; last4: string; name: string }> => {
      return new Promise((resolve, reject) => {
        if (!checkoutRef.current) {
          reject(new Error("Payment form not ready"));
          return;
        }
        checkoutRef.current.createToken((result: TokenResult) => {
          if (result.error || !result.token) {
            reject(new Error(result.error?.message || "Failed to tokenize card"));
          } else {
            resolve({ token: result.token, last4: result.last4 || "", name: cardholderName.trim() });
          }
        });
      });
    }, [cardholderName]);

    // Expose imperative handle for parent
    useImperativeHandle(ref, () => ({
      submit: handleSubmit,
      isReady: () => canSubmit && sdkReady,
      getToken,
    }), [handleSubmit, canSubmit, sdkReady, getToken]);

    const fieldError = fieldStates["card-number"].error || fieldStates.cvv.error || fieldStates.expiry.error;

    return (
      <div className="space-y-4">
        <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span>Secure payment — card details are encrypted</span>
          </div>

          {/* Cardholder Name */}
          <div className="space-y-1.5">
            <Label htmlFor="wl-cardholder">Name on card</Label>
            <Input
              id="wl-cardholder"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              disabled={isProcessing || disabled}
            />
          </div>

          {/* Card Number */}
          <div className="space-y-1.5">
            <Label>Card number</Label>
            <div className="relative">
              <div
                id="wl-card-number"
                className={cn(
                  "h-10 px-3 py-2 rounded-md border border-input bg-background",
                  fieldStates["card-number"].error && "border-destructive"
                )}
              />
              {brand && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground uppercase">
                  {brand}
                </span>
              )}
            </div>
          </div>

          {/* Expiry + CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Expiry date</Label>
              <div
                id="wl-expiry"
                className={cn(
                  "h-10 px-3 py-2 rounded-md border border-input bg-background",
                  fieldStates.expiry.error && "border-destructive"
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CVV</Label>
              <div
                id="wl-cvv"
                className={cn(
                  "h-10 px-3 py-2 rounded-md border border-input bg-background",
                  fieldStates.cvv.error && "border-destructive"
                )}
              />
            </div>
          </div>

          {fieldError && (
            <p className="text-xs text-destructive">{fieldError}</p>
          )}

          {/* Debit card warning */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Credit cards only.</strong> Debit cards and prepaid cards are not accepted.
            </p>
          </div>
        </div>

        {!sdkReady && (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading secure payment form...
          </div>
        )}

        {inlineError && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{inlineError}</AlertDescription>
          </Alert>
        )}

        {/* Only show internal button in non-headless mode */}
        {!headless && (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || !sdkReady}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                {buttonLabel || `Pay $${amount.toFixed(2)} CAD`}
              </>
            )}
          </Button>
        )}
      </div>
    );
  }
);
