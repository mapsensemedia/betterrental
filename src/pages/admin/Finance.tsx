import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Download,
  FileText,
  DollarSign,
  Calendar,
  User,
  Loader2,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  CreditCard,
  Banknote,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { generateReceiptPdf } from "@/lib/pdf/receipt-pdf";
import { generateInvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";
import { buildInvoicePdfData } from "@/lib/pdf/invoice-data-builder";
import { FinancialBreakdown } from "@/components/admin/ops/FinancialBreakdown";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

type DateRange = "today" | "yesterday" | "week" | "month" | "last30" | "all" | "custom";

interface OverviewPaymentRecord {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  status: string;
  transaction_id: string | null;
  created_at: string;
  booking_code?: string;
  customer_name?: string;
  unreconciled?: boolean;
}

interface DailyAggregate {
  date: string;
  collected: number;
  pending: number;
  failed: number;
  count: number;
  successRate: number;
}

interface ReceiptData {
  id: string;
  receipt_number: string;
  booking_id: string;
  status: "draft" | "issued" | "voided";
  line_items_json: any[];
  totals_json: { subtotal: number; tax: number; total: number };
  currency: string;
  notes: string | null;
  issued_at: string | null;
  created_at: string;
  booking?: {
    booking_code: string;
    total_amount: number;
    daily_rate: number;
    total_days: number;
    start_at: string;
    end_at: string;
    deposit_amount: number | null;
    profile?: { full_name: string | null; email: string | null };
    vehicleName?: string;
    addOns?: { name: string; price: number }[];
  };
}

interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: string;
  payment_method: string | null;
  status: string;
  transaction_id: string | null;
  created_at: string;
  source: "worldline" | "manual";
  booking?: {
    booking_code: string;
    profile?: { full_name: string | null };
  };
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  booking_id: string;
  status: string | null;
  issued_at: string | null;
  created_at: string | null;
  grand_total: number;
  rental_subtotal: number;
  addons_total: number | null;
  fees_total: number | null;
  taxes_total: number;
  late_fees: number | null;
  damage_charges: number | null;
  payments_received: number | null;
  amount_due: number | null;
  deposit_held: number | null;
  deposit_released: number | null;
  deposit_captured: number | null;
  line_items_json: any;
  notes: string | null;
  booking?: {
    booking_code: string;
    start_at: string;
    end_at: string;
    total_days: number;
    profile?: { full_name: string | null; email: string | null };
    vehicleName?: string;
  };
}

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case "month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "last30":
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "all":
      return { start: new Date("2024-01-01T00:00:00"), end: endOfDay(now) };
    case "custom":
      return { start: startOfMonth(now), end: endOfDay(now) };
  }
}

function normalizeMethod(method: string | null): string {
  if (!method) return "Unknown";
  const lower = method.toLowerCase();
  if (lower.includes("bambora") || lower === "worldline" || lower === "online") return "Online (Bambora)";
  if (lower.includes("terminal") || lower === "card_terminal") return "Terminal";
  if (lower.includes("check")) return "Check";
  if (lower.includes("cash")) return "Cash";
  if (lower.includes("card")) return "Card";
  return method;
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export default function Finance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topTab = searchParams.get("tab") || "overview";
  const [methodFilter, setMethodFilter] = useState<string | null>(searchParams.get("method") || null);

  const setTopTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  const handleMethodClick = (method: string) => {
    setMethodFilter(method);
    setTopTab("transactions");
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue metrics, invoices, receipts, and transaction records
            </p>
          </div>
        </div>

        <Tabs value={topTab} onValueChange={setTopTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab onMethodClick={handleMethodClick} />
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <TransactionsTab methodFilter={methodFilter} onClearMethodFilter={() => setMethodFilter(null)} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

// ═══════════════════════════════════════════════════
// Tab 1 — Overview (formerly PaymentDashboard)
// ═══════════════════════════════════════════════════

function OverviewTab({ onMethodClick }: { onMethodClick?: (method: string) => void }) {
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customStart, setCustomStart] = useState<Date>(startOfMonth(new Date()));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  const { start, end } = useMemo(() =>
    dateRange === "custom"
      ? { start: startOfDay(customStart), end: endOfDay(customEnd) }
      : getDateRange(dateRange),
    [dateRange, customStart, customEnd]
  );

  // Source A — payments table (primary, renders immediately)
  const { data: paymentsOnly = [], isLoading, refetch } = useQuery({
    queryKey: ["payment-dashboard", dateRange],
    queryFn: async () => {
      const { data: paymentRows, error } = await supabase
        .from("payments")
        .select("id, booking_id, amount, payment_type, payment_method, status, transaction_id, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!paymentRows?.length) return [];

      const bookingIds = [...new Set(paymentRows.map((p) => p.booking_id))];
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, booking_code, user_id, customer_id, status")
        .in("id", bookingIds);

      const userIds = [...new Set((bookings || []).map((b) => b.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      // Fetch customers
      const customerIds = [...new Set((bookings || []).map((b) => b.customer_id).filter(Boolean))] as string[];
      const { data: customersData } = customerIds.length > 0
        ? await supabase.from("customers").select("id, full_name").in("id", customerIds)
        : { data: [] };
      const customersMap = new Map((customersData || []).map((c) => [c.id, c.full_name || "Unknown"]));

      const bookingMap = new Map((bookings || []).map((b) => [b.id, b]));
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));

      return paymentRows.map((p): OverviewPaymentRecord => {
        const booking = bookingMap.get(p.booking_id);
        const custName = booking?.customer_id ? customersMap.get(booking.customer_id) : null;
        return {
          ...p,
          amount: Number(p.amount),
          booking_code: booking?.booking_code || "—",
          customer_name: custName || (booking ? profileMap.get(booking.user_id) || "Unknown" : "Unknown"),
        };
      });
    },
  });

  // Source C — Unrecorded revenue: confirmed/active/completed bookings with no payment record and no WL transaction
  const { data: unrecordedBookings = [] } = useQuery({
    queryKey: ["payment-dashboard-unrecorded", dateRange],
    queryFn: async () => {
      // Get all bookings in the date range that are confirmed/active/completed
      const { data: allBookings, error: bErr } = await supabase
        .from("bookings")
        .select("id, booking_code, total_amount, user_id, customer_id, start_at, status, wl_transaction_id")
        .in("status", ["confirmed", "active", "completed"])
        .gte("start_at", start.toISOString())
        .lte("start_at", end.toISOString())
        .lte("start_at", new Date().toISOString());
      if (bErr) throw bErr;
      if (!allBookings?.length) return [];

      // Filter to bookings with no WL transaction
      const noWl = allBookings.filter((b) => !b.wl_transaction_id);
      if (!noWl.length) return [];

      // Check which of these have completed payments
      const ids = noWl.map((b) => b.id);
      const { data: paidRows } = await supabase
        .from("payments")
        .select("booking_id")
        .in("booking_id", ids)
        .eq("status", "completed");
      const paidSet = new Set((paidRows || []).map((p) => p.booking_id));

      const unrecorded = noWl.filter((b) => !paidSet.has(b.id));
      if (!unrecorded.length) return [];

      // Resolve names
      const userIds = [...new Set(unrecorded.map((b) => b.user_id))];
      const customerIds = [...new Set(unrecorded.map((b) => b.customer_id).filter(Boolean))] as string[];
      const [{ data: profiles }, { data: customers }] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] as any[] },
        customerIds.length ? supabase.from("customers").select("id, full_name").in("id", customerIds) : { data: [] as any[] },
      ]);
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || "Unknown"]));
      const customerMap = new Map((customers || []).map((c: any) => [c.id, c.full_name || "Unknown"]));

      return unrecorded.map((b) => ({
        id: b.id,
        booking_code: b.booking_code,
        total_amount: Number(b.total_amount),
        customer_name: (b.customer_id ? customerMap.get(b.customer_id) : null) || profileMap.get(b.user_id) || "Unknown",
        start_at: b.start_at,
      }));
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const unrecordedTotal = useMemo(() => unrecordedBookings.reduce((s, b) => s + b.total_amount, 0), [unrecordedBookings]);

  // Source B — Worldline bookings not yet in payments (async supplement, never blocks)
  const { data: wlSupplement = [] } = useQuery({
    queryKey: ["payment-dashboard-wl", dateRange],
    queryFn: async () => {
      // 1. Fetch all payments in range with type info for dedup
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("booking_id, transaction_id, payment_type")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      const paidRentalBookingIds = new Set(
        (existingPayments || [])
          .filter((p) => ["rental", "PAC", "P"].includes(p.payment_type))
          .map((p) => p.booking_id)
      );
      const paidDepositBookingIds = new Set(
        (existingPayments || [])
          .filter((p) => p.payment_type === "deposit")
          .map((p) => p.booking_id)
      );
      const paidRentalTxnIds = new Set(
        (existingPayments || [])
          .filter((p) => p.transaction_id && ["rental", "PAC", "P"].includes(p.payment_type))
          .map((p) => p.transaction_id)
      );
      const paidDepositTxnIds = new Set(
        (existingPayments || [])
          .filter((p) => p.transaction_id && p.payment_type === "deposit")
          .map((p) => p.transaction_id)
      );

      // 2. Fetch Worldline rental bookings in date range
      const { data: wlRentals } = await supabase
        .from("bookings")
        .select("id, booking_code, total_amount, wl_transaction_id, wl_auth_status, card_type, created_at, start_at, user_id, customer_id")
        .not("wl_transaction_id", "is", null)
        .or(`created_at.gte.${start.toISOString()},start_at.gte.${start.toISOString()}`)
        .or(`created_at.lte.${end.toISOString()},start_at.lte.${end.toISOString()}`)
        .order("created_at", { ascending: false });

      // 3. Fetch Worldline deposit bookings in date range
      const { data: wlDeposits } = await supabase
        .from("bookings")
        .select("id, booking_code, deposit_amount, wl_deposit_transaction_id, wl_deposit_auth_status, deposit_status, deposit_authorized_at, card_type, created_at, start_at, user_id, customer_id")
        .not("wl_deposit_transaction_id", "is", null)
        .or(`created_at.gte.${start.toISOString()},start_at.gte.${start.toISOString()}`)
        .or(`created_at.lte.${end.toISOString()},start_at.lte.${end.toISOString()}`)
        .order("created_at", { ascending: false });

      // Filter: use type-specific dedup to prevent PA txn IDs from blocking deposit entries
      const rentalEntries = (wlRentals || []).filter(
        (b) => !paidRentalBookingIds.has(b.id) && !paidRentalTxnIds.has(b.wl_transaction_id!)
      );
      const depositEntries = (wlDeposits || []).filter(
        (b) => !paidDepositBookingIds.has(b.id) && !paidDepositTxnIds.has(b.wl_deposit_transaction_id!)
      );

      // Resolve profiles
      const allUserIds = [...new Set([
        ...rentalEntries.map((b) => b.user_id),
        ...depositEntries.map((b) => b.user_id),
      ])];
      const { data: profiles } = allUserIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", allUserIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));

      // Resolve customers
      const wlCustomerIds = [...new Set([
        ...rentalEntries.map((b) => b.customer_id),
        ...depositEntries.map((b) => b.customer_id),
      ].filter(Boolean))] as string[];
      const { data: wlCustomersData } = wlCustomerIds.length > 0
        ? await supabase.from("customers").select("id, full_name").in("id", wlCustomerIds)
        : { data: [] };
      const wlCustomersMap = new Map((wlCustomersData || []).map((c) => [c.id, c.full_name || "Unknown"]));

      const resolveName = (userId: string, customerId: string | null) => {
        if (customerId) {
          const n = wlCustomersMap.get(customerId);
          if (n) return n;
        }
        return profileMap.get(userId) || "Unknown";
      };

      const records: OverviewPaymentRecord[] = [];

      // Rental entries
      for (const b of rentalEntries) {
        const effectiveDate = b.start_at || b.created_at;
        const d = new Date(effectiveDate);
        if (d < start || d > end) continue;
        records.push({
          id: `wl-ov-rental-${b.id}`,
          booking_id: b.id,
          amount: Number(b.total_amount),
          payment_type: "rental",
          payment_method: b.card_type ? `card (${b.card_type})` : "Online (Bambora)",
          status: b.wl_auth_status === "completed" ? "completed" : b.wl_auth_status || "pending",
          transaction_id: b.wl_transaction_id,
          created_at: effectiveDate,
          booking_code: b.booking_code,
          customer_name: resolveName(b.user_id, b.customer_id),
          unreconciled: true,
        });
      }

      // Deposit entries
      for (const b of depositEntries) {
        const effectiveDate = b.deposit_authorized_at || b.start_at || b.created_at;
        const d = new Date(effectiveDate);
        if (d < start || d > end) continue;
        records.push({
          id: `wl-ov-deposit-${b.id}`,
          booking_id: b.id,
          amount: Number(b.deposit_amount || 0),
          payment_type: "deposit",
          payment_method: b.card_type ? `card (${b.card_type})` : "Online (Bambora)",
          status: b.deposit_status === "captured" ? "completed" : b.wl_deposit_auth_status === "authorized" ? "authorized" : b.deposit_status || "pending",
          transaction_id: b.wl_deposit_transaction_id,
          created_at: effectiveDate,
          booking_code: b.booking_code,
          customer_name: resolveName(b.user_id, b.customer_id),
          unreconciled: true,
        });
      }

      return records;
    },
    // Never block the primary render; silently fail
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Merge both sources — deduplicate by booking_id+payment_type
  const payments = useMemo(() => {
    if (!wlSupplement.length) return paymentsOnly;
    const existingKeys = new Set(paymentsOnly.map((p) => `${p.booking_id}::${p.payment_type}`));
    const unique = wlSupplement.filter((w) => !existingKeys.has(`${w.booking_id}::${w.payment_type}`));
    const merged = [...paymentsOnly, ...unique];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged;
  }, [paymentsOnly, wlSupplement]);

  const { data: prevPayments = [] } = useQuery({
    queryKey: ["payment-dashboard-prev", dateRange],
    queryFn: async () => {
      const duration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - duration);
      const prevEnd = new Date(end.getTime() - duration);
      const { data } = await supabase
        .from("payments")
        .select("amount, status")
        .gte("created_at", prevStart.toISOString())
        .lte("created_at", prevEnd.toISOString());
      return (data || []).map((p) => ({ amount: Number(p.amount), status: p.status }));
    },
  });

  const unreconciledCount = useMemo(() => payments.filter((p) => p.unreconciled).length, [payments]);

  const metrics = useMemo(() => {
    const seen = new Set<string>();
    let collected = 0;
    let completedCount = 0;
    for (const p of payments) {
      if (p.status === "completed") {
        const dedupeKey = p.transaction_id || p.id;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          collected += p.amount;
          completedCount++;
        }
      }
    }
    // Add unrecorded revenue (confirmed bookings with no payment records)
    collected += unrecordedTotal;
    const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);
    const total = payments.length;
    const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const prevCollected = prevPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const changePercent = prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : 0;
    return { collected, pending, failed, total, completedCount, successRate, changePercent, pendingCount: payments.filter((p) => p.status === "pending").length, failedCount: payments.filter((p) => p.status === "failed").length };
  }, [payments, prevPayments, unrecordedTotal]);

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    payments.filter((p) => p.status === "completed").forEach((p) => {
      const method = normalizeMethod(p.payment_method);
      const entry = map.get(method) || { count: 0, total: 0 };
      entry.count++;
      entry.total += p.amount;
      map.set(method, entry);
    });
    return Array.from(map.entries())
      .map(([method, data]) => ({ method, ...data, percent: metrics.collected > 0 ? Math.round((data.total / metrics.collected) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [payments, metrics.collected]);

  const typeBreakdown = useMemo(() => {
    const seenRental = new Set<string>();
    const seenDeposit = new Set<string>();
    const seenOther = new Set<string>();
    let rental = 0;
    let deposit = 0;
    let other = 0;
    for (const p of payments) {
      if (p.status !== "completed") continue;
      const key = p.transaction_id || p.id;
      if (p.payment_type === "rental" || p.payment_type === "P" || p.payment_type === "PAC") {
        if (!seenRental.has(key)) { seenRental.add(key); rental += p.amount; }
      } else if (p.payment_type === "deposit") {
        if (!seenDeposit.has(key)) { seenDeposit.add(key); deposit += p.amount; }
      } else {
        if (!seenOther.has(key)) { seenOther.add(key); other += p.amount; }
      }
    }
    return { rental, deposit, other };
  }, [payments]);

  const dailyTrend = useMemo(() => {
    const days: DailyAggregate[] = [];
    for (let i = 0; i < 7; i++) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayPayments = payments.filter((p) => {
        const d = new Date(p.created_at);
        return d >= dayStart && d <= dayEnd;
      });
      const collected = dayPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
      const pending = dayPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
      const failed = dayPayments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);
      const completedCount = dayPayments.filter((p) => p.status === "completed").length;
      const successRate = dayPayments.length > 0 ? Math.round((completedCount / dayPayments.length) * 100) : 0;
      days.push({ date: format(day, "MMM d"), collected, pending, failed, count: dayPayments.length, successRate });
    }
    return days;
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        {dateRange === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              className="h-9 w-[140px]"
              value={format(customStart, "yyyy-MM-dd")}
              onChange={(e) => e.target.value && setCustomStart(new Date(e.target.value + "T00:00:00"))}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-9 w-[140px]"
              value={format(customEnd, "yyyy-MM-dd")}
              onChange={(e) => e.target.value && setCustomEnd(new Date(e.target.value + "T00:00:00"))}
            />
          </div>
        )}
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        {unreconciledCount > 0 && (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
            +{unreconciledCount} unreconciled
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              title="Collected Revenue"
              value={`$${metrics.collected.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`}
              subtitle={metrics.changePercent !== 0 ? `${metrics.changePercent > 0 ? "↑" : "↓"} ${Math.abs(metrics.changePercent)}% vs prev period` : undefined}
              icon={DollarSign}
              positive
              changePercent={metrics.changePercent}
            />
            <SummaryCard
              title="Pending"
              value={`$${metrics.pending.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`}
              subtitle={`${metrics.pendingCount} transaction${metrics.pendingCount !== 1 ? "s" : ""}`}
              icon={Clock}
            />
            <SummaryCard
              title="Failed"
              value={`$${metrics.failed.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`}
              subtitle={`${metrics.failedCount} issue${metrics.failedCount !== 1 ? "s" : ""}`}
              icon={AlertTriangle}
              negative={metrics.failedCount > 0}
            />
            <SummaryCard
              title="Success Rate"
              value={`${metrics.successRate}%`}
              subtitle={`${metrics.completedCount} of ${metrics.total} payments`}
              icon={CheckCircle2}
              positive={metrics.successRate >= 95}
              negative={metrics.successRate < 90}
            />
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Revenue Breakdown</h3>
                <div className="space-y-2">
                  <BreakdownRow label="Rental Payments" amount={typeBreakdown.rental} total={metrics.collected} />
                  <BreakdownRow label="Deposit Payments" amount={typeBreakdown.deposit} total={metrics.collected} />
                  {unrecordedTotal > 0 && <BreakdownRow label="Unrecorded Revenue" amount={unrecordedTotal} total={metrics.collected} />}
                  {typeBreakdown.other > 0 && <BreakdownRow label="Other" amount={typeBreakdown.other} total={metrics.collected} />}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Payment Method</h3>
                {methodBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed payments</p>
                ) : (
                  <div className="space-y-2">
                    {methodBreakdown.map((m) => (
                      <button
                        key={m.method}
                        className="w-full text-left hover:bg-muted/50 rounded-lg transition-colors p-1 -m-1"
                        onClick={() => onMethodClick?.(m.method)}
                      >
                        <BreakdownRow label={m.method} amount={m.total} total={metrics.collected} count={m.count} />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Unrecorded Revenue Warning */}
          {unrecordedBookings.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-700">
                    {unrecordedBookings.length} Booking{unrecordedBookings.length !== 1 ? "s" : ""} Without Payment Records
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  These confirmed bookings have no logged payment. Use "Log Terminal Payment" on each booking to record the transaction.
                </p>
                <div className="space-y-1.5">
                  {unrecordedBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">{b.booking_code}</Badge>
                        <span className="text-muted-foreground">{b.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${b.total_amount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                          <a href={`/admin/ops/${b.id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total Unrecorded</span>
                  <span>${unrecordedTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Status */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Payment Status</h3>
              <div className="grid grid-cols-3 gap-3">
                <StatusCard label="Completed" amount={metrics.collected} count={metrics.completedCount} variant="success" />
                <StatusCard label="Pending" amount={metrics.pending} count={metrics.pendingCount} variant="warning" />
                <StatusCard label="Failed" amount={metrics.failed} count={metrics.failedCount} variant="destructive" />
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          {dateRange !== "today" && dateRange !== "yesterday" && (
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold">Daily Trend (Last 7 Days)</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Day</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Failed</TableHead>
                        <TableHead className="text-right">Txns</TableHead>
                        <TableHead className="text-right">Success</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyTrend.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium text-sm">{day.date}</TableCell>
                          <TableCell className="text-right text-sm font-medium">${day.collected.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">${day.pending.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">
                            {day.failed > 0 ? <span className="text-destructive">${day.failed.toFixed(2)}</span> : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">{day.count}</TableCell>
                          <TableCell className="text-right text-sm">
                            <Badge variant="outline" className={cn("text-xs", day.successRate >= 95 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : day.successRate < 80 ? "bg-destructive/10 text-destructive border-destructive/20" : "")}>
                              {day.count > 0 ? `${day.successRate}%` : "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold">Recent Transactions ({payments.length})</h3>
              </div>
              {payments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No payments found for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Booking</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 50).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <a href={`/admin/bookings/${p.booking_id}`} className="font-mono text-sm text-primary hover:underline">
                              {p.booking_code}
                            </a>
                          </TableCell>
                          <TableCell className="text-sm">{p.customer_name}</TableCell>
                          <TableCell className="text-sm font-medium">${p.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground capitalize">
                            <span className="flex items-center gap-1.5">
                              {p.payment_type}
                              {p.unreconciled && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                  Unreconciled
                                </Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{normalizeMethod(p.payment_method)}</TableCell>
                          <TableCell>
                            <PaymentStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Tab 2 — Transactions (formerly Billing)
// ═══════════════════════════════════════════════════

function TransactionsTab({ methodFilter, onClearMethodFilter }: { methodFilter?: string | null; onClearMethodFilter?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Read URL params for deep-linking from other pages
  const urlStatus = searchParams.get("status");
  const urlBooking = searchParams.get("booking");
  const urlAdjustment = searchParams.get("adjustment");
  const urlAmount = searchParams.get("amount");
  
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus === "failed" ? "failed" : "all");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [activeTab, setActiveTab] = useState<"invoices" | "receipts" | "payments" | "deposits">(
    methodFilter ? "payments" : urlStatus === "failed" || urlAdjustment === "damage" ? "payments" : "invoices"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Damage charge banner from Damages page
  const showDamageBanner = urlAdjustment === "damage" && urlBooking;

  // Fetch full booking data for invoice detail dialog
  const selectedInvoiceBookingId = selectedInvoice?.booking_id;
  const { data: invoiceBookingData } = useQuery({
    queryKey: ["invoice-booking-detail", selectedInvoiceBookingId],
    enabled: !!selectedInvoiceBookingId,
    queryFn: async () => {
      const { data: booking } = await supabase
        .from("bookings")
        .select(`*, booking_add_ons(id, price, quantity, add_ons(name, daily_rate, one_time_fee)), booking_additional_drivers(id, driver_name, driver_age_band, young_driver_fee)`)
        .eq("id", selectedInvoiceBookingId!)
        .single();
      if (!booking) return null;
      let vehicleCat = "";
      if (booking.vehicle_id) {
        const { data: cat } = await supabase.from("vehicle_categories").select("name").eq("id", booking.vehicle_id).maybeSingle();
        vehicleCat = cat?.name || "";
      }
      return { ...booking, vehicles: { category: vehicleCat } };
    },
  });

  // ==================== INVOICES ====================
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_invoices")
        .select(`*, booking:bookings(booking_code, start_at, end_at, total_days, user_id, customer_id, vehicle_id)`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.map(i => (i.booking as any)?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const invCustIds = [...new Set(data.map(i => (i.booking as any)?.customer_id).filter(Boolean))];
      const { data: invCusts } = invCustIds.length > 0
        ? await supabase.from("customers").select("id, full_name, email").in("id", invCustIds)
        : { data: [] };
      const invCustsMap = new Map((invCusts || []).map(c => [c.id, c]) || []);

      const categoryIds = [...new Set(data.map(i => (i.booking as any)?.vehicle_id).filter(Boolean))];
      const { data: categories } = await supabase.from("vehicle_categories").select("id, name").in("id", categoryIds);
      const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

      return data.map(inv => {
        const b = inv.booking as any;
        const cust = b?.customer_id ? invCustsMap.get(b.customer_id) : null;
        return {
          ...inv,
          line_items_json: inv.line_items_json as any,
          booking: b ? {
            booking_code: b.booking_code, start_at: b.start_at, end_at: b.end_at, total_days: b.total_days,
            profile: cust ? { id: b.customer_id, full_name: cust.full_name, email: cust.email } : profileMap.get(b.user_id) || null,
            vehicleName: categoryMap.get(b.vehicle_id)?.name || null,
          } : null,
        };
      }) as InvoiceRow[];
    },
  });

  // ==================== RECEIPTS ====================
  const { data: receipts = [], isLoading: receiptsLoading } = useQuery({
    queryKey: ["admin-receipts", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("receipts")
        .select(`*, booking:bookings(booking_code, total_amount, daily_rate, total_days, start_at, end_at, deposit_amount, user_id, customer_id, vehicle_id)`)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "draft" | "issued" | "voided");
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set(data.map(r => (r.booking as any)?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const rCustIds = [...new Set(data.map(r => (r.booking as any)?.customer_id).filter(Boolean))];
      const { data: rCusts } = rCustIds.length > 0
        ? await supabase.from("customers").select("id, full_name, email").in("id", rCustIds)
        : { data: [] };
      const rCustsMap = new Map((rCusts || []).map(c => [c.id, c]) || []);

      const categoryIds = [...new Set(data.map(r => (r.booking as any)?.vehicle_id).filter(Boolean))];
      const { data: categories } = await supabase.from("vehicle_categories").select("id, name").in("id", categoryIds);
      const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

      const bookingIds = data.map(r => r.booking_id).filter(Boolean);
      const { data: bookingAddOns } = bookingIds.length > 0
        ? await supabase.from("booking_add_ons").select("booking_id, price, add_on:add_ons(name)").in("booking_id", bookingIds)
        : { data: [] };

      const addOnsMap = new Map<string, { name: string; price: number }[]>();
      (bookingAddOns || []).forEach((ba: any) => {
        const list = addOnsMap.get(ba.booking_id) || [];
        list.push({ name: ba.add_on?.name || "Add-on", price: ba.price });
        addOnsMap.set(ba.booking_id, list);
      });

      return data.map(receipt => {
        const b = receipt.booking as any;
        const cust = b?.customer_id ? rCustsMap.get(b.customer_id) : null;
        return {
          ...receipt,
          totals_json: receipt.totals_json as { subtotal: number; tax: number; total: number },
          line_items_json: receipt.line_items_json as any[],
          booking: b ? {
            booking_code: b.booking_code, total_amount: b.total_amount, daily_rate: b.daily_rate,
            total_days: b.total_days, start_at: b.start_at, end_at: b.end_at, deposit_amount: b.deposit_amount,
            profile: cust ? { id: b.customer_id, full_name: cust.full_name, email: cust.email } : profileMap.get(b.user_id) || null,
            vehicleName: categoryMap.get(b.vehicle_id)?.name || null,
            addOns: addOnsMap.get(receipt.booking_id) || [],
          } : null,
        };
      }) as ReceiptData[];
    },
  });

  // ==================== PAYMENTS (combined) ====================
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      // Fetch all payments (no limit cap — paginate if needed later)
      const { data: manualPayments, error: pErr } = await supabase
        .from("payments")
        .select(`*, booking:bookings(booking_code, user_id)`)
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const { data: wlBookings, error: wlErr } = await supabase
        .from("bookings")
        .select("id, booking_code, total_amount, wl_transaction_id, wl_auth_status, card_type, card_last_four, status, created_at, user_id, customer_id")
        .not("wl_transaction_id", "is", null)
        .order("created_at", { ascending: false });
      if (wlErr) throw wlErr;

      const { data: wlDepositBookings, error: wlDErr } = await supabase
        .from("bookings")
        .select("id, booking_code, deposit_amount, wl_deposit_transaction_id, wl_deposit_auth_status, card_type, card_last_four, deposit_status, deposit_authorized_at, created_at, user_id, customer_id")
        .not("wl_deposit_transaction_id", "is", null)
        .order("created_at", { ascending: false });
      if (wlDErr) throw wlDErr;

      const allUserIds = [
        ...manualPayments.map(p => p.booking?.user_id),
        ...wlBookings.map(b => b.user_id),
        ...(wlDepositBookings || []).map(b => b.user_id),
      ].filter(Boolean) as string[];
      const uniqueUserIds = [...new Set(allUserIds)];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", uniqueUserIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch customers
      const combCustIds = [
        ...(wlBookings || []).map(b => b.customer_id),
        ...(wlDepositBookings || []).map(b => b.customer_id),
      ].filter(Boolean) as string[];
      const uniqCustIds = [...new Set(combCustIds)];
      const { data: combCusts } = uniqCustIds.length > 0
        ? await supabase.from("customers").select("id, full_name").in("id", uniqCustIds)
        : { data: [] };
      const combCustsMap = new Map((combCusts || []).map(c => [c.id, c]) || []);

      const resolveProf = (userId: string, customerId: string | null) => {
        if (customerId) {
          const c = combCustsMap.get(customerId);
          if (c) return { id: customerId, full_name: c.full_name };
        }
        return profileMap.get(userId) || null;
      };

      const existingRentalTxnIds = new Set(manualPayments.filter(p => p.transaction_id && ["rental", "PAC", "P"].includes(p.payment_type)).map(p => p.transaction_id));
      const existingDepositTxnIds = new Set(manualPayments.filter(p => p.transaction_id && p.payment_type === "deposit").map(p => p.transaction_id));
      // Also track booking_ids that already have a manual rental/PAC payment to prevent WL duplication
      const manualRentalBookingIds = new Set(
        manualPayments
          .filter(p => ["rental", "PAC", "P"].includes(p.payment_type))
          .map(p => p.booking_id)
      );
      const manualDepositBookingIds = new Set(
        manualPayments
          .filter(p => p.payment_type === "deposit")
          .map(p => p.booking_id)
      );

      const manual: Payment[] = manualPayments.map(payment => ({
        ...payment,
        source: "manual" as const,
        booking: payment.booking ? { ...payment.booking, profile: profileMap.get(payment.booking.user_id) || null } : null,
      }));

      const wlRental: Payment[] = (wlBookings || [])
        .filter(b => !existingRentalTxnIds.has(b.wl_transaction_id!) && !manualRentalBookingIds.has(b.id))
        .map(b => ({
          id: `wl-rental-${b.id}`,
          booking_id: b.id,
          amount: Number(b.total_amount),
          payment_type: "rental",
          payment_method: b.card_type ? `card (${b.card_type})` : "card",
          status: b.wl_auth_status === "completed" ? "completed" : b.wl_auth_status || "pending",
          transaction_id: b.wl_transaction_id,
          created_at: b.created_at,
          source: "worldline" as const,
          booking: { booking_code: b.booking_code, profile: resolveProf(b.user_id, b.customer_id) },
        }));

      const wlDeposit: Payment[] = (wlDepositBookings || [])
        .filter(b => !existingDepositTxnIds.has(b.wl_deposit_transaction_id!) && !manualDepositBookingIds.has(b.id))
        .map(b => ({
          id: `wl-deposit-${b.id}`,
          booking_id: b.id,
          amount: Number(b.deposit_amount || 0),
          payment_type: "deposit",
          payment_method: b.card_type ? `card (${b.card_type})` : "card",
          status: b.deposit_status === "captured" ? "completed" : b.wl_deposit_auth_status === "authorized" ? "authorized" : b.deposit_status || "pending",
          transaction_id: b.wl_deposit_transaction_id,
          created_at: b.deposit_authorized_at || b.created_at,
          source: "worldline" as const,
          booking: { booking_code: b.booking_code, profile: resolveProf(b.user_id, b.customer_id) },
        }));

      const combined = [...manual, ...wlRental, ...wlDeposit];
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return combined;
    },
  });

  const issueReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      const { error } = await supabase
        .from("receipts")
        .update({ status: "issued", issued_at: new Date().toISOString() })
        .eq("id", receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
      toast({ title: "Receipt issued" });
      setSelectedReceipt(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to issue receipt", description: error.message, variant: "destructive" });
    },
  });

  // ==================== FILTERING ====================
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return inv.invoice_number?.toLowerCase().includes(s) || inv.booking?.booking_code?.toLowerCase().includes(s) || inv.booking?.profile?.full_name?.toLowerCase().includes(s);
  });

  const filteredReceipts = receipts.filter((receipt) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return receipt.receipt_number?.toLowerCase().includes(s) || receipt.booking?.booking_code?.toLowerCase().includes(s) || receipt.booking?.profile?.full_name?.toLowerCase().includes(s);
  });

  const filteredPayments = payments.filter((payment) => {
    // Method filter from Overview click-through
    if (methodFilter && normalizeMethod(payment.payment_method) !== methodFilter) return false;
    // Type filter
    if (typeFilter !== "all") {
      const pt = payment.payment_type?.toLowerCase();
      if (typeFilter === "rental" && !["rental", "pac", "p"].includes(pt)) return false;
      if (typeFilter === "deposit" && pt !== "deposit") return false;
      if (typeFilter === "extension" && pt !== "extension") return false;
      if (typeFilter === "damage" && pt !== "damage") return false;
      if (typeFilter === "refund" && pt !== "refund") return false;
    }
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return payment.booking?.booking_code?.toLowerCase().includes(s) || payment.booking?.profile?.full_name?.toLowerCase().includes(s) || payment.transaction_id?.toLowerCase().includes(s);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline">Draft</Badge>;
      case "issued": case "paid": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Issued</Badge>;
      case "voided": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Voided</Badge>;
      case "completed": return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case "failed": return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      case "authorized": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Authorized</Badge>;
      case "released": return <Badge className="bg-muted text-muted-foreground">Released</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalRevenue = (() => {
    const seen = new Set<string>();
    let total = 0;
    for (const p of payments) {
      if (p.status !== "completed") continue;
      const dedupeKey = p.transaction_id || p.id;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      total += Number(p.amount);
    }
    return total;
  })();
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);
  const depositPayments = payments.filter(p => p.payment_type === "deposit");
  const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const worldlineCount = payments.filter(p => p.source === "worldline").length;
  const manualCount = payments.filter(p => p.source === "manual").length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    setIsRefreshing(false);
    toast({ title: "Data refreshed" });
  };

  const handleDownloadInvoicePdf = async (inv: InvoiceRow) => {
    try {
      const pdfData = await buildInvoicePdfData(inv.booking_id, {
        invoice_number: inv.invoice_number, status: inv.status, issued_at: inv.issued_at,
        grand_total: Number(inv.grand_total), rental_subtotal: Number(inv.rental_subtotal),
        taxes_total: Number(inv.taxes_total), late_fees: Number(inv.late_fees || 0),
        damage_charges: Number(inv.damage_charges || 0), payments_received: Number(inv.payments_received || 0),
        amount_due: Number(inv.amount_due || 0), deposit_held: Number(inv.deposit_held || 0),
        deposit_released: Number(inv.deposit_released || 0), deposit_captured: Number(inv.deposit_captured || 0),
        notes: inv.notes,
      });
      await generateInvoicePdf(pdfData);
    } catch (error) {
      console.error("Invoice PDF generation failed:", error);
    }
  };

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deposits Held</p>
                <p className="text-2xl font-bold">${totalDeposits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs + refresh */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <div className="flex items-center justify-between">
            <TabsList className="justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="invoices" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="receipts" className="gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Receipts
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Payments ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="deposits" className="gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                Deposits
              </TabsTrigger>
            </TabsList>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="ml-2">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          </div>

          {/* Damage charge banner from Damages page */}
          {showDamageBanner && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 mt-4">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm">
                <span className="font-medium">Damage charge pending:</span>{" "}
                {urlAmount ? `$${urlAmount}` : "Amount TBD"} for booking{" "}
                <span className="font-mono text-xs">{urlBooking}</span>.
                Add as manual payment or adjustment.
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === "invoices" ? "Search invoices..." : activeTab === "receipts" ? "Search receipts..." : "Search payments..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeTab === "receipts" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
            )}
            {activeTab === "payments" && (
              <div className="flex items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="extension">Extension</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                  </SelectContent>
                </Select>
                {methodFilter && (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      Method: {methodFilter}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearMethodFilter}>
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==================== INVOICES TAB ==================== */}
          <TabsContent value="invoices">
            {invoicesLoading ? (
              <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No invoices found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Grand Total</TableHead>
                      <TableHead>Amount Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/30">
                        <TableCell><Badge variant="outline" className="font-mono">{inv.invoice_number}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {inv.booking?.profile?.full_name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => navigate(`/admin/bookings/${inv.booking_id}/ops`)}>
                                {inv.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">${Number(inv.grand_total).toFixed(2)}</TableCell>
                        <TableCell className={Number(inv.amount_due) > 0 ? "text-destructive font-medium" : ""}>${Number(inv.amount_due || 0).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(inv.status || "draft")}</TableCell>
                        <TableCell>{inv.created_at ? format(new Date(inv.created_at), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}>
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View invoice details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoicePdf(inv)}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download PDF</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ==================== RECEIPTS TAB ==================== */}
          <TabsContent value="receipts">
            {receiptsLoading ? (
              <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredReceipts.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No receipts found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="hover:bg-muted/30">
                        <TableCell><Badge variant="outline" className="font-mono">{receipt.receipt_number}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {receipt.booking?.profile?.full_name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => navigate(`/admin/bookings/${receipt.booking_id}/ops`)}>
                                {receipt.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">${receipt.totals_json?.total?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell>{format(new Date(receipt.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedReceipt(receipt)}>
                                <Eye className="w-4 h-4 mr-2" /> View
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View receipt details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ==================== PAYMENTS TAB ==================== */}
          <TabsContent value="payments">
            {paymentsLoading ? (
              <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30">
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{payment.transaction_id?.slice(0, 12) || "—"}</code>
                        </TableCell>
                        <TableCell>{payment.booking?.profile?.full_name || "Unknown"}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => navigate(`/admin/bookings/${payment.booking_id}/ops`)}>
                                {payment.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{payment.payment_type}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={payment.source === "worldline" ? "default" : "outline"} className="text-xs">
                            {payment.source === "worldline" ? "Bambora" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_method || "—"}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>{format(new Date(payment.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ==================== DEPOSITS TAB ==================== */}
          <TabsContent value="deposits">
            {paymentsLoading ? (
              <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : depositPayments.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-2xl">
                <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No deposit records found</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="link" className="p-0 h-auto font-mono text-xs" onClick={() => navigate(`/admin/bookings/${payment.booking_id}/ops`)}>
                                {payment.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{payment.booking?.profile?.full_name || "Unknown"}</TableCell>
                        <TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method || "—"}</TableCell>
                        <TableCell>{format(new Date(payment.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => navigate(`/admin/returns/${payment.booking_id}`)}>
                                <Clock className="w-4 h-4 mr-1" /> Process Return
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Go to return processing</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== INVOICE DETAIL DIALOG ==================== */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Invoice Details
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-mono font-bold text-lg">{selectedInvoice.invoice_number}</p>
                </div>
                {getStatusBadge(selectedInvoice.status || "draft")}
              </div>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedInvoice.booking?.profile?.full_name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{selectedInvoice.booking?.profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking</p>
                  <Badge variant="outline" className="font-mono">{selectedInvoice.booking?.booking_code}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{selectedInvoice.booking?.vehicleName || "N/A"}</p>
                </div>
              </div>
              {selectedInvoice.booking?.start_at && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div><span className="text-muted-foreground">Pickup: </span><span className="font-medium">{format(new Date(selectedInvoice.booking.start_at), "MMM d, yyyy")}</span></div>
                  <div><span className="text-muted-foreground">Return: </span><span className="font-medium">{format(new Date(selectedInvoice.booking.end_at), "MMM d, yyyy")}</span></div>
                  <div><span className="text-muted-foreground">Duration: </span><span className="font-medium">{selectedInvoice.booking.total_days} day{selectedInvoice.booking.total_days !== 1 ? "s" : ""}</span></div>
                </div>
              )}
              <Separator />
              {invoiceBookingData ? (
                <div>
                  <p className="text-sm font-medium mb-2">Financial Breakdown</p>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <FinancialBreakdown booking={invoiceBookingData} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">Loading breakdown...</div>
              )}
              <div className="p-4 bg-muted rounded-xl space-y-2">
                {Number(selectedInvoice.late_fees) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Late Fees</span><span>${Number(selectedInvoice.late_fees).toFixed(2)}</span></div>
                )}
                {Number(selectedInvoice.damage_charges) > 0 && (
                  <div className="flex justify-between text-sm text-destructive"><span>Damage Charges</span><span>${Number(selectedInvoice.damage_charges).toFixed(2)}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span>${Number(selectedInvoice.grand_total).toFixed(2)}</span></div>
                {Number(selectedInvoice.payments_received) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Payments Received</span><span>${Number(selectedInvoice.payments_received).toFixed(2)}</span></div>
                )}
                {Number(selectedInvoice.amount_due) > 0 && (
                  <div className="flex justify-between font-semibold text-destructive"><span>Amount Due</span><span>${Number(selectedInvoice.amount_due).toFixed(2)}</span></div>
                )}
              </div>
              {selectedInvoice.notes && (
                <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground mb-1">Notes</p><p>{selectedInvoice.notes}</p></div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => handleDownloadInvoicePdf(selectedInvoice)}>
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== RECEIPT DETAIL DIALOG ==================== */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" /> Receipt Details
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt Number</p>
                  <p className="font-mono font-bold text-lg">{selectedReceipt.receipt_number}</p>
                </div>
                {getStatusBadge(selectedReceipt.status)}
              </div>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedReceipt.booking?.profile?.full_name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{selectedReceipt.booking?.profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking</p>
                  <Badge variant="outline" className="font-mono">{selectedReceipt.booking?.booking_code}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{selectedReceipt.booking?.vehicleName || "N/A"}</p>
                </div>
              </div>
              {selectedReceipt.booking?.start_at && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div><span className="text-muted-foreground">Pickup: </span><span className="font-medium">{format(new Date(selectedReceipt.booking.start_at), "MMM d, yyyy")}</span></div>
                  <div><span className="text-muted-foreground">Return: </span><span className="font-medium">{format(new Date(selectedReceipt.booking.end_at), "MMM d, yyyy")}</span></div>
                  <div><span className="text-muted-foreground">Duration: </span><span className="font-medium">{selectedReceipt.booking.total_days} day{selectedReceipt.booking.total_days !== 1 ? "s" : ""}</span></div>
                </div>
              )}
              <Separator />
              {selectedReceipt.line_items_json && selectedReceipt.line_items_json.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Line Items</p>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-center">Qty</TableHead>
                          <TableHead className="text-xs text-right">Unit Price</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReceipt.line_items_json.map((item: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                            <TableCell className="text-sm text-right">${item.unitPrice?.toFixed(2)}</TableCell>
                            <TableCell className="text-sm text-right font-medium">${item.total?.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div className="p-4 bg-muted rounded-xl space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${selectedReceipt.totals_json?.subtotal?.toFixed(2) || "0.00"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${selectedReceipt.totals_json?.tax?.toFixed(2) || "0.00"}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${selectedReceipt.totals_json?.total?.toFixed(2) || "0.00"}</span></div>
                {selectedReceipt.booking?.deposit_amount && selectedReceipt.booking.deposit_amount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground pt-1"><span>Security Deposit</span><span>${selectedReceipt.booking.deposit_amount.toFixed(2)}</span></div>
                )}
              </div>
              {selectedReceipt.notes && (
                <div className="p-4 bg-muted/50 rounded-xl"><p className="text-sm text-muted-foreground mb-1">Notes</p><p>{selectedReceipt.notes}</p></div>
              )}
              <DialogFooter className="flex gap-2">
                {selectedReceipt.status === "draft" && (
                  <Button onClick={() => issueReceiptMutation.mutate(selectedReceipt.id)} disabled={issueReceiptMutation.isPending}>
                    {issueReceiptMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Issue Receipt
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    generateReceiptPdf({
                      receiptNumber: selectedReceipt.receipt_number,
                      status: selectedReceipt.status,
                      issuedAt: selectedReceipt.issued_at,
                      createdAt: selectedReceipt.created_at,
                      customerName: selectedReceipt.booking?.profile?.full_name || "N/A",
                      customerEmail: selectedReceipt.booking?.profile?.email || "",
                      bookingCode: selectedReceipt.booking?.booking_code || "",
                      vehicleName: selectedReceipt.booking?.vehicleName || "N/A",
                      startDate: selectedReceipt.booking?.start_at || "",
                      endDate: selectedReceipt.booking?.end_at || "",
                      totalDays: selectedReceipt.booking?.total_days || 0,
                      dailyRate: selectedReceipt.booking?.daily_rate || 0,
                      lineItems: selectedReceipt.line_items_json || [],
                      subtotal: selectedReceipt.totals_json?.subtotal || 0,
                      tax: selectedReceipt.totals_json?.tax || 0,
                      total: selectedReceipt.totals_json?.total || 0,
                      depositAmount: selectedReceipt.booking?.deposit_amount || null,
                      differentDropoffFee: Number((selectedReceipt.booking as any)?.different_dropoff_fee || 0),
                      notes: selectedReceipt.notes,
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Shared Helper Components
// ═══════════════════════════════════════════════════

function SummaryCard({ title, value, subtitle, icon: Icon, positive, negative, changePercent }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType;
  positive?: boolean; negative?: boolean; changePercent?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <Icon className={cn("w-4 h-4", negative ? "text-destructive" : positive ? "text-emerald-600" : "text-muted-foreground")} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className={cn("text-xs mt-1", changePercent && changePercent > 0 ? "text-emerald-600" : changePercent && changePercent < 0 ? "text-destructive" : "text-muted-foreground")}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, amount, total, count }: { label: string; amount: number; total: number; count?: number }) {
  const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}{count !== undefined ? ` (${count})` : ""}</span>
        <span className="font-medium">${amount.toLocaleString("en-CA", { minimumFractionDigits: 2 })} <span className="text-muted-foreground text-xs">{percent}%</span></span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatusCard({ label, amount, count, variant }: { label: string; amount: number; count: number; variant: "success" | "warning" | "destructive" }) {
  const colors = { success: "bg-emerald-500/10 border-emerald-500/20", warning: "bg-yellow-500/10 border-yellow-500/20", destructive: "bg-destructive/10 border-destructive/20" };
  const textColors = { success: "text-emerald-600", warning: "text-yellow-600", destructive: "text-destructive" };
  return (
    <div className={cn("rounded-lg border p-3", colors[variant])}>
      <p className={cn("text-lg font-bold", textColors[variant])}>${amount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</p>
      <p className="text-xs text-muted-foreground">{label} · {count} txn{count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed": return <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Paid</Badge>;
    case "pending": return <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">⏳ Pending</Badge>;
    case "failed": return <Badge variant="destructive" className="text-xs">✗ Failed</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
