/**
 * AccountCloseoutPanel
 * 
 * Complete account closing workflow for Ops
 * Displays final charges, handles deposit settlement, generates invoice
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Receipt, 
  CreditCard, 
  Shield, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useCloseAccount, useDepositHoldStatus } from "@/hooks/use-deposit-hold";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AccountCloseoutPanelProps {
  bookingId: string;
  onCloseComplete?: () => void;
  className?: string;
}

interface ChargeLineItem {
  description: string;
  amount: number;
  type: "rental" | "addon" | "fee" | "tax" | "late" | "damage";
}

export function AccountCloseoutPanel({ 
  bookingId, 
  onCloseComplete,
  className 
}: AccountCloseoutPanelProps) {
  const [confirmCharges, setConfirmCharges] = useState(false);
  const [confirmInspection, setConfirmInspection] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState(false);

  const closeAccount = useCloseAccount();
  const { data: depositInfo } = useDepositHoldStatus(bookingId);

  // Fetch booking and payment data
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ["closeout-data", bookingId],
    queryFn: async () => {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_add_ons (
            id,
            price,
            quantity,
            add_on:add_ons (name)
          )
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;

      // Get payments
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("status", "completed");

      return { booking, payments: payments || [] };
    },
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Close Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!bookingData) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          Booking not found
        </CardContent>
      </Card>
    );
  }

  const { booking, payments } = bookingData;

  // Check if already closed
  if (booking.account_closed_at) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
            Account Closed
          </CardTitle>
          <CardDescription>
            Closed on {format(new Date(booking.account_closed_at), "MMM d, yyyy 'at' h:mm a")}
          </CardDescription>
        </CardHeader>
        {booking.final_invoice_id && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Invoice: <span className="font-mono">{booking.final_invoice_id}</span>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Calculate charges
  const rentalSubtotal = Number(booking.subtotal) || 0;
  const addonsTotal = (booking.booking_add_ons || []).reduce(
    (sum: number, addon: any) => sum + Number(addon.price) * (addon.quantity || 1),
    0
  );
  const taxAmount = Number(booking.tax_amount) || 0;
  const lateFees = Number(booking.late_return_fee) || 0;

  const lineItems: ChargeLineItem[] = [
    { description: `Rental (${booking.total_days} days @ $${Number(booking.daily_rate).toFixed(2)}/day)`, amount: rentalSubtotal, type: "rental" },
    ...(booking.booking_add_ons || []).map((addon: any) => ({
      description: addon.add_on?.name || "Add-on",
      amount: Number(addon.price) * (addon.quantity || 1),
      type: "addon" as const,
    })),
    { description: "Taxes", amount: taxAmount, type: "tax" },
    ...(lateFees > 0 ? [{ description: "Late Return Fee", amount: lateFees, type: "late" as const }] : []),
  ];

  const totalCharges = rentalSubtotal + addonsTotal + taxAmount + lateFees;
  const paymentsReceived = payments
    .filter((p) => p.payment_type === "rental")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const amountDue = totalCharges - paymentsReceived;

  const depositHeld = depositInfo?.amount || 0;
  const depositStatus = depositInfo?.status || "none";
  const canUseDeposit = depositStatus === "authorized";

  // Settlement calculation
  let depositToCapture = 0;
  let depositToRelease = 0;

  if (canUseDeposit && amountDue > 0) {
    depositToCapture = Math.min(amountDue, depositHeld);
    depositToRelease = depositHeld - depositToCapture;
  } else if (canUseDeposit) {
    depositToRelease = depositHeld;
  }

  const finalAmountDue = Math.max(0, amountDue - depositToCapture);
  const allChecked = confirmCharges && confirmInspection && confirmInvoice;

  const handleCloseAccount = async () => {
    if (!allChecked) return;

    await closeAccount.mutateAsync({ bookingId });
    onCloseComplete?.();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Close Account
            </CardTitle>
            <CardDescription>
              Booking: {booking.booking_code}
            </CardDescription>
          </div>
          <Badge variant="outline">{booking.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Final Charges Summary */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            📋 FINAL CHARGES SUMMARY
          </h4>
          <div className="space-y-1 text-sm">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex justify-between py-1">
                <span className={item.type === "tax" ? "text-muted-foreground" : ""}>
                  {item.description}
                </span>
                <span className="font-mono">${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>TOTAL CHARGES</span>
              <span className="font-mono">${totalCharges.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payments Received */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            PAYMENTS RECEIVED
          </h4>
          <div className="space-y-1 text-sm">
            {payments.filter((p) => p.payment_type === "rental").map((p) => (
              <div key={p.id} className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  {format(new Date(p.created_at), "MMM d")} - Card Payment
                </span>
                <span className="font-mono">${Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
            {paymentsReceived === 0 && (
              <div className="text-muted-foreground py-1">No payments recorded</div>
            )}
          </div>
        </div>

        {/* Security Deposit */}
        <div>
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            SECURITY DEPOSIT
          </h4>
          <div className="rounded-lg border p-3 bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Authorization Hold</span>
              <span className="font-mono">${depositHeld.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(
                depositStatus === "authorized" ? "bg-blue-500/10 text-blue-600" :
                depositStatus === "captured" ? "bg-amber-500/10 text-amber-600" :
                depositStatus === "released" ? "bg-emerald-500/10 text-emerald-600" :
                "bg-muted"
              )}>
                {depositStatus === "authorized" ? "Active" : depositStatus}
              </Badge>
              {depositInfo?.expiresAt && depositStatus === "authorized" && (
                <span className="text-xs text-muted-foreground">
                  Expires: {format(new Date(depositInfo.expiresAt), "MMM d")}
                </span>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Settlement */}
        <div>
          <h4 className="font-medium text-sm mb-3">📊 SETTLEMENT</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Charges</span>
              <span className="font-mono">${totalCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payments Received</span>
              <span className="font-mono">-${paymentsReceived.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Amount Due</span>
              <span className={cn(
                "font-mono",
                amountDue > 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                ${amountDue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Deposit Settlement Preview */}
          {canUseDeposit && (
            <Alert className="mt-3 bg-blue-500/5 border-blue-500/20">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                {depositToCapture > 0 ? (
                  <>
                    <strong>Deposit will cover:</strong> ${depositToCapture.toFixed(2)} (capture from hold)
                    <br />
                    {depositToRelease > 0 && (
                      <><strong>Remaining deposit:</strong> ${depositToRelease.toFixed(2)} (will be released)</>
                    )}
                  </>
                ) : (
                  <>
                    <strong>No amount due:</strong> Full deposit of ${depositHeld.toFixed(2)} will be released
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Confirmation Checkboxes */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="confirm-charges" 
              checked={confirmCharges}
              onCheckedChange={(c) => setConfirmCharges(!!c)}
            />
            <label htmlFor="confirm-charges" className="text-sm cursor-pointer">
              Confirm all charges reviewed
            </label>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="confirm-inspection" 
              checked={confirmInspection}
              onCheckedChange={(c) => setConfirmInspection(!!c)}
            />
            <label htmlFor="confirm-inspection" className="text-sm cursor-pointer">
              Confirm vehicle inspection complete
            </label>
          </div>
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="confirm-invoice" 
              checked={confirmInvoice}
              onCheckedChange={(c) => setConfirmInvoice(!!c)}
            />
            <label htmlFor="confirm-invoice" className="text-sm cursor-pointer">
              Generate final invoice
            </label>
          </div>
        </div>

        {/* Close Account Button */}
        <Button
          className="w-full"
          size="lg"
          disabled={!allChecked || closeAccount.isPending}
          onClick={handleCloseAccount}
        >
          {closeAccount.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              💰 CLOSE ACCOUNT & PROCESS SETTLEMENT
            </>
          )}
        </Button>

        {/* Settlement Preview */}
        {allChecked && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            {depositToCapture > 0 && (
              <div>• Capture ${depositToCapture.toFixed(2)} from deposit hold</div>
            )}
            {depositToRelease > 0 && (
              <div>• Release ${depositToRelease.toFixed(2)} authorization</div>
            )}
            <div>• Generate final invoice</div>
            <div>• Email receipt to customer</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
