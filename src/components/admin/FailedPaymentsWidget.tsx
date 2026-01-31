import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, CreditCard, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface FailedPayment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  bookingId: string;
  bookingCode: string;
  customerName: string | null;
  customerEmail: string | null;
}

export function FailedPaymentsWidget() {
  const { data: failedPayments = [], isLoading } = useQuery<FailedPayment[]>({
    queryKey: ["admin-failed-payments"],
    queryFn: async () => {
      // Fetch payments with status 'failed'
      const { data: payments, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          status,
          created_at,
          booking_id,
          bookings (
            booking_code,
            user_id
          )
        `)
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching failed payments:", error);
        return [];
      }

      // Get customer profiles
      const userIds = [...new Set((payments || []).map(p => (p.bookings as any)?.user_id).filter(Boolean))];
      let profilesMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      }

      return (payments || []).map((p): FailedPayment => {
        const booking = p.bookings as any;
        const profile = profilesMap.get(booking?.user_id);
        return {
          id: p.id,
          amount: p.amount,
          status: p.status,
          createdAt: p.created_at,
          bookingId: p.booking_id,
          bookingCode: booking?.booking_code || "N/A",
          customerName: profile?.full_name || null,
          customerEmail: profile?.email || null,
        };
      });
    },
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-destructive" />
            Failed Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (failedPayments.length === 0) {
    return null; // Don't show widget if no failed payments
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" />
            Failed Payments
            <Badge variant="destructive">{failedPayments.length}</Badge>
          </CardTitle>
          <Link to="/admin/billing?status=failed">
            <Button variant="ghost" size="sm" className="gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <CardDescription>
          Payments that require attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {failedPayments.slice(0, 5).map((payment) => (
          <Link
            key={payment.id}
            to={`/admin/bookings?id=${payment.bookingId}`}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    ${payment.amount.toFixed(2)}
                  </p>
                  <Badge variant="outline" className="font-mono text-xs">
                    {payment.bookingCode}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {payment.customerName || payment.customerEmail || "Customer"} • {format(parseISO(payment.createdAt), "MMM d, h:mm a")}
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="shrink-0">
              Failed
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
