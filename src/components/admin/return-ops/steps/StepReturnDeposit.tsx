import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaymentDepositStatus } from "@/hooks/use-payment-deposit";
import { useReleaseDepositHold } from "@/hooks/use-deposit-hold";
import { useAddDepositLedgerEntry, useDepositLedger } from "@/hooks/use-deposit-ledger";
import { useGenerateReturnReceipt } from "@/hooks/use-return-receipt";
import { useCreateAuditLog } from "@/hooks/use-audit-logs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Wallet, 
  CheckCircle2,
  DollarSign,
  ArrowDownCircle,
  Loader2,
  MinusCircle,
  AlertTriangle,
  Lock,
  CreditCard,
  RefreshCw,
  FileWarning,
} from "lucide-react";

// Withhold reason categories
const WITHHOLD_CATEGORIES = [
  { value: "damage_repair", label: "Damage Repair" },
  { value: "fuel_refill", label: "Fuel Refill" },
  { value: "late_return", label: "Late Return Fee" },
  { value: "cleaning_fee", label: "Cleaning Fee" },
  { value: "traffic_violation", label: "Traffic Violation" },
  { value: "other", label: "Other" },
];

const MIN_REASON_LENGTH = 20;

interface StepReturnDepositProps {
  bookingId: string;
  booking: any;
  completion: {
    processed: boolean;
  };
  totalDamageCost?: number;
  isLocked?: boolean;
  onComplete?: () => void;
}

export function StepReturnDeposit({ 
  bookingId, 
  booking, 
  completion,
  totalDamageCost = 0,
  isLocked,
  onComplete,
}: StepReturnDepositProps) {
  const queryClient = useQueryClient();
  const { data: depositData, isLoading, refetch } = usePaymentDepositStatus(bookingId);
  const { data: ledgerData } = useDepositLedger(bookingId);
  const releaseDeposit = useReleaseDepositHold();
  const addLedgerEntry = useAddDepositLedgerEntry();
  const generateReceipt = useGenerateReturnReceipt();
  const createAuditLog = useCreateAuditLog();
  
  const [releaseReason, setReleaseReason] = useState("Vehicle returned in good condition - no damages");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefundingStripe, setIsRefundingStripe] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [withholdCategory, setWithholdCategory] = useState<string>("");
  const [withholdReason, setWithholdReason] = useState("");
  const [receiptGenerated, setReceiptGenerated] = useState(false);
  const [stripeRefundComplete, setStripeRefundComplete] = useState(false);

  // Fetch linked damages
  const { data: damages = [] } = useQuery({
    queryKey: ["booking-damages", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("damage_reports")
        .select("id, severity, estimated_cost, description")
        .eq("booking_id", bookingId)
        .neq("status", "closed");
      return data || [];
    },
  });

  const depositAmount = booking.deposit_amount || 0;
  const hasDeposit = depositAmount > 0;
  const depositHeld = depositData?.depositHeld || 0;
  const depositStatus = depositData?.depositStatus || "none";

  const ledgerHasEntries = (ledgerData?.entries?.length ?? 0) > 0;

  const isReleased =
    depositStatus === "released" ||
    ledgerData?.status === "released" ||
    ledgerData?.status === "deducted";

  const isHeld = depositStatus === "held" || (depositHeld > 0 && depositStatus !== "released");
  const remainingDeposit = ledgerHasEntries ? (ledgerData?.remaining ?? 0) : depositHeld;

  // Auto-populate withhold amount and category from damage costs
  useEffect(() => {
    if (totalDamageCost > 0 && !partialAmount && damages.length > 0) {
      const suggestedAmount = Math.min(totalDamageCost, remainingDeposit);
      setPartialAmount(suggestedAmount.toFixed(2));
      setWithholdCategory("damage_repair");
      setWithholdReason(`Damage repair costs for ${damages.length} reported issue${damages.length > 1 ? 's' : ''}`);
    }
  }, [totalDamageCost, remainingDeposit, partialAmount, damages]);

  // Validate withhold reason
  const withholdReasonValid = withholdCategory && withholdReason.trim().length >= MIN_REASON_LENGTH;
  const withholdReasonError = withholdReason.trim().length > 0 && withholdReason.trim().length < MIN_REASON_LENGTH
    ? `Reason must be at least ${MIN_REASON_LENGTH} characters (${withholdReason.trim().length}/${MIN_REASON_LENGTH})`
    : null;

  // Send consolidated notification (receipt includes deposit info)
  const sendConsolidatedNotification = async (
    action: "released" | "withheld",
    amount: number,
    reason?: string
  ) => {
    // Receipt email already includes deposit status - no separate notification needed
    // The generate-return-receipt function sends a consolidated email
  };

  const handleReleaseFullDeposit = async () => {
    if (!hasDeposit || remainingDeposit <= 0 || isLocked) return;
    
    setIsProcessing(true);
    try {
      // 1. Add ledger entry
      await addLedgerEntry.mutateAsync({
        bookingId,
        action: "release",
        amount: remainingDeposit,
        reason: releaseReason,
      });

      // 2. Release deposit via Stripe
      await releaseDeposit.mutateAsync({
        bookingId,
        reason: releaseReason,
        bypassStatusCheck: true,
      });

      // 3. Log audit event
      await createAuditLog.mutateAsync({
        action: "return_deposit_processed",
        entityType: "booking",
        entityId: bookingId,
        newData: { action: "release_full", amount: remainingDeposit, reason: releaseReason },
      });

      // 4. Generate receipt (includes deposit status) - this sends consolidated email
      await generateReceipt.mutateAsync({
        bookingId,
        depositReleased: remainingDeposit,
        depositWithheld: 0,
      });
      setReceiptGenerated(true);
      
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger", bookingId] });
      toast.success("Full deposit released and receipt emailed to customer");
      
      onComplete?.();
    } catch (error) {
      console.error("Error releasing deposit:", error);
      toast.error("Failed to release deposit");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithholdPartial = async () => {
    if (!hasDeposit || !partialAmount || !withholdReasonValid || isLocked) return;
    
    const amountToWithhold = parseFloat(partialAmount);
    if (isNaN(amountToWithhold) || amountToWithhold <= 0 || amountToWithhold > remainingDeposit) {
      toast.error("Invalid withhold amount");
      return;
    }
    
    setIsProcessing(true);
    try {
      const fullReason = `[${WITHHOLD_CATEGORIES.find(c => c.value === withholdCategory)?.label}] ${withholdReason}`;
      
      // 1. Add deduction ledger entry with category
      await addLedgerEntry.mutateAsync({
        bookingId,
        action: "deduct",
        amount: amountToWithhold,
        reason: fullReason,
      });

      // Update ledger entry with category
      const { data: latestEntry } = await supabase
        .from("deposit_ledger")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("action", "deduct")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestEntry) {
        await supabase
          .from("deposit_ledger")
          .update({ category: withholdCategory })
          .eq("id", latestEntry.id);
      }

      const remainingToRelease = remainingDeposit - amountToWithhold;
      
      if (remainingToRelease > 0) {
        await addLedgerEntry.mutateAsync({
          bookingId,
          action: "release",
          amount: remainingToRelease,
          reason: `Partial release after withholding $${amountToWithhold.toFixed(2)} for: ${fullReason}`,
        });
      }

      // 2. Release remaining deposit via Stripe
      await releaseDeposit.mutateAsync({
        bookingId,
        reason: `Withheld: $${amountToWithhold.toFixed(2)} for ${fullReason}. Released: $${remainingToRelease.toFixed(2)}`,
        bypassStatusCheck: true,
      });

      // 3. Log audit event
      await createAuditLog.mutateAsync({
        action: "return_deposit_processed",
        entityType: "booking",
        entityId: bookingId,
        newData: { 
          action: "withhold_partial", 
          withheld: amountToWithhold, 
          released: remainingToRelease,
          category: withholdCategory,
          reason: withholdReason,
        },
      });

      // 4. Generate receipt (includes deposit status) - consolidated email
      await generateReceipt.mutateAsync({
        bookingId,
        depositReleased: remainingToRelease,
        depositWithheld: amountToWithhold,
        withholdReason: fullReason,
      });
      setReceiptGenerated(true);

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger", bookingId] });
      toast.success(`Withheld $${amountToWithhold.toFixed(2)}, released $${remainingToRelease.toFixed(2)} - receipt emailed to customer`);
      setPartialAmount("");
      setWithholdReason("");
      setWithholdCategory("");
      
      onComplete?.();
    } catch (error) {
      console.error("Error processing deposit:", error);
      toast.error("Failed to process deposit");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeRefund = async () => {
    if (!hasDeposit || isLocked) return;
    
    setIsRefundingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-deposit-refund", {
        body: {
          bookingId,
          amount: remainingDeposit,
          reason: releaseReason || "Deposit refund - rental completed",
        },
      });

      if (error) throw new Error(error.message || "Failed to process Stripe refund");
      if (data?.error) throw new Error(data.error);

      setStripeRefundComplete(true);
      
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["deposit-ledger", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["payment-deposit-status", bookingId] });
      
      // Generate receipt
      await generateReceipt.mutateAsync({
        bookingId,
        depositReleased: data.amount,
        depositWithheld: 0,
      });
      setReceiptGenerated(true);
      
      toast.success(`Stripe refund of $${data.amount.toFixed(2)} processed - receipt emailed to customer`);
      
      onComplete?.();
    } catch (error) {
      console.error("Error processing Stripe refund:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process Stripe refund");
    } finally {
      setIsRefundingStripe(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Locked Warning */}
      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete the return closeout step to unlock deposit processing.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className={
        isReleased 
          ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
          : !hasDeposit
            ? "border-muted"
            : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            isReleased ? "text-emerald-600" : !hasDeposit ? "text-muted-foreground" : "text-amber-600"
          }`}>
            {isReleased ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Deposit processed</span>
              </>
            ) : !hasDeposit ? (
              <>
                <Wallet className="h-5 w-5" />
                <span className="font-medium">No deposit to process</span>
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                <span className="font-medium">Deposit awaiting release</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deposit Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Deposit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="text-2xl font-bold">
                ${depositAmount.toFixed(2)}
              </p>
            </div>
            <Badge 
              variant={isReleased ? "default" : isHeld ? "secondary" : "outline"}
              className={isReleased ? "bg-emerald-500" : ""}
            >
              {isReleased ? "Released" : isHeld ? "Held" : "No Deposit"}
            </Badge>
          </div>

          {/* Damage Cost Warning */}
          {totalDamageCost > 0 && !isReleased && (
            <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    Damages Detected
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Total damage estimate: <strong>${totalDamageCost.toFixed(2)}</strong>
                  </p>
                  {damages.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {damages.map(d => (
                        <p key={d.id} className="text-xs text-amber-600">
                          • {d.severity}: {d.description?.slice(0, 50)}... (${d.estimated_cost || 0})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Release Options */}
          {hasDeposit && isHeld && !isReleased && remainingDeposit > 0 && !isLocked && (
            <>
              {/* Full Release Option */}
              <div className="space-y-3 p-4 rounded-lg border bg-card">
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                  Release Full Deposit
                </h4>
                <div className="space-y-2">
                  <Label>Release Reason</Label>
                  <Textarea
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                    placeholder="Enter reason for deposit release..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleReleaseFullDeposit}
                  disabled={isProcessing || !releaseReason.trim()}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Release Full Deposit (${remainingDeposit.toFixed(2)})
                    </>
                  )}
                </Button>
              </div>

              {/* Partial Withhold Option */}
              <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <h4 className="font-medium flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-destructive" />
                  Withhold Partial Deposit
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>Category <span className="text-destructive">*</span></Label>
                    <Select value={withholdCategory} onValueChange={setWithholdCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason category" />
                      </SelectTrigger>
                      <SelectContent>
                        {WITHHOLD_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount to Withhold ($)</Label>
                    <Input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="0.00"
                      max={remainingDeposit}
                      min={0}
                      step="0.01"
                    />
                    {totalDamageCost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Suggested: ${Math.min(totalDamageCost, remainingDeposit).toFixed(2)} (based on damage estimate)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Detailed Reason <span className="text-destructive">*</span>
                      <span className="text-muted-foreground text-xs ml-1">(min {MIN_REASON_LENGTH} chars)</span>
                    </Label>
                    <Textarea
                      value={withholdReason}
                      onChange={(e) => setWithholdReason(e.target.value)}
                      placeholder="Provide detailed explanation for withholding (minimum 20 characters for dispute protection)..."
                      rows={3}
                      className={withholdReasonError ? "border-destructive" : ""}
                    />
                    {withholdReasonError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <FileWarning className="h-3 w-3" />
                        {withholdReasonError}
                      </p>
                    )}
                  </div>

                  {/* Linked damages display */}
                  {withholdCategory === "damage_repair" && damages.length > 0 && (
                    <div className="p-3 rounded bg-muted/50">
                      <p className="text-xs font-medium mb-2">Linked Damage Reports:</p>
                      {damages.map(d => (
                        <Badge key={d.id} variant="outline" className="mr-1 mb-1 text-xs">
                          {d.severity} - ${d.estimated_cost || 0}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  onClick={handleWithholdPartial}
                  disabled={isProcessing || !partialAmount || !withholdReasonValid}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-4 w-4 mr-2" />
                      Withhold & Release Remainder
                    </>
                  )}
                </Button>
                
                {partialAmount && parseFloat(partialAmount) > 0 && parseFloat(partialAmount) <= remainingDeposit && (
                  <p className="text-xs text-center text-muted-foreground">
                    Customer will be refunded: ${(remainingDeposit - parseFloat(partialAmount)).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Stripe Refund Option */}
              <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Refund via Payment Gateway
                </h4>
                <p className="text-sm text-muted-foreground">
                  Process deposit refund directly to customer's original payment method via Stripe.
                </p>
                <div className="space-y-2">
                  <Label>Refund Reason</Label>
                  <Textarea
                    value={releaseReason}
                    onChange={(e) => setReleaseReason(e.target.value)}
                    placeholder="Enter reason for refund..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleStripeRefund}
                  disabled={isRefundingStripe || isProcessing || !releaseReason.trim() || stripeRefundComplete}
                  className="w-full"
                  variant="outline"
                >
                  {isRefundingStripe ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Refund...
                    </>
                  ) : stripeRefundComplete ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Refund Completed
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refund ${remainingDeposit.toFixed(2)} via Stripe
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Refund will be credited to customer's card within 5-10 business days
                </p>
              </div>
            </>
          )}

          {isReleased && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                Deposit Successfully Processed
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                Receipt emailed to customer
              </p>
              {ledgerData && (
                <div className="mt-3 text-xs text-emerald-600 space-y-1">
                  {ledgerData.deducted > 0 && (
                    <p>Withheld: ${ledgerData.deducted.toFixed(2)}</p>
                  )}
                  {ledgerData.released > 0 && (
                    <p>Released: ${ledgerData.released.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {!hasDeposit && (
            <div className="py-6 text-center text-muted-foreground">
              <p className="text-sm">This booking has no security deposit</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
