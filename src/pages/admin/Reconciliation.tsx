import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  AlertOctagon,
  Clock,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──

interface PaymentRow {
  id: string;
  amount: number;
  paymentType: string;
  transactionId: string | null;
  status: string;
  createdAt: string;
}

interface ReconciliationRow {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  bookingStatus: string;
  totalAmount: number;
  depositAmount: number;
  wlTransactionId: string | null;
  wlDepositTransactionId: string | null;
  depositStatus: string | null;
  payments: PaymentRow[];
}

type MatchStatus = "matched" | "orphaned" | "deposit_unreleased";

interface BulkResult {
  ref: string;
  found: boolean;
  bookingCode?: string;
  customerName?: string;
  amount?: number;
  bookingStatus?: string;
  matchStatus?: MatchStatus;
}

interface BamboraTxn {
  transactionId: string;
  amount: number;
  cardLastFour: string;
  cardType: string;
  status: string;
  dateTime: string;
  orderNumber: string;
  error?: string;
}

// ── Helpers ──

function getMatchStatus(row: ReconciliationRow): MatchStatus {
  const depositUnreleased =
    row.depositStatus === "authorized" &&
    ["cancelled", "completed"].includes(row.bookingStatus);
  if (depositUnreleased) return "deposit_unreleased";

  if (row.wlTransactionId) {
    const hasMatchingPayment = row.payments.some(
      (p) => p.transactionId === row.wlTransactionId
    );
    if (!hasMatchingPayment) return "orphaned";
  }

  return "matched";
}

function MatchBadge({ status }: { status: MatchStatus }) {
  switch (status) {
    case "matched":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Matched
        </Badge>
      );
    case "orphaned":
      return (
        <Badge variant="destructive">
          <AlertOctagon className="w-3 h-3 mr-1" /> Orphaned
        </Badge>
      );
    case "deposit_unreleased":
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="w-3 h-3 mr-1" /> Deposit Unreleased
        </Badge>
      );
  }
}

// ── Alert Types ──

interface Alert {
  severity: "CRITICAL" | "WARNING";
  message: string;
  bookingCode: string;
  bookingId: string;
}

// ── Page ──

export default function Reconciliation() {
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bamboraData, setBamboraData] = useState<BamboraTxn[] | null>(null);
  const [bamboraLoading, setBamboraLoading] = useState(false);
  const [manualTxnInput, setManualTxnInput] = useState("");

  // Fetch bookings with Bambora refs + payments
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["reconciliation-ledger"],
    queryFn: async () => {
      const { data: bookings, error: bErr } = await supabase
        .from("bookings")
        .select(
          "id, booking_code, status, total_amount, deposit_amount, deposit_status, wl_transaction_id, wl_deposit_transaction_id, user_id, vehicle_id, created_at"
        )
        .or("wl_transaction_id.not.is.null,wl_deposit_transaction_id.not.is.null")
        .order("created_at", { ascending: false });

      if (bErr) throw bErr;
      if (!bookings?.length) return [];

      // Fetch profiles
      const userIds = [...new Set(bookings.map((b) => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.full_name || "Unknown"])
      );

      // Fetch payments
      const bookingIds = bookings.map((b) => b.id);
      const { data: payments } = await supabase
        .from("payments")
        .select("id, booking_id, amount, payment_type, transaction_id, status, created_at")
        .in("booking_id", bookingIds);

      const paymentsByBooking = new Map<string, PaymentRow[]>();
      (payments || []).forEach((p) => {
        const list = paymentsByBooking.get(p.booking_id) || [];
        list.push({
          id: p.id,
          amount: Number(p.amount),
          paymentType: p.payment_type,
          transactionId: p.transaction_id,
          status: p.status,
          createdAt: p.created_at,
        });
        paymentsByBooking.set(p.booking_id, list);
      });

      return bookings.map((b): ReconciliationRow => ({
        bookingId: b.id,
        bookingCode: b.booking_code,
        customerName: profileMap.get(b.user_id) || "Unknown",
        bookingStatus: b.status,
        totalAmount: Number(b.total_amount),
        depositAmount: Number(b.deposit_amount || 0),
        wlTransactionId: b.wl_transaction_id,
        wlDepositTransactionId: b.wl_deposit_transaction_id,
        depositStatus: b.deposit_status,
        payments: paymentsByBooking.get(b.id) || [],
      }));
    },
  });

  // Compute alerts
  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    rows.forEach((r) => {
      if (
        r.depositStatus === "authorized" &&
        ["cancelled", "completed"].includes(r.bookingStatus)
      ) {
        list.push({
          severity: "CRITICAL",
          message: `Deposit still authorized ($${r.depositAmount}) on ${r.bookingStatus} booking`,
          bookingCode: r.bookingCode,
          bookingId: r.bookingId,
        });
      }
      if (r.wlTransactionId) {
        const matched = r.payments.some(
          (p) => p.transactionId === r.wlTransactionId
        );
        if (!matched) {
          list.push({
            severity: "WARNING",
            message: `Bambora txn ${r.wlTransactionId} has no matching payments row`,
            bookingCode: r.bookingCode,
            bookingId: r.bookingId,
          });
        }
      }
    });
    return list;
  }, [rows]);

  // Bulk search
  const handleBulkSearch = async () => {
    const refs = bulkInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!refs.length) return;

    setBulkLoading(true);
    try {
      // Strip -DEP suffix to get base booking codes
      const baseCodes = [...new Set(refs.map((r) => r.replace(/-DEP$/, "")))];

      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, booking_code, status, total_amount, deposit_amount, deposit_status, wl_transaction_id, wl_deposit_transaction_id, user_id"
        )
        .in("booking_code", baseCodes);

      const userIds = [...new Set((bookings || []).map((b) => b.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.full_name || "Unknown"])
      );

      const bookingMap = new Map(
        (bookings || []).map((b) => [b.booking_code, b])
      );

      const results: BulkResult[] = refs.map((ref) => {
        const isDeposit = ref.endsWith("-DEP");
        const baseCode = ref.replace(/-DEP$/, "");
        const b = bookingMap.get(baseCode);

        if (!b) return { ref, found: false };

        // For DEP refs, check wl_deposit_transaction_id exists
        if (isDeposit && !b.wl_deposit_transaction_id) {
          return { ref, found: false };
        }

        const depositUnreleased =
          b.deposit_status === "authorized" &&
          ["cancelled", "completed"].includes(b.status);

        return {
          ref,
          found: true,
          bookingCode: b.booking_code,
          customerName: profileMap.get(b.user_id) || "Unknown",
          amount: isDeposit ? Number(b.deposit_amount || 0) : Number(b.total_amount),
          bookingStatus: b.status,
          matchStatus: depositUnreleased ? "deposit_unreleased" : "matched",
        };
      });

      setBulkResults(results);
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkMatched = bulkResults?.filter((r) => r.found).length ?? 0;
  const bulkNotFound = bulkResults?.filter((r) => !r.found).length ?? 0;

  // Fetch live Bambora data for all transaction IDs
  const handleFetchBambora = async () => {
    const txnIds = new Set<string>();
    rows.forEach((r) => {
      if (r.wlTransactionId) txnIds.add(r.wlTransactionId);
      if (r.wlDepositTransactionId) txnIds.add(r.wlDepositTransactionId);
    });

    // Add manually entered IDs
    manualTxnInput.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean).forEach(id => txnIds.add(id));

    if (txnIds.size === 0) {
      toast.error("No transaction IDs to query");
      return;
    }

    setBamboraLoading(true);
    setBamboraData(null);

    try {
      const results: BamboraTxn[] = [];
      const ids = Array.from(txnIds);

      // Process in batches of 5 to avoid overwhelming the API
      for (let i = 0; i < ids.length; i += 5) {
        const batch = ids.slice(i, i + 5);
        const batchResults = await Promise.allSettled(
          batch.map(async (txnId) => {
            const { data, error } = await supabase.functions.invoke("wl-query-txn", {
              body: { transactionId: txnId },
            });

            if (error) {
              return { transactionId: txnId, error: "Function error" } as BamboraTxn;
            }

            if (!data?.ok || !data?.data) {
              return {
                transactionId: txnId,
                amount: 0,
                cardLastFour: "",
                cardType: "",
                status: "error",
                dateTime: "",
                orderNumber: "",
                error: data?.data?.message || "Not found at gateway",
              } as BamboraTxn;
            }

            const txn = data.data;
            return {
              transactionId: String(txn.id),
              amount: Number(txn.amount || 0),
              cardLastFour: txn.card?.last_four || "",
              cardType: txn.card?.card_type || "",
              status: txn.approved === 1 ? "Approved" : txn.message || "Declined",
              dateTime: txn.created || "",
              orderNumber: txn.order_number || "",
            } as BamboraTxn;
          })
        );

        batchResults.forEach((r) => {
          if (r.status === "fulfilled") results.push(r.value);
          else results.push({ transactionId: "unknown", error: "Request failed" } as BamboraTxn);
        });
      }

      setBamboraData(results);
      toast.success(`Fetched ${results.length} transactions from Bambora`);
    } catch (err) {
      toast.error("Failed to fetch Bambora data");
      console.error(err);
    } finally {
      setBamboraLoading(false);
    }
  };

  // Find rental payment for a row
  const getRentalPayment = (row: ReconciliationRow) =>
    row.payments.find((p) => p.paymentType === "rental" || p.paymentType === "PAC" || p.paymentType === "P") ||
    row.payments.find((p) => p.transactionId === row.wlTransactionId);

  const getDepositPayment = (row: ReconciliationRow) =>
    row.payments.find((p) => p.paymentType === "deposit" || p.paymentType === "PA") ||
    row.payments.find((p) => p.transactionId === row.wlDepositTransactionId);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payment Reconciliation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Match Bambora portal transactions to booking records
          </p>
        </div>

        {/* ── SECTION 3: ALERTS ── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  a.severity === "CRITICAL"
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-yellow-500/5 border-yellow-500/20"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    a.severity === "CRITICAL" ? "text-destructive" : "text-yellow-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={a.severity === "CRITICAL" ? "destructive" : "outline"}
                      className={
                        a.severity === "WARNING"
                          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          : ""
                      }
                    >
                      {a.severity}
                    </Badge>
                    <Link
                      to={`/admin/bookings/${a.bookingId}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {a.bookingCode}
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SECTION 1: PAYMENT LEDGER ── */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <h2 className="text-base font-semibold">Payment Ledger</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All bookings with Bambora transaction references
              </p>
            </div>

            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No bookings with Bambora references found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Rental Payment</TableHead>
                      <TableHead>Deposit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const matchStatus = getMatchStatus(row);
                      const rental = getRentalPayment(row);
                      const deposit = getDepositPayment(row);

                      return (
                        <TableRow key={row.bookingId}>
                          <TableCell>
                            <Link
                              to={`/admin/bookings/${row.bookingId}`}
                              className="font-mono text-sm text-primary hover:underline"
                            >
                              {row.bookingCode}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{row.customerName}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              <div className="font-medium">${row.totalAmount.toFixed(2)}</div>
                              {row.wlTransactionId && (
                                <div className="text-muted-foreground font-mono">
                                  TXN: {row.wlTransactionId}
                                </div>
                              )}
                              {rental && (
                                <>
                                  <div className="text-muted-foreground">
                                    {rental.paymentType} · {rental.status}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {format(new Date(rental.createdAt), "MMM d, h:mm a")}
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.depositAmount > 0 ? (
                              <div className="space-y-0.5 text-xs">
                                <div className="font-medium">${row.depositAmount.toFixed(2)}</div>
                                {row.wlDepositTransactionId && (
                                  <div className="text-muted-foreground font-mono">
                                    TXN: {row.wlDepositTransactionId}
                                  </div>
                                )}
                                <div className="text-muted-foreground">
                                  {row.depositStatus || "none"}
                                </div>
                                {deposit && (
                                  <div className="text-muted-foreground">
                                    {deposit.paymentType} · {deposit.status}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {row.bookingStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <MatchBadge status={matchStatus} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── SECTION 2: BULK SEARCH ── */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Bulk Transaction Search</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste Bambora order references (one per line) to check against bookings
              </p>
            </div>

            <Textarea
              placeholder={"RE44EN2U\n69M6RYX9-DEP\nFZH86F8W"}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />

            <Button onClick={handleBulkSearch} disabled={bulkLoading || !bulkInput.trim()}>
              {bulkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Check All
            </Button>

            {bulkResults && (
              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {bulkMatched} matched
                  </Badge>
                  {bulkNotFound > 0 && (
                    <Badge variant="destructive">
                      {bulkNotFound} not found
                    </Badge>
                  )}
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Order Ref</TableHead>
                        <TableHead>Found</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Booking Status</TableHead>
                        <TableHead>Match</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.map((r, i) => (
                        <TableRow
                          key={i}
                          className={
                            r.found
                              ? "bg-emerald-500/5"
                              : "bg-destructive/5"
                          }
                        >
                          <TableCell className="font-mono text-sm">{r.ref}</TableCell>
                          <TableCell>
                            {r.found ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="destructive">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{r.customerName || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {r.amount != null ? `$${r.amount.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell>
                            {r.bookingStatus ? (
                              <Badge variant="outline" className="text-xs capitalize">
                                {r.bookingStatus}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            {r.matchStatus ? <MatchBadge status={r.matchStatus} /> : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* ── SECTION 3: LIVE BAMBORA DATA ── */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Live Bambora Transactions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fetch real-time transaction data directly from the payment gateway
                </p>
              </div>
              <Button onClick={handleFetchBambora} disabled={bamboraLoading || rows.length === 0}>
                {bamboraLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Fetch from Bambora
              </Button>
            </div>

            {bamboraData && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Order Ref</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date/Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bamboraData.map((txn, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{txn.transactionId}</TableCell>
                        <TableCell className="font-mono text-sm">{txn.orderNumber || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {txn.error ? "—" : `$${txn.amount.toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {txn.cardLastFour ? (
                            <span>{txn.cardType} •••• {txn.cardLastFour}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {txn.error ? (
                            <Badge variant="destructive" className="text-xs">{txn.error}</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                txn.status === "Approved"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                              }
                            >
                              {txn.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {txn.dateTime
                            ? format(new Date(txn.dateTime), "MMM d, yyyy h:mm a")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
