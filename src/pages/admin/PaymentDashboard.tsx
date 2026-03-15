import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DateRange = "today" | "yesterday" | "week" | "month" | "last30";

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
  }
}

interface PaymentRecord {
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
}

interface DailyAggregate {
  date: string;
  collected: number;
  pending: number;
  failed: number;
  count: number;
  successRate: number;
}

export default function PaymentDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("today");

  const { start, end } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data: payments = [], isLoading, refetch } = useQuery({
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

      // Fetch booking codes and customer names
      const bookingIds = [...new Set(paymentRows.map((p) => p.booking_id))];
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, booking_code, user_id")
        .in("id", bookingIds);

      const userIds = [...new Set((bookings || []).map((b) => b.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      const bookingMap = new Map((bookings || []).map((b) => [b.id, b]));
      const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || "Unknown"]));

      return paymentRows.map((p): PaymentRecord => {
        const booking = bookingMap.get(p.booking_id);
        return {
          ...p,
          amount: Number(p.amount),
          booking_code: booking?.booking_code || "—",
          customer_name: booking ? profileMap.get(booking.user_id) || "Unknown" : "Unknown",
        };
      });
    },
  });

  // Fetch previous period for comparison
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

  // Summary metrics
  const metrics = useMemo(() => {
    const collected = payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
    const failed = payments.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);
    const total = payments.length;
    const completedCount = payments.filter((p) => p.status === "completed").length;
    const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const prevCollected = prevPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
    const changePercent = prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : 0;

    return { collected, pending, failed, total, completedCount, successRate, changePercent, pendingCount: payments.filter((p) => p.status === "pending").length, failedCount: payments.filter((p) => p.status === "failed").length };
  }, [payments, prevPayments]);

  // Payment method breakdown
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

  // Payment type breakdown
  const typeBreakdown = useMemo(() => {
    const rental = payments.filter((p) => p.status === "completed" && (p.payment_type === "rental" || p.payment_type === "P" || p.payment_type === "PAC")).reduce((s, p) => s + p.amount, 0);
    const deposit = payments.filter((p) => p.status === "completed" && (p.payment_type === "deposit" || p.payment_type === "PA")).reduce((s, p) => s + p.amount, 0);
    const other = metrics.collected - rental - deposit;
    return { rental, deposit, other };
  }, [payments, metrics.collected]);

  // Daily trend (last 7 days)
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
      days.push({
        date: format(day, "MMM d"),
        collected,
        pending,
        failed,
        count: dayPayments.length,
        successRate,
      });
    }
    return days;
  }, [payments]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Payment Collection</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time payment tracking and revenue metrics
            </p>
          </div>
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
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
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
                title="Collected"
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
              {/* Payment Type Breakdown */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Revenue Breakdown</h3>
                  <div className="space-y-2">
                    <BreakdownRow label="Rental Payments" amount={typeBreakdown.rental} total={metrics.collected} />
                    <BreakdownRow label="Deposit Payments" amount={typeBreakdown.deposit} total={metrics.collected} />
                    {typeBreakdown.other > 0 && <BreakdownRow label="Other" amount={typeBreakdown.other} total={metrics.collected} />}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Breakdown */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Payment Method</h3>
                  {methodBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No completed payments</p>
                  ) : (
                    <div className="space-y-2">
                      {methodBreakdown.map((m) => (
                        <BreakdownRow key={m.method} label={m.method} amount={m.total} total={metrics.collected} count={m.count} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Status Breakdown */}
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
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Recent Transactions ({payments.length})</h3>
                  <Link to="/admin/billing">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All in Billing →
                    </Button>
                  </Link>
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
                              <Link to={`/admin/bookings/${p.booking_id}`} className="font-mono text-sm text-primary hover:underline">
                                {p.booking_code}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm">{p.customer_name}</TableCell>
                            <TableCell className="text-sm font-medium">${p.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground capitalize">{p.payment_type}</TableCell>
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
    </AdminShell>
  );
}

// ── Helper Components ──

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

function SummaryCard({ title, value, subtitle, icon: Icon, positive, negative, changePercent }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  positive?: boolean;
  negative?: boolean;
  changePercent?: number;
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
  const colors = {
    success: "bg-emerald-500/10 border-emerald-500/20",
    warning: "bg-yellow-500/10 border-yellow-500/20",
    destructive: "bg-destructive/10 border-destructive/20",
  };
  const textColors = {
    success: "text-emerald-600",
    warning: "text-yellow-600",
    destructive: "text-destructive",
  };
  return (
    <div className={cn("rounded-lg border p-3", colors[variant])}>
      <p className={cn("text-lg font-bold", textColors[variant])}>${amount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</p>
      <p className="text-xs text-muted-foreground">{label} · {count} txn{count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Paid</Badge>;
    case "pending":
      return <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">⏳ Pending</Badge>;
    case "failed":
      return <Badge variant="destructive" className="text-xs">✗ Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
