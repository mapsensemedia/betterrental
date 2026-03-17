import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminShell } from "@/components/layout/AdminShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { AgreementStructuredView } from "@/components/booking/AgreementStructuredView";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Eye,
  PenLine,
  AlertTriangle,
} from "lucide-react";

interface AgreementRow {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string | null;
  customerEmail: string | null;
  vehicleName: string | null;
  startAt: string;
  endAt: string;
  status: string;
  signaturePngUrl: string | null;
  customerSignature: string | null;
  customerSignedAt: string | null;
  agreementContent: string;
  createdAt: string;
}

function useAgreements() {
  return useQuery<AgreementRow[]>({
    queryKey: ["admin-agreements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_agreements")
        .select("id, booking_id, status, signature_png_url, customer_signature, customer_signed_at, agreement_content, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const bookingIds = [...new Set(data.map((a) => a.booking_id))];
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, booking_code, start_at, end_at, user_id, vehicle_id, customer_id")
        .in("id", bookingIds);

      // Batch fetch customers for walk-in bookings
      const customerIds = [...new Set((bookings || []).map((b) => b.customer_id).filter(Boolean))];
      const userIds = [...new Set((bookings || []).map((b) => b.user_id))];
      const categoryIds = [...new Set((bookings || []).map((b) => b.vehicle_id).filter(Boolean))];

      const [customersRes, profilesRes, categoriesRes] = await Promise.all([
        customerIds.length > 0
          ? supabase.from("customers").select("id, full_name, email").in("id", customerIds)
          : { data: [] },
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
          : { data: [] },
        categoryIds.length > 0
          ? supabase.from("vehicle_categories").select("id, name").in("id", categoryIds)
          : { data: [] },
      ]);

      const bookingsMap = new Map((bookings || []).map((b) => [b.id, b]));
      const customersMap = new Map((customersRes.data || []).map((c) => [c.id, c]));
      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
      const categoriesMap = new Map((categoriesRes.data || []).map((c) => [c.id, c]));

      return data.map((a) => {
        const booking = bookingsMap.get(a.booking_id);
        const customer = booking?.customer_id ? customersMap.get(booking.customer_id) : null;
        const profile = booking ? profilesMap.get(booking.user_id) : null;
        const category = booking ? categoriesMap.get(booking.vehicle_id) : null;
        return {
          id: a.id,
          bookingId: a.booking_id,
          bookingCode: booking?.booking_code || "—",
          customerName: customer?.full_name || profile?.full_name || null,
          customerEmail: customer?.email || profile?.email || null,
          vehicleName: category?.name || null,
          startAt: booking?.start_at || "",
          endAt: booking?.end_at || "",
          status: a.status,
          signaturePngUrl: a.signature_png_url,
          customerSignature: a.customer_signature,
          customerSignedAt: a.customer_signed_at,
          agreementContent: a.agreement_content,
          createdAt: a.created_at,
        };
      });
    },
    staleTime: 30000,
  });
}

function isSigned(row: AgreementRow) {
  return row.status === "confirmed" || row.status === "signed" || !!row.signaturePngUrl || !!row.customerSignature;
}

function getStatusInfo(row: AgreementRow) {
  if (isSigned(row)) {
    return { label: "Signed", variant: "default" as const, className: "bg-emerald-600 hover:bg-emerald-600 text-white" };
  }
  if (row.status === "voided") {
    return { label: "Voided", variant: "destructive" as const, className: "" };
  }
  if (row.status === "expired") {
    return { label: "Expired", variant: "destructive" as const, className: "" };
  }
  return { label: "Pending", variant: "outline" as const, className: "border-amber-500 text-amber-600 bg-amber-50" };
}

export default function AdminAgreements() {
  const { data: agreements = [], isLoading } = useAgreements();
  const [tab, setTab] = useState<"all" | "signed" | "pending">("all");
  const [search, setSearch] = useState("");
  const [viewAgreement, setViewAgreement] = useState<AgreementRow | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);

  // Fetch full agreement data when viewing
  const { data: fullAgreement, isLoading: isLoadingFull } = useRentalAgreement(
    viewAgreement?.bookingId || null
  );

  const filtered = useMemo(() => {
    let list = agreements;
    if (tab === "signed") {
      list = list.filter((a) => isSigned(a));
    } else if (tab === "pending") {
      list = list.filter((a) => !isSigned(a) && a.status !== "expired" && a.status !== "voided");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.bookingCode.toLowerCase().includes(q) ||
          (a.customerName && a.customerName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [agreements, tab, search]);

  const signed = agreements.filter((a) => isSigned(a)).length;
  const pending = agreements.filter((a) => !isSigned(a) && a.status !== "expired" && a.status !== "voided").length;
  const pendingPastStart = agreements.filter(
    (a) => !isSigned(a) && a.status !== "expired" && a.status !== "voided" && a.startAt && new Date(a.startAt) < new Date()
  ).length;

  if (isLoading) {
    return (
      <AdminShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-60" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Rental Agreements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage all rental agreement documents
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Total Agreements</p>
              <p className="text-2xl font-bold">{agreements.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Signed</p>
              <p className="text-2xl font-bold text-emerald-600">{signed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{pending}</p>
              </div>
              {pendingPastStart > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {pendingPastStart} overdue
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All ({agreements.length})</TabsTrigger>
              <TabsTrigger value="signed">Signed ({signed})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pending})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No agreements found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Try a different search term" : "No agreements match the current filter"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Vehicle</TableHead>
                    <TableHead className="hidden lg:table-cell">Rental Period</TableHead>
                    <TableHead className="hidden md:table-cell">Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const statusInfo = getStatusInfo(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Link
                            to={`/admin/bookings/${row.bookingId}`}
                            className="font-mono text-sm font-medium text-primary hover:underline"
                          >
                            {row.bookingCode}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{row.customerName || "—"}</p>
                            {row.customerEmail && (
                              <p className="text-xs text-muted-foreground">{row.customerEmail}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {row.vehicleName || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {row.startAt
                            ? `${format(new Date(row.startAt), "MMM d")} → ${format(new Date(row.endAt), "MMM d, yyyy")}`
                            : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(row.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewAgreement(row)}
                              className="gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            {row.signaturePngUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewSignature(row.signaturePngUrl)}
                                className="gap-1"
                              >
                                <PenLine className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sig</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* View Agreement Modal */}
      <Dialog open={!!viewAgreement} onOpenChange={() => setViewAgreement(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Agreement — {viewAgreement?.bookingCode}
            </DialogTitle>
          </DialogHeader>
          {viewAgreement && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>Customer: <strong className="text-foreground">{viewAgreement.customerName || "—"}</strong></span>
                <span>Status: <Badge variant={getStatusInfo(viewAgreement).variant} className={getStatusInfo(viewAgreement).className}>{getStatusInfo(viewAgreement).label}</Badge></span>
                {viewAgreement.customerSignedAt && (
                  <span>Signed: <strong className="text-foreground">{format(new Date(viewAgreement.customerSignedAt), "MMM d, yyyy h:mm a")}</strong></span>
                )}
              </div>
              <ScrollArea className="h-[60vh] border rounded-lg p-4 bg-muted/30">
                {isLoadingFull ? (
                  <div className="flex items-center justify-center py-12">
                    <Skeleton className="h-8 w-48" />
                  </div>
                ) : fullAgreement ? (
                  <AgreementStructuredView agreement={fullAgreement} bookingId={viewAgreement.bookingId} />
                ) : (
                  <div
                    className="border rounded-lg p-4 bg-white text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewAgreement.agreementContent }}
                  />
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Signature Modal */}
      <Dialog open={!!viewSignature} onOpenChange={() => setViewSignature(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Signature</DialogTitle>
          </DialogHeader>
          {viewSignature && (
            <div className="flex items-center justify-center p-4">
              <img
                src={viewSignature}
                alt="Customer signature"
                className="max-h-48 border rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
