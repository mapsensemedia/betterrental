import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { generateReceiptPdf } from "@/lib/pdf/receipt-pdf";
import { generateInvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";
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

interface ReceiptData {
  id: string;
  receipt_number: string;
  booking_id: string;
  status: "draft" | "issued" | "voided";
  line_items_json: any[];
  totals_json: {
    subtotal: number;
    tax: number;
    total: number;
  };
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
    profile?: {
      full_name: string | null;
      email: string | null;
    };
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
  booking?: {
    booking_code: string;
    profile?: {
      full_name: string | null;
    };
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
    profile?: {
      full_name: string | null;
      email: string | null;
    };
    vehicleName?: string;
  };
}

export default function AdminBilling() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [activeTab, setActiveTab] = useState<"invoices" | "receipts" | "payments" | "deposits">("invoices");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ==================== INVOICES ====================
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_invoices")
        .select(`
          *,
          booking:bookings(
            booking_code,
            start_at,
            end_at,
            total_days,
            user_id,
            vehicle_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data.map(i => (i.booking as any)?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const categoryIds = [...new Set(data.map(i => (i.booking as any)?.vehicle_id).filter(Boolean))];
      const { data: categories } = await supabase.from("vehicle_categories").select("id, name").in("id", categoryIds);
      const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

      return data.map(inv => {
        const b = inv.booking as any;
        return {
          ...inv,
          line_items_json: inv.line_items_json as any,
          booking: b ? {
            booking_code: b.booking_code,
            start_at: b.start_at,
            end_at: b.end_at,
            total_days: b.total_days,
            profile: profileMap.get(b.user_id) || null,
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
        .select(`
          *,
          booking:bookings(
            booking_code,
            total_amount,
            daily_rate,
            total_days,
            start_at,
            end_at,
            deposit_amount,
            user_id,
            vehicle_id
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "draft" | "issued" | "voided");
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const userIds = [...new Set(data.map(r => (r.booking as any)?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
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
        return {
          ...receipt,
          totals_json: receipt.totals_json as { subtotal: number; tax: number; total: number },
          line_items_json: receipt.line_items_json as any[],
          booking: b ? {
            booking_code: b.booking_code,
            total_amount: b.total_amount,
            daily_rate: b.daily_rate,
            total_days: b.total_days,
            start_at: b.start_at,
            end_at: b.end_at,
            deposit_amount: b.deposit_amount,
            profile: profileMap.get(b.user_id) || null,
            vehicleName: categoryMap.get(b.vehicle_id)?.name || null,
            addOns: addOnsMap.get(receipt.booking_id) || [],
          } : null,
        };
      }) as ReceiptData[];
    },
  });

  // ==================== PAYMENTS ====================
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`*, booking:bookings(booking_code, user_id)`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const userIds = [...new Set(data.map(p => p.booking?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(payment => ({
        ...payment,
        booking: payment.booking ? {
          ...payment.booking,
          profile: profileMap.get(payment.booking.user_id) || null,
        } : null,
      })) as Payment[];
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
    return (
      inv.invoice_number?.toLowerCase().includes(s) ||
      inv.booking?.booking_code?.toLowerCase().includes(s) ||
      inv.booking?.profile?.full_name?.toLowerCase().includes(s)
    );
  });

  const filteredReceipts = receipts.filter((receipt) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      receipt.receipt_number?.toLowerCase().includes(s) ||
      receipt.booking?.booking_code?.toLowerCase().includes(s) ||
      receipt.booking?.profile?.full_name?.toLowerCase().includes(s)
    );
  });

  const filteredPayments = payments.filter((payment) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      payment.booking?.booking_code?.toLowerCase().includes(s) ||
      payment.booking?.profile?.full_name?.toLowerCase().includes(s) ||
      payment.transaction_id?.toLowerCase().includes(s)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "issued":
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Issued</Badge>;
      case "voided":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Voided</Badge>;
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const totalRevenue = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);
  const depositPayments = payments.filter(p => p.payment_type === "deposit");
  const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    setIsRefreshing(false);
    toast({ title: "Data refreshed" });
  };

  const handleDownloadInvoicePdf = async (inv: InvoiceRow) => {
    const lineItems = Array.isArray(inv.line_items_json)
      ? inv.line_items_json.map((item: any) => ({
          description: item.description || item.label || "Item",
          amount: Number(item.amount || item.total || 0),
        }))
      : [];

    await generateInvoicePdf({
      invoiceNumber: inv.invoice_number,
      status: inv.status || "draft",
      issuedAt: inv.issued_at,
      customerName: inv.booking?.profile?.full_name || "N/A",
      customerEmail: inv.booking?.profile?.email || "",
      bookingCode: inv.booking?.booking_code || "",
      vehicleName: inv.booking?.vehicleName || "N/A",
      startDate: inv.booking?.start_at || "",
      endDate: inv.booking?.end_at || "",
      totalDays: inv.booking?.total_days || 0,
      lineItems,
      rentalSubtotal: Number(inv.rental_subtotal),
      addonsTotal: Number(inv.addons_total || 0),
      feesTotal: Number(inv.fees_total || 0),
      taxesTotal: Number(inv.taxes_total),
      lateFees: Number(inv.late_fees || 0),
      damageCharges: Number(inv.damage_charges || 0),
      grandTotal: Number(inv.grand_total),
      paymentsReceived: Number(inv.payments_received || 0),
      amountDue: Number(inv.amount_due || 0),
      depositHeld: Number(inv.deposit_held || 0),
      depositReleased: Number(inv.deposit_released || 0),
      depositCaptured: Number(inv.deposit_captured || 0),
      differentDropoffFee: Number((inv.booking as any)?.different_dropoff_fee || 0),
      notes: inv.notes,
    });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="heading-2 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-primary" />
              Billing & Invoices
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage invoices, receipts, and payment records
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </Tooltip>
        </div>

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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
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
              Payments
            </TabsTrigger>
            <TabsTrigger value="deposits" className="gap-1.5">
              <Banknote className="w-3.5 h-3.5" />
              Deposits
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "invoices" ? "Search invoices..." :
                  activeTab === "receipts" ? "Search receipts..." : "Search payments..."
                }
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
          </div>

          {/* ==================== INVOICES TAB ==================== */}
          <TabsContent value="invoices">
            {invoicesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
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
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{inv.invoice_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {inv.booking?.profile?.full_name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="link"
                                className="p-0 h-auto font-mono text-xs"
                                onClick={() => navigate(`/admin/bookings/${inv.booking_id}/ops`)}
                              >
                                {inv.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">${Number(inv.grand_total).toFixed(2)}</TableCell>
                        <TableCell className={Number(inv.amount_due) > 0 ? "text-destructive font-medium" : ""}>
                          ${Number(inv.amount_due || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(inv.status || "draft")}</TableCell>
                        <TableCell>
                          {inv.created_at ? format(new Date(inv.created_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
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
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
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
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{receipt.receipt_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {receipt.booking?.profile?.full_name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="link"
                                className="p-0 h-auto font-mono text-xs"
                                onClick={() => navigate(`/admin/bookings/${receipt.booking_id}/ops`)}
                              >
                                {receipt.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${receipt.totals_json?.total?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell>{format(new Date(receipt.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedReceipt(receipt)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
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
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
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
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30">
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {payment.transaction_id?.slice(0, 12) || "—"}
                          </code>
                        </TableCell>
                        <TableCell>{payment.booking?.profile?.full_name || "Unknown"}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="link"
                                className="p-0 h-auto font-mono text-xs"
                                onClick={() => navigate(`/admin/bookings/${payment.booking_id}/ops`)}
                              >
                                {payment.booking?.booking_code}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View booking details</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-medium">${Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{payment.payment_type}</Badge>
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
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
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
                              <Button
                                variant="link"
                                className="p-0 h-auto font-mono text-xs"
                                onClick={() => navigate(`/admin/bookings/${payment.booking_id}/ops`)}
                              >
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/returns/${payment.booking_id}`)}
                              >
                                <Clock className="w-4 h-4 mr-1" />
                                Process Return
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

        {/* ==================== INVOICE DETAIL DIALOG ==================== */}
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Details
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
                    <div>
                      <span className="text-muted-foreground">Pickup: </span>
                      <span className="font-medium">{format(new Date(selectedInvoice.booking.start_at), "MMM d, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Return: </span>
                      <span className="font-medium">{format(new Date(selectedInvoice.booking.end_at), "MMM d, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration: </span>
                      <span className="font-medium">{selectedInvoice.booking.total_days} day{selectedInvoice.booking.total_days !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Line Items */}
                {Array.isArray(selectedInvoice.line_items_json) && selectedInvoice.line_items_json.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Line Items</p>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.line_items_json.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{item.description || item.label}</TableCell>
                              <TableCell className="text-sm text-right font-medium">${Number(item.amount || item.total || 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="p-4 bg-muted rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rental Subtotal</span>
                    <span>${Number(selectedInvoice.rental_subtotal).toFixed(2)}</span>
                  </div>
                  {Number(selectedInvoice.addons_total) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span>${Number(selectedInvoice.addons_total).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.fees_total) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fees</span>
                      <span>${Number(selectedInvoice.fees_total).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxes</span>
                    <span>${Number(selectedInvoice.taxes_total).toFixed(2)}</span>
                  </div>
                  {Number(selectedInvoice.late_fees) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Late Fees</span>
                      <span>${Number(selectedInvoice.late_fees).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.damage_charges) > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Damage Charges</span>
                      <span>${Number(selectedInvoice.damage_charges).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Grand Total</span>
                    <span>${Number(selectedInvoice.grand_total).toFixed(2)}</span>
                  </div>
                  {Number(selectedInvoice.payments_received) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payments Received</span>
                      <span>${Number(selectedInvoice.payments_received).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.amount_due) > 0 && (
                    <div className="flex justify-between font-semibold text-destructive">
                      <span>Amount Due</span>
                      <span>${Number(selectedInvoice.amount_due).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {selectedInvoice.notes && (
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p>{selectedInvoice.notes}</p>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleDownloadInvoicePdf(selectedInvoice)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
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
                <Receipt className="w-5 h-5" />
                Receipt Details
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
                    <div>
                      <span className="text-muted-foreground">Pickup: </span>
                      <span className="font-medium">{format(new Date(selectedReceipt.booking.start_at), "MMM d, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Return: </span>
                      <span className="font-medium">{format(new Date(selectedReceipt.booking.end_at), "MMM d, yyyy")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration: </span>
                      <span className="font-medium">{selectedReceipt.booking.total_days} day{selectedReceipt.booking.total_days !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Line Items from receipt's own data */}
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

                {/* Totals from receipt's own data */}
                <div className="p-4 bg-muted rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedReceipt.totals_json?.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${selectedReceipt.totals_json?.tax?.toFixed(2) || "0.00"}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${selectedReceipt.totals_json?.total?.toFixed(2) || "0.00"}</span>
                  </div>
                  {selectedReceipt.booking?.deposit_amount && selectedReceipt.booking.deposit_amount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground pt-1">
                      <span>Security Deposit</span>
                      <span>${selectedReceipt.booking.deposit_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {selectedReceipt.notes && (
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p>{selectedReceipt.notes}</p>
                  </div>
                )}

                <DialogFooter className="flex gap-2">
                  {selectedReceipt.status === "draft" && (
                    <Button
                      onClick={() => issueReceiptMutation.mutate(selectedReceipt.id)}
                      disabled={issueReceiptMutation.isPending}
                    >
                      {issueReceiptMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
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
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}
