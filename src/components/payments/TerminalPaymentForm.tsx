import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Terminal, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TransactionRow {
  amount: string;
  receiptNumber: string;
}

interface TerminalPaymentFormProps {
  bookingId: string;
  amount: number;
  outstandingBalance?: number;
  depositAmount?: number;
  /** Record only a security-deposit hold taken on the terminal (no rental payment). */
  depositOnly?: boolean;
  onUpdated: () => void;
}

export function TerminalPaymentForm({ bookingId, amount, outstandingBalance, depositAmount = 350, depositOnly = false, onUpdated }: TerminalPaymentFormProps) {
  const balance = outstandingBalance ?? amount;
  const [transactions, setTransactions] = useState<TransactionRow[]>([
    { amount: balance.toFixed(2), receiptNumber: "" },
  ]);
  const [cardLastFour, setCardLastFour] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [includeDeposit, setIncludeDeposit] = useState(depositOnly);
  const [depositReceiptNumber, setDepositReceiptNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTxns, setSuccessTxns] = useState<{ receiptNumber: string; amount: number }[] | null>(null);
  const [depositIncluded, setDepositIncluded] = useState(false);

  const updateRow = (index: number, field: keyof TransactionRow, value: string) => {
    setTransactions(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    const usedAmount = transactions.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const remaining = Math.max(0, balance - usedAmount);
    setTransactions(prev => [...prev, { amount: remaining.toFixed(2), receiptNumber: "" }]);
  };

  const removeRow = (index: number) => {
    if (transactions.length <= 1) return;
    setTransactions(prev => prev.filter((_, i) => i !== index));
  };

  // Validation
  const totalAmount = transactions.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const allRowsValid = transactions.every(r => {
    const amt = parseFloat(r.amount);
    return amt > 0 && /^[A-Za-z0-9\-_]{3,50}$/.test(r.receiptNumber.trim());
  });
  const cardValid = /^\d{4}$/.test(cardLastFour);
  const totalValid = totalAmount > 0 && totalAmount <= balance + 0.01; // small float tolerance
  const depositReceiptValid = /^[A-Za-z0-9\-_]{3,50}$/.test(depositReceiptNumber.trim());
  const isValid = depositOnly
    ? cardValid && depositReceiptValid
    : allRowsValid && cardValid && totalValid;


  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("log-terminal-payment", {
        body: {
          bookingId,
          depositOnly,
          transactions: depositOnly
            ? []
            : transactions.map(r => ({
                receiptNumber: r.receiptNumber.trim(),
                amount: parseFloat(r.amount),
              })),
          cardLastFour,
          authCode: authCode.trim() || undefined,
          includeDeposit: depositOnly ? true : includeDeposit,
          depositReceiptNumber:
            depositOnly || includeDeposit ? (depositReceiptNumber.trim() || undefined) : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccessTxns(
        depositOnly
          ? []
          : transactions.map(r => ({
              receiptNumber: r.receiptNumber.trim(),
              amount: parseFloat(r.amount),
            }))
      );
      setDepositIncluded(depositOnly || includeDeposit);
      toast.success(
        depositOnly
          ? "Deposit hold recorded"
          : transactions.length === 1
            ? "Terminal payment logged — booking confirmed"
            : `${transactions.length} terminal payments logged`
      );
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to log terminal payment");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (successTxns) {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 dark:text-emerald-200">
          <p className="font-medium mb-1">
            {successTxns.length === 0
              ? "Deposit hold recorded."
              : successTxns.length === 1
                ? `Terminal payment of $${successTxns[0].amount.toFixed(2)} logged.`
                : `${successTxns.length} terminal payments logged:`}
          </p>
          {successTxns.length > 1 && (
            <ul className="text-sm space-y-0.5 ml-1">
              {successTxns.map((t, i) => (
                <li key={i}>
                  <span className="font-mono">${t.amount.toFixed(2)}</span>
                  {" — RRN: "}
                  <span className="font-mono">{t.receiptNumber}</span>
                </li>
              ))}
            </ul>
          )}
          {depositIncluded && (
            <p className="text-sm mt-1">
              Deposit hold of <span className="font-mono font-medium">${depositAmount.toFixed(2)}</span>
              {successTxns.length === 0 ? " recorded." : " also recorded."}
            </p>
          )}

        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        {depositOnly ? "Log Terminal Deposit Hold" : "Log Terminal Payment"}
      </div>

      <div className="p-2 rounded bg-muted/50 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{depositOnly ? "Deposit Amount" : "Outstanding Balance"}</span>
        <span className="font-mono font-medium">${(depositOnly ? depositAmount : balance).toFixed(2)}</span>
      </div>


      {/* Transaction rows */}
      {!depositOnly && (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Transactions</Label>

        {transactions.map((row, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              {index === 0 && <Label className="text-[11px]">Amount *</Label>}
              <Input
                placeholder="250.00"
                value={row.amount}
                onChange={(e) => updateRow(index, "amount", e.target.value)}
                inputMode="decimal"
                disabled={isSubmitting}
                className="font-mono"
              />
            </div>
            <div className="flex-[1.5] space-y-1">
              {index === 0 && <Label className="text-[11px]">RRN / Receipt # *</Label>}
              <Input
                placeholder="e.g. 45621"
                value={row.receiptNumber}
                onChange={(e) => updateRow(index, "receiptNumber", e.target.value)}
                maxLength={50}
                disabled={isSubmitting}
              />
            </div>
            {transactions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(index)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={isSubmitting}
          className="w-full text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Transaction
        </Button>
      </div>

      {/* Running total */}
      {transactions.length > 1 && (
        <div className="p-2 rounded bg-muted/50 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total ({transactions.length} transactions)</span>
          <span className={`font-mono font-medium ${totalAmount > balance + 0.01 ? "text-destructive" : ""}`}>
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      )}

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
            placeholder={`Defaults to ${transactions[0]?.receiptNumber.trim() || "receipt"}-DEP`}
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
        {transactions.length === 1
          ? (includeDeposit ? "Log Payment + Deposit Hold" : "Log Payment & Confirm Booking")
          : `Log ${transactions.length} Payments`}
      </Button>
    </div>
  );
}
