import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Terminal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TerminalPaymentFormProps {
  bookingId: string;
  amount: number;
  depositAmount?: number;
  onUpdated: () => void;
}

export function TerminalPaymentForm({ bookingId, amount, depositAmount = 350, onUpdated }: TerminalPaymentFormProps) {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [cardLastFour, setCardLastFour] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [includeDeposit, setIncludeDeposit] = useState(false);
  const [depositReceiptNumber, setDepositReceiptNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [depositIncluded, setDepositIncluded] = useState(false);

  const isValid = /^[A-Za-z0-9\-_]{3,50}$/.test(receiptNumber.trim()) && /^\d{4}$/.test(cardLastFour);

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("log-terminal-payment", {
        body: {
          bookingId,
          receiptNumber: receiptNumber.trim(),
          cardLastFour,
          authCode: authCode.trim() || undefined,
          includeDeposit,
          depositReceiptNumber: includeDeposit ? (depositReceiptNumber.trim() || undefined) : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuccess(true);
      setDepositIncluded(includeDeposit);
      toast.success(includeDeposit ? "Terminal payment & deposit hold logged" : "Terminal payment logged — booking confirmed");
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to log terminal payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 dark:text-emerald-200">
          Terminal payment of <span className="font-mono font-medium">${amount.toFixed(2)}</span> logged successfully.
          {depositIncluded && (
            <> Deposit hold of <span className="font-mono font-medium">${depositAmount.toFixed(2)}</span> also recorded.</>
          )}
          {" "}Booking is now confirmed.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        Log Terminal Payment
      </div>

      <div className="p-2 rounded bg-muted/50 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-mono font-medium">${amount.toFixed(2)}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="receipt-number" className="text-xs">Receipt Number *</Label>
        <Input
          id="receipt-number"
          placeholder="e.g. 45621"
          value={receiptNumber}
          onChange={(e) => setReceiptNumber(e.target.value)}
          maxLength={50}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="card-last-four" className="text-xs">Card Last 4 *</Label>
          <Input
            id="card-last-four"
            placeholder="4242"
            value={cardLastFour}
            onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
            maxLength={4}
            inputMode="numeric"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auth-code" className="text-xs">Auth Code</Label>
          <Input
            id="auth-code"
            placeholder="Optional"
            value={authCode}
            onChange={(e) => setAuthCode(e.target.value)}
            maxLength={20}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Deposit hold checkbox */}
      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          id="include-deposit"
          checked={includeDeposit}
          onCheckedChange={(checked) => setIncludeDeposit(checked === true)}
          disabled={isSubmitting}
        />
        <div className="space-y-0.5">
          <Label htmlFor="include-deposit" className="text-xs font-medium cursor-pointer">
            Deposit hold also taken on terminal
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Record a ${depositAmount.toFixed(2)} security deposit authorization
          </p>
        </div>
      </div>

      {includeDeposit && (
        <div className="space-y-1.5 pl-6">
          <Label htmlFor="deposit-receipt" className="text-xs">Deposit Receipt Number</Label>
          <Input
            id="deposit-receipt"
            placeholder={`Defaults to ${receiptNumber.trim() || "receipt"}-DEP`}
            value={depositReceiptNumber}
            onChange={(e) => setDepositReceiptNumber(e.target.value)}
            maxLength={50}
            disabled={isSubmitting}
          />
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full"
        size="sm"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4 mr-1" />
        )}
        {includeDeposit ? "Log Payment + Deposit Hold" : "Log Payment & Confirm Booking"}
      </Button>
    </div>
  );
}
