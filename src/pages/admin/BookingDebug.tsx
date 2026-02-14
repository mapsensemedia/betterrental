/**
 * Admin Debug View — Booking Pricing Snapshot + Extras
 * Shows raw booking financial data, add-ons rows, drivers rows, and pricing snapshot
 * for rapid debugging of pricing mismatches.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Database } from "lucide-react";

export default function BookingDebug() {
  const { bookingId } = useParams<{ bookingId: string }>();

  const { data: booking, isLoading: loadingBooking } = useQuery({
    queryKey: ["debug-booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, status, daily_rate, total_days, subtotal,
          tax_amount, total_amount, deposit_amount, delivery_fee,
          different_dropoff_fee, young_driver_fee, upgrade_daily_fee,
          protection_plan, driver_age_band, pricing_snapshot,
          vehicle_id, location_id, return_location_id,
          start_at, end_at, created_at, updated_at
        `)
        .eq("id", bookingId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  const { data: addOns = [] } = useQuery({
    queryKey: ["debug-addons", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_add_ons")
        .select("id, add_on_id, price, quantity, add_ons(name, daily_rate, one_time_fee)")
        .eq("booking_id", bookingId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["debug-drivers", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_additional_drivers")
        .select("id, driver_name, driver_age_band, young_driver_fee")
        .eq("booking_id", bookingId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["debug-payments", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, payment_type, payment_method, transaction_id, created_at")
        .eq("booking_id", bookingId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });

  const { data: depositLedger = [] } = useQuery({
    queryKey: ["debug-deposit-ledger", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposit_ledger")
        .select("id, action, amount, reason, category, created_at")
        .eq("booking_id", bookingId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });

  if (loadingBooking) {
    return <div className="p-6 text-muted-foreground">Loading debug data...</div>;
  }

  if (!booking) {
    return <div className="p-6 text-destructive">Booking not found: {bookingId}</div>;
  }

  // Reconciliation check
  const addOnsTotal = addOns.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const driversTotal = drivers.reduce((sum, d) => sum + Number(d.young_driver_fee || 0), 0);
  const rentalSubtotal = Number(booking.daily_rate) * Number(booking.total_days);
  const computedSubtotal = rentalSubtotal + addOnsTotal + driversTotal +
    Number(booking.delivery_fee || 0) + Number(booking.different_dropoff_fee || 0) +
    Number(booking.young_driver_fee || 0) + Number(booking.upgrade_daily_fee || 0);
  const storedSubtotal = Number(booking.subtotal);
  const subtotalMatch = Math.abs(computedSubtotal - storedSubtotal) < 0.02;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Booking Debug</h1>
        <Badge variant="outline">{booking.booking_code}</Badge>
        <Badge variant={booking.status === "active" ? "default" : "secondary"}>
          {booking.status}
        </Badge>
      </div>

      {/* Reconciliation Alert */}
      <Card className={subtotalMatch ? "border-primary/50" : "border-destructive"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {subtotalMatch ? (
              <><CheckCircle className="h-4 w-4 text-primary" /> Subtotal Reconciled</>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-destructive" /> Subtotal Mismatch!</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs font-mono space-y-1">
          <div>Stored subtotal: ${storedSubtotal.toFixed(2)}</div>
          <div>Computed (rental + extras + fees): ${computedSubtotal.toFixed(2)}</div>
          {!subtotalMatch && (
            <div className="text-destructive font-bold">
              Δ = ${(computedSubtotal - storedSubtotal).toFixed(2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Core Financial Fields */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Financial Fields (DB Source)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            {[
              ["daily_rate", booking.daily_rate],
              ["total_days", booking.total_days],
              ["subtotal", booking.subtotal],
              ["tax_amount", booking.tax_amount],
              ["total_amount", booking.total_amount],
              ["deposit_amount", booking.deposit_amount],
              ["delivery_fee", booking.delivery_fee],
              ["different_dropoff_fee", booking.different_dropoff_fee],
              ["young_driver_fee", booking.young_driver_fee],
              ["upgrade_daily_fee", booking.upgrade_daily_fee],
              ["protection_plan", booking.protection_plan],
              ["driver_age_band", booking.driver_age_band],
            ].map(([key, val]) => (
              <div key={key as string} className="bg-muted p-2 rounded">
                <div className="text-muted-foreground">{key as string}</div>
                <div className="font-semibold">{val != null ? String(val) : "null"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Booking Add-Ons ({addOns.length} rows)</CardTitle>
        </CardHeader>
        <CardContent>
          {addOns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No add-ons persisted</p>
          ) : (
            <div className="space-y-2">
              {addOns.map((a: any) => (
                <div key={a.id} className="flex justify-between text-xs font-mono bg-muted p-2 rounded">
                  <span>{a.add_ons?.name || a.add_on_id} × {a.quantity || 1}</span>
                  <span className="font-semibold">${Number(a.price).toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Add-ons Total</span>
                <span>${addOnsTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Drivers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Additional Drivers ({drivers.length} rows)</CardTitle>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No additional drivers</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((d: any) => (
                <div key={d.id} className="flex justify-between text-xs font-mono bg-muted p-2 rounded">
                  <span>{d.driver_name || "Unnamed"} ({d.driver_age_band})</span>
                  <span className="font-semibold">${Number(d.young_driver_fee).toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Drivers Total</span>
                <span>${driversTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payments ({payments.length} rows)</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments recorded</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-xs font-mono bg-muted p-2 rounded">
                  <div>
                    <span className="font-semibold">${Number(p.amount).toFixed(2)}</span>
                    <span className="ml-2 text-muted-foreground">{p.payment_type} / {p.payment_method}</span>
                  </div>
                  <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deposit Ledger ({depositLedger.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {depositLedger.length === 0 ? (
            <p className="text-xs text-muted-foreground">No deposit ledger entries</p>
          ) : (
            <div className="space-y-2">
              {depositLedger.map((d: any) => (
                <div key={d.id} className="flex justify-between text-xs font-mono bg-muted p-2 rounded">
                  <div>
                    <span className="font-semibold">{d.action}</span>
                    <span className="ml-2 text-muted-foreground">{d.reason || ""}</span>
                  </div>
                  <span>${Number(d.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Snapshot (raw JSON) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pricing Snapshot (raw)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-[10px] font-mono bg-muted p-3 rounded overflow-auto max-h-64">
            {booking.pricing_snapshot
              ? JSON.stringify(booking.pricing_snapshot, null, 2)
              : "No snapshot stored"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
