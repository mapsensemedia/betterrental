/**
 * TransactionHistoryCard
 * 
 * Displays complete transaction history for a booking
 * Shows all Stripe IDs with copy functionality
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CreditCard, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Shield, 
  Check, 
  Copy,
  Clock,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TransactionHistoryCardProps {
  bookingId: string;
  className?: string;
}

interface Transaction {
  id: string;
  type: "payment" | "deposit_auth" | "deposit_capture" | "deposit_release" | "refund";
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  timestamp: string;
  stripeId: string | null;
  chargeId?: string | null;
  description: string;
  cardLast4?: string | null;
}

function CopyableStripeId({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncated = value.length > 16 
    ? `${value.slice(0, 7)}...${value.slice(-6)}` 
    : value;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors"
          >
            {label && <span className="text-muted-foreground">{label}:</span>}
            {truncated}
            {copied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : value}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const TRANSACTION_ICONS: Record<Transaction["type"], typeof CreditCard> = {
  payment: ArrowDownCircle,
  deposit_auth: Shield,
  deposit_capture: CreditCard,
  deposit_release: ArrowUpCircle,
  refund: ArrowUpCircle,
};

const TRANSACTION_COLORS: Record<Transaction["type"], string> = {
  payment: "text-emerald-600",
  deposit_auth: "text-blue-600",
  deposit_capture: "text-amber-600",
  deposit_release: "text-emerald-600",
  refund: "text-purple-600",
};

const STATUS_BADGES: Record<Transaction["status"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600" },
  completed: { label: "Succeeded", className: "bg-emerald-500/10 text-emerald-600" },
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", className: "bg-purple-500/10 text-purple-600" },
};

export function TransactionHistoryCard({ bookingId, className }: TransactionHistoryCardProps) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transaction-history", bookingId],
    queryFn: async (): Promise<Transaction[]> => {
      // Get payments
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      // Get deposit ledger entries
      const { data: ledgerEntries } = await supabase
        .from("deposit_ledger")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      // Get booking for deposit info
      const { data: booking } = await supabase
        .from("bookings")
        .select(`
          deposit_status,
          stripe_deposit_pi_id,
          stripe_deposit_charge_id,
          deposit_authorized_at,
          deposit_captured_at,
          deposit_released_at,
          deposit_amount,
          card_last_four
        `)
        .eq("id", bookingId)
        .single();

      const txns: Transaction[] = [];

      // Add payment transactions
      (payments || []).forEach((p) => {
        if (p.payment_type === "rental" || p.payment_type === "additional") {
          txns.push({
            id: p.id,
            type: "payment",
            amount: Number(p.amount),
            status: p.status as Transaction["status"],
            timestamp: p.created_at,
            stripeId: p.transaction_id,
            description: p.payment_type === "rental" ? "Initial Payment" : "Additional Payment",
          });
        } else if (p.payment_type === "refund") {
          txns.push({
            id: p.id,
            type: "refund",
            amount: Math.abs(Number(p.amount)),
            status: "completed",
            timestamp: p.created_at,
            stripeId: p.transaction_id,
            description: "Refund",
          });
        }
      });

      // Add deposit authorization if exists
      if (booking?.deposit_authorized_at && booking?.stripe_deposit_pi_id) {
        txns.push({
          id: `dep-auth-${bookingId}`,
          type: "deposit_auth",
          amount: Number(booking.deposit_amount) || 0,
          status: "completed",
          timestamp: booking.deposit_authorized_at,
          stripeId: booking.stripe_deposit_pi_id,
          description: "Deposit Authorization",
          cardLast4: booking.card_last_four,
        });
      }

      // Add deposit capture if exists
      const captureEntry = (ledgerEntries || []).find(
        (e) => e.action === "capture" || e.action === "partial_capture"
      );
      if (captureEntry) {
        txns.push({
          id: captureEntry.id,
          type: "deposit_capture",
          amount: Number(captureEntry.amount),
          status: "completed",
          timestamp: captureEntry.created_at,
          stripeId: captureEntry.stripe_pi_id,
          chargeId: captureEntry.stripe_charge_id,
          description: captureEntry.action === "partial_capture" 
            ? "Deposit Partial Capture" 
            : "Deposit Capture",
        });
      }

      // Add deposit release if exists
      const releaseEntry = (ledgerEntries || []).find(
        (e) => e.action === "stripe_release" || e.action === "release"
      );
      if (releaseEntry) {
        txns.push({
          id: releaseEntry.id,
          type: "deposit_release",
          amount: Number(releaseEntry.amount),
          status: "completed",
          timestamp: releaseEntry.created_at,
          stripeId: releaseEntry.stripe_pi_id,
          description: "Deposit Authorization Released",
        });
      }

      // Sort by timestamp
      return txns.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    enabled: !!bookingId,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!transactions?.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.map((txn) => {
          const Icon = TRANSACTION_ICONS[txn.type];
          const color = TRANSACTION_COLORS[txn.type];
          const statusBadge = STATUS_BADGES[txn.status];

          return (
            <div 
              key={txn.id}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", color)} />
                  <div>
                    <div className="font-medium text-sm">{txn.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(txn.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-mono font-medium",
                    txn.type === "refund" || txn.type === "deposit_release" 
                      ? "text-emerald-600" 
                      : ""
                  )}>
                    {txn.type === "deposit_auth" ? "(hold) " : ""}
                    {txn.type === "refund" ? "-" : ""}
                    ${txn.amount.toFixed(2)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs mt-1", statusBadge.className)}
                  >
                    {txn.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : txn.status === "failed" ? (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    ) : null}
                    {statusBadge.label}
                  </Badge>
                </div>
              </div>

              {/* Stripe IDs */}
              {(txn.stripeId || txn.chargeId) && (
                <div className="flex flex-wrap gap-2">
                  {txn.stripeId && (
                    <CopyableStripeId 
                      value={txn.stripeId} 
                      label={txn.stripeId.startsWith("pi_") ? "PI" : "ID"} 
                    />
                  )}
                  {txn.chargeId && (
                    <CopyableStripeId value={txn.chargeId} label="Charge" />
                  )}
                </div>
              )}

              {txn.cardLast4 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  •••• {txn.cardLast4}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
