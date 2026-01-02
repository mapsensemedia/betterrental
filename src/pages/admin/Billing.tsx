import { useState } from "react";
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
  CheckCircle
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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

export default function AdminBilling() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [activeTab, setActiveTab] = useState<"receipts" | "payments">("receipts");

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
            vehicle:vehicles(make, model)
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="flex gap-2 border-b border-border">
          <Button
            variant={activeTab === "receipts" ? "default" : "ghost"}
            onClick={() => setActiveTab("receipts")}
            className="rounded-b-none"
          >
            <FileText className="w-4 h-4 mr-2" />
            Receipts
          </Button>
          <Button
            variant={activeTab === "payments" ? "default" : "ghost"}
            onClick={() => setActiveTab("payments")}
            className="rounded-b-none"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Payments
          </Button>
        </div>

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
        {activeTab === "receipts" && (
          <>
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
                          <Badge variant="outline" className="font-mono text-xs">
                            {receipt.booking?.booking_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${receipt.totals_json?.total?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell>
                          {format(new Date(receipt.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* Payments Table */}
        {activeTab === "payments" && (
          <>
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
                          <Badge variant="outline" className="font-mono text-xs">
                            {payment.booking?.booking_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${Number(payment.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_type}</TableCell>
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
          </>
        )}

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
      </div>
    </AdminShell>
  );
}