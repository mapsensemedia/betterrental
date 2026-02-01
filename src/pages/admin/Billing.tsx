import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Receipt, 
  Search, 
  Filter, 
  Eye, 
  Plus,
  Download,
  Send,
  FileText,
  DollarSign,
  Calendar,
  User,
  Loader2,
  CheckCircle,
  X,
  RefreshCw,
  ExternalLink,
  CreditCard,
  Banknote,
  TrendingUp,
  Clock,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useBookingsForReceipt, useCreateReceipt, useIssueReceipt } from "@/hooks/use-receipts";

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
    profile?: {
      full_name: string | null;
      email: string | null;
    };
    vehicle?: {
      make: string;
      model: string;
    };
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

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function AdminBilling() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [activeTab, setActiveTab] = useState<"receipts" | "payments" | "deposits">("receipts");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create Receipt state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [receiptNotes, setReceiptNotes] = useState("");

  const { data: searchedBookings = [], isLoading: searchingBookings } = useBookingsForReceipt(bookingSearch);
  const createReceipt = useCreateReceipt();
  const issueReceipt = useIssueReceipt();

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
            user_id,
            vehicle:vehicle_categories(name)
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "draft" | "issued" | "voided");
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(r => r.booking?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(receipt => ({
        ...receipt,
        totals_json: receipt.totals_json as { subtotal: number; tax: number; total: number },
        line_items_json: receipt.line_items_json as any[],
        booking: receipt.booking ? {
          ...receipt.booking,
          profile: profileMap.get(receipt.booking.user_id) || null,
        } : null,
      })) as ReceiptData[];
    },
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          booking:bookings(booking_code, user_id)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(data.map(p => p.booking?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
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
        .update({
          status: "issued",
          issued_at: new Date().toISOString(),
        })
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

  // Build line items from selected booking
  const buildLineItemsFromBooking = (booking: any) => {
    const items: LineItem[] = [];
    
    // Base rental
    items.push({
      description: `Vehicle Rental (${booking.total_days} days @ $${booking.daily_rate}/day)`,
      quantity: booking.total_days,
      unitPrice: Number(booking.daily_rate),
      total: Number(booking.daily_rate) * booking.total_days,
    });

    // Add-ons
    (booking.addOns || []).forEach((addon: any) => {
      items.push({
        description: addon.name,
        quantity: 1,
        unitPrice: Number(addon.price),
        total: Number(addon.price),
      });
    });

    return items;
  };

  const handleSelectBooking = (booking: any) => {
    setSelectedBooking(booking);
    setLineItems(buildLineItemsFromBooking(booking));
    setBookingSearch("");
  };

  const handleCreateReceipt = () => {
    if (!selectedBooking) return;

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const tax = Number(selectedBooking.tax_amount) || subtotal * 0.1;
    const total = subtotal + tax;

    createReceipt.mutate({
      bookingId: selectedBooking.id,
      lineItems,
      totals: { subtotal, tax, total },
      notes: receiptNotes || undefined,
    }, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setSelectedBooking(null);
        setLineItems([]);
        setReceiptNotes("");
      },
    });
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    if (field === "description") {
      updated[index].description = value as string;
    } else {
      updated[index][field] = Number(value);
      if (field === "quantity" || field === "unitPrice") {
        updated[index].total = updated[index].quantity * updated[index].unitPrice;
      }
    }
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const filteredReceipts = receipts.filter((receipt) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      receipt.receipt_number?.toLowerCase().includes(searchLower) ||
      receipt.booking?.booking_code?.toLowerCase().includes(searchLower) ||
      receipt.booking?.profile?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const filteredPayments = payments.filter((payment) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.booking?.booking_code?.toLowerCase().includes(searchLower) ||
      payment.booking?.profile?.full_name?.toLowerCase().includes(searchLower) ||
      payment.transaction_id?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "issued":
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

  // Calculate stats
  const totalRevenue = payments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const pendingAmount = payments
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const depositPayments = payments.filter(p => p.payment_type === "deposit");
  const totalDeposits = depositPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin-receipts"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    setIsRefreshing(false);
    toast({ title: "Data refreshed" });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="heading-2 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-primary" />
              Billing & Receipts
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage receipts, invoices, and payment records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Receipt
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a new receipt for a booking</TooltipContent>
            </Tooltip>
          </div>
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
                  <p className="text-sm text-muted-foreground">Receipts Issued</p>
                  <p className="text-2xl font-bold">{receipts.filter(r => r.status === "issued").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="receipts" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
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
              placeholder={activeTab === "receipts" ? "Search receipts..." : "Search payments..."}
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

        {/* Receipts Table */}
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
                        <Badge variant="outline" className="font-mono">
                          {receipt.receipt_number}
                        </Badge>
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
                      <TableCell>
                        {format(new Date(receipt.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedReceipt(receipt)}
                            >
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

        {/* Payments Table */}
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
                      <TableCell>
                        {payment.booking?.profile?.full_name || "Unknown"}
                      </TableCell>
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
                      <TableCell className="font-medium">
                        ${Number(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.payment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{payment.payment_method || "—"}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Deposits Tab */}
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
                      <TableCell>
                        {payment.booking?.profile?.full_name || "Unknown"}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="capitalize">{payment.payment_method || "—"}</TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), "MMM d, yyyy")}
                      </TableCell>
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

        {/* Receipt Detail Dialog */}
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-lg">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedReceipt.booking?.profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedReceipt.booking?.profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Booking</p>
                    <Badge variant="outline" className="font-mono">
                      {selectedReceipt.booking?.booking_code}
                    </Badge>
                  </div>
                </div>

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
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Receipt Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Receipt
              </DialogTitle>
              <DialogDescription>
                Search for a booking and generate a receipt
              </DialogDescription>
            </DialogHeader>

            {!selectedBooking ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by booking code..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchingBookings && (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                )}

                {!searchingBookings && bookingSearch.length >= 2 && searchedBookings.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    No bookings found
                  </div>
                )}

                {searchedBookings.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={`p-4 border rounded-xl cursor-pointer transition-all hover:border-primary ${
                          booking.hasReceipt ? "opacity-50" : ""
                        }`}
                        onClick={() => !booking.hasReceipt && handleSelectBooking(booking)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono">
                                {booking.booking_code}
                              </Badge>
                              {booking.hasReceipt && (
                                <Badge className="bg-amber-500/10 text-amber-600 text-xs">
                                  Receipt exists
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium">
                              {booking.vehicle?.year} {booking.vehicle?.make} {booking.vehicle?.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {booking.profile?.full_name || "Unknown"} • {booking.total_days} days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${Number(booking.total_amount).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Booking Info */}
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="font-mono mb-2">
                        {selectedBooking.booking_code}
                      </Badge>
                      <p className="font-medium">
                        {selectedBooking.vehicle?.year} {selectedBooking.vehicle?.make} {selectedBooking.vehicle?.model}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBooking.profile?.full_name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedBooking(null);
                        setLineItems([]);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Line Items</Label>
                    <Button variant="outline" size="sm" onClick={handleAddLineItem}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(index, "description", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleUpdateLineItem(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateLineItem(index, "unitPrice", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          ${item.total.toFixed(2)}
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLineItem(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${lineItems.reduce((s, i) => s + i.total, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>${(Number(selectedBooking.tax_amount) || lineItems.reduce((s, i) => s + i.total, 0) * 0.1).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>
                        ${(
                          lineItems.reduce((s, i) => s + i.total, 0) + 
                          (Number(selectedBooking.tax_amount) || lineItems.reduce((s, i) => s + i.total, 0) * 0.1)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Add any notes for this receipt..."
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateReceipt}
                    disabled={createReceipt.isPending || lineItems.length === 0}
                  >
                    {createReceipt.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Create Draft Receipt
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