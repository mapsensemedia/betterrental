/**
 * Location & Daily Report
 * Deep-dive per-location and per-day analytics: bookings, revenue, add-ons,
 * demand patterns, channel mix, and every revenue line item.
 *
 * All numbers here are derived from bookings + payments + booking_add_ons
 * for the date range provided in `filters`. Collected revenue comes from
 * the payments table (completed/captured); all other revenue lines are
 * derived from booking-level fields — the same accounting used across the
 * dashboard.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, startOfDay, endOfDay, getDay } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
} from "recharts";
import { Download, MapPin, DollarSign, Package, TrendingUp } from "lucide-react";
import { useLocations } from "@/hooks/use-locations";
import { getProtectionRateForCategory } from "@/lib/protection-groups";

interface Props {
  startDate: Date;
  endDate: Date;
  periodLabel: string;
}

interface BookingRow {
  id: string;
  location_id: string;
  vehicle_id: string;
  booking_source: string | null;
  pickup_address: string | null;
  start_at: string;
  total_days: number;
  daily_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  deposit_amount: number;
  delivery_fee: number | null;
  different_dropoff_fee: number | null;
  upgrade_daily_fee: number | null;
  young_driver_fee: number | null;
  protection_plan: string | null;
  status: string;
  wl_transaction_id: string | null;
}

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  bookings: { label: "Bookings", color: "hsl(var(--primary))" },
  collected: { label: "Collected", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const money2 = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function LocationDailyReport({ startDate, endDate, periodLabel }: Props) {
  const { data: locations = [] } = useLocations();

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Bookings in the range (by start_at) with status that counts as revenue
  const bookingsQuery = useQuery({
    queryKey: ["loc-daily-bookings", startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, location_id, vehicle_id, booking_source, pickup_address, start_at, total_days, daily_rate, subtotal, tax_amount, total_amount, deposit_amount, delivery_fee, different_dropoff_fee, upgrade_daily_fee, young_driver_fee, protection_plan, status, wl_transaction_id"
        )
        .gte("start_at", startOfDay(startDate).toISOString())
        .lte("start_at", endOfDay(endDate).toISOString())
        .in("status", ["confirmed", "active", "completed"])
        .limit(2000);
      if (error) throw error;
      return (data || []) as BookingRow[];
    },
    staleTime: 60_000,
  });

  const bookings = bookingsQuery.data || [];
  const bookingIds = useMemo(() => bookings.map((b) => b.id), [bookings]);

  // Payments for those bookings (collected = completed/captured)
  const paymentsQuery = useQuery({
    queryKey: ["loc-daily-payments", bookingIds],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      const map = new Map<string, number>();
      for (let i = 0; i < bookingIds.length; i += 200) {
        const chunk = bookingIds.slice(i, i + 200);
        const { data, error } = await supabase
          .from("payments")
          .select("booking_id, amount, status")
          .in("booking_id", chunk)
          .in("status", ["completed", "captured"]);
        if (error) throw error;
        (data || []).forEach((p) => {
          map.set(p.booking_id, (map.get(p.booking_id) || 0) + Number(p.amount));
        });
      }
      return map;
    },
    staleTime: 60_000,
  });
  const paidMap = paymentsQuery.data || new Map<string, number>();

  // Add-ons for those bookings
  const addOnsQuery = useQuery({
    queryKey: ["loc-daily-addons", bookingIds],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      const rows: { booking_id: string; price: number; name: string }[] = [];
      for (let i = 0; i < bookingIds.length; i += 200) {
        const chunk = bookingIds.slice(i, i + 200);
        const { data, error } = await supabase
          .from("booking_add_ons")
          .select("booking_id, price, add_ons!inner(name)")
          .in("booking_id", chunk);
        if (error) throw error;
        (data || []).forEach((r: any) =>
          rows.push({
            booking_id: r.booking_id,
            price: Number(r.price),
            name: r.add_ons?.name || "Add-on",
          })
        );
      }
      return rows;
    },
    staleTime: 60_000,
  });
  const addOnRows = addOnsQuery.data || [];

  // Vehicle categories for protection rates
  const categoriesQuery = useQuery({
    queryKey: ["loc-daily-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_categories")
        .select("id, name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });
  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (categoriesQuery.data || []).forEach((c: any) => m.set(c.id, c.name));
    return m;
  }, [categoriesQuery.data]);

  // Add-ons grouped by booking
  const addOnsByBooking = useMemo(() => {
    const m = new Map<string, { price: number; name: string }[]>();
    addOnRows.forEach((r) => {
      const arr = m.get(r.booking_id) || [];
      arr.push({ price: r.price, name: r.name });
      m.set(r.booking_id, arr);
    });
    return m;
  }, [addOnRows]);

  // Per-booking derived fields
  const enriched = useMemo(() => {
    return bookings.map((b) => {
      const days = b.total_days || 1;
      const protectionRate =
        b.protection_plan && b.protection_plan !== "none"
          ? getProtectionRateForCategory(
              b.protection_plan,
              categoryNameMap.get(b.vehicle_id) || ""
            ).rate
          : 0;
      const protectionRevenue = protectionRate * days;
      const upgradeRevenue = (b.upgrade_daily_fee || 0) * days;
      const youngDriverFee = b.young_driver_fee || 0;
      const deliveryFee = b.delivery_fee || 0;
      const dropoffFee = b.different_dropoff_fee || 0;
      const tableAddOns = addOnsByBooking.get(b.id) || [];
      const tableAddOnRevenue = tableAddOns.reduce((s, a) => s + a.price, 0);
      const rentalBase = (b.daily_rate || 0) * days;
      const extrasRevenue =
        protectionRevenue +
        upgradeRevenue +
        youngDriverFee +
        deliveryFee +
        dropoffFee +
        tableAddOnRevenue;
      const collected = paidMap.get(b.id) || 0;
      return {
        ...b,
        days,
        rentalBase,
        protectionRevenue,
        upgradeRevenue,
        youngDriverFee,
        deliveryFee,
        dropoffFee,
        tableAddOnRevenue,
        extrasRevenue,
        collected,
        isDelivery: !!b.pickup_address,
        isWalkIn: b.booking_source === "walk_in",
      };
    });
  }, [bookings, paidMap, addOnsByBooking, categoryNameMap]);

  // Location summary
  const locationSummary = useMemo(() => {
    const summary = locations.map((loc: any) => {
      const bks = enriched.filter((b) => b.location_id === loc.id);
      const bookings = bks.length;
      const totalDays = bks.reduce((s, b) => s + b.days, 0);
      const rentalBase = bks.reduce((s, b) => s + b.rentalBase, 0);
      const subtotal = bks.reduce((s, b) => s + (b.subtotal || 0), 0);
      const tax = bks.reduce((s, b) => s + (b.tax_amount || 0), 0);
      const totalBilled = bks.reduce((s, b) => s + (b.total_amount || 0), 0);
      const collected = bks.reduce((s, b) => s + b.collected, 0);
      const deposits = bks.reduce((s, b) => s + (b.deposit_amount || 0), 0);
      const protection = bks.reduce((s, b) => s + b.protectionRevenue, 0);
      const upgrades = bks.reduce((s, b) => s + b.upgradeRevenue, 0);
      const youngDriver = bks.reduce((s, b) => s + b.youngDriverFee, 0);
      const delivery = bks.reduce((s, b) => s + b.deliveryFee, 0);
      const dropoff = bks.reduce((s, b) => s + b.dropoffFee, 0);
      const tableAddOns = bks.reduce((s, b) => s + b.tableAddOnRevenue, 0);
      const extras = bks.reduce((s, b) => s + b.extrasRevenue, 0);
      const walkIns = bks.filter((b) => b.isWalkIn).length;
      const deliveries = bks.filter((b) => b.isDelivery).length;
      const paidOnline = bks.filter((b) => !!b.wl_transaction_id).length;
      return {
        id: loc.id,
        name: loc.name,
        bookings,
        totalDays,
        avgDays: bookings > 0 ? totalDays / bookings : 0,
        avgDailyRate:
          totalDays > 0 ? rentalBase / totalDays : 0,
        avgBookingValue: bookings > 0 ? totalBilled / bookings : 0,
        rentalBase,
        subtotal,
        tax,
        totalBilled,
        collected,
        deposits,
        protection,
        upgrades,
        youngDriver,
        delivery,
        dropoff,
        tableAddOns,
        extras,
        walkIns,
        onlineBookings: bookings - walkIns,
        deliveries,
        pickups: bookings - deliveries,
        paidOnline,
        payLater: bookings - paidOnline,
      };
    });
    return summary.sort((a, b) => b.collected - a.collected);
  }, [locations, enriched]);

  const totals = useMemo(() => {
    const t = locationSummary.reduce(
      (acc, l) => {
        acc.bookings += l.bookings;
        acc.totalDays += l.totalDays;
        acc.rentalBase += l.rentalBase;
        acc.subtotal += l.subtotal;
        acc.tax += l.tax;
        acc.totalBilled += l.totalBilled;
        acc.collected += l.collected;
        acc.deposits += l.deposits;
        acc.protection += l.protection;
        acc.upgrades += l.upgrades;
        acc.youngDriver += l.youngDriver;
        acc.delivery += l.delivery;
        acc.dropoff += l.dropoff;
        acc.tableAddOns += l.tableAddOns;
        acc.extras += l.extras;
        acc.walkIns += l.walkIns;
        acc.deliveries += l.deliveries;
        acc.paidOnline += l.paidOnline;
        return acc;
      },
      {
        bookings: 0,
        totalDays: 0,
        rentalBase: 0,
        subtotal: 0,
        tax: 0,
        totalBilled: 0,
        collected: 0,
        deposits: 0,
        protection: 0,
        upgrades: 0,
        youngDriver: 0,
        delivery: 0,
        dropoff: 0,
        tableAddOns: 0,
        extras: 0,
        walkIns: 0,
        deliveries: 0,
        paidOnline: 0,
      }
    );
    return t;
  }, [locationSummary]);

  // Daily x Location matrix
  const days = useMemo(
    () => eachDayOfInterval({ start: startDate, end: endDate }),
    [startDate, endDate]
  );

  const dailyMatrix = useMemo(() => {
    return days.map((day) => {
      const dStart = startOfDay(day);
      const dEnd = endOfDay(day);
      const dayBks = enriched.filter((b) => {
        const t = new Date(b.start_at);
        return t >= dStart && t <= dEnd;
      });
      const perLoc: Record<string, { bookings: number; revenue: number; collected: number }> = {};
      locationSummary.forEach((l) => {
        perLoc[l.id] = { bookings: 0, revenue: 0, collected: 0 };
      });
      dayBks.forEach((b) => {
        if (!perLoc[b.location_id]) {
          perLoc[b.location_id] = { bookings: 0, revenue: 0, collected: 0 };
        }
        perLoc[b.location_id].bookings++;
        perLoc[b.location_id].revenue += b.total_amount || 0;
        perLoc[b.location_id].collected += b.collected;
      });
      return {
        date: day,
        label: format(day, "EEE MMM d"),
        totalBookings: dayBks.length,
        totalRevenue: dayBks.reduce((s, b) => s + (b.total_amount || 0), 0),
        totalCollected: dayBks.reduce((s, b) => s + b.collected, 0),
        perLoc,
      };
    });
  }, [days, enriched, locationSummary]);

  // Day-of-week demand
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowData = useMemo(() => {
    const counts = new Array(7).fill(0).map(() => ({ bookings: 0, revenue: 0 }));
    enriched.forEach((b) => {
      const d = getDay(new Date(b.start_at));
      counts[d].bookings++;
      counts[d].revenue += b.total_amount || 0;
    });
    return dowNames.map((n, i) => ({
      day: n,
      bookings: counts[i].bookings,
      revenue: Math.round(counts[i].revenue),
    }));
  }, [enriched]);

  // Trend across the period (daily)
  const trend = useMemo(
    () =>
      dailyMatrix.map((d) => ({
        date: format(d.date, "MMM d"),
        bookings: d.totalBookings,
        revenue: Math.round(d.totalRevenue),
        collected: Math.round(d.totalCollected),
      })),
    [dailyMatrix]
  );

  // Add-on breakdown per location
  const addOnsByLoc = useMemo(() => {
    const map = new Map<string, Map<string, { count: number; revenue: number }>>();
    enriched.forEach((b) => {
      if (!map.has(b.location_id)) map.set(b.location_id, new Map());
      const locMap = map.get(b.location_id)!;
      const bumps: Array<[string, number]> = [];
      if (b.protectionRevenue > 0) bumps.push(["Protection", b.protectionRevenue]);
      if (b.upgradeRevenue > 0) bumps.push(["Vehicle Upgrade", b.upgradeRevenue]);
      if (b.youngDriverFee > 0) bumps.push(["Young Driver Fee", b.youngDriverFee]);
      if (b.deliveryFee > 0) bumps.push(["Delivery", b.deliveryFee]);
      if (b.dropoffFee > 0) bumps.push(["Different Drop-off", b.dropoffFee]);
      (addOnsByBooking.get(b.id) || []).forEach((a) => bumps.push([a.name, a.price]));
      bumps.forEach(([name, amount]) => {
        const cur = locMap.get(name) || { count: 0, revenue: 0 };
        cur.count++;
        cur.revenue += amount;
        locMap.set(name, cur);
      });
    });
    return map;
  }, [enriched, addOnsByBooking]);

  const exportCsv = () => {
    const header = [
      "date",
      ...locationSummary.map((l) => `${l.name} bookings`),
      ...locationSummary.map((l) => `${l.name} revenue`),
      ...locationSummary.map((l) => `${l.name} collected`),
      "total bookings",
      "total revenue",
      "total collected",
    ];
    const rows = dailyMatrix.map((d) => [
      format(d.date, "yyyy-MM-dd"),
      ...locationSummary.map((l) => d.perLoc[l.id]?.bookings ?? 0),
      ...locationSummary.map((l) => (d.perLoc[l.id]?.revenue ?? 0).toFixed(2)),
      ...locationSummary.map((l) => (d.perLoc[l.id]?.collected ?? 0).toFixed(2)),
      d.totalBookings,
      d.totalRevenue.toFixed(2),
      d.totalCollected.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `location-daily-report-${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = bookingsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Headline totals */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Revenue Ledger — {periodLabel}
              </CardTitle>
              <CardDescription>
                Every revenue line, aggregated across all locations
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
            <Stat label="Bookings" value={totals.bookings.toString()} />
            <Stat label="Rental Days" value={totals.totalDays.toString()} />
            <Stat label="Rental Base" value={money(totals.rentalBase)} />
            <Stat label="Protection" value={money(totals.protection)} />
            <Stat label="Upgrades" value={money(totals.upgrades)} />
            <Stat label="Young Driver" value={money(totals.youngDriver)} />
            <Stat label="Delivery" value={money(totals.delivery)} />
            <Stat label="Drop-off Fees" value={money(totals.dropoff)} />
            <Stat label="Extra Add-ons" value={money(totals.tableAddOns)} />
            <Stat label="Tax (GST/PST)" value={money(totals.tax)} />
            <Stat label="Subtotal" value={money(totals.subtotal)} />
            <Stat label="Total Billed" value={money(totals.totalBilled)} highlight />
            <Stat label="Collected (paid)" value={money(totals.collected)} highlight />
            <Stat label="Deposits Held" value={money(totals.deposits)} />
            <Stat label="Walk-ins" value={totals.walkIns.toString()} />
            <Stat label="Delivery Bookings" value={totals.deliveries.toString()} />
            <Stat label="Paid Online" value={totals.paidOnline.toString()} />
            <Stat
              label="Avg Booking Value"
              value={money(totals.bookings > 0 ? totals.totalBilled / totals.bookings : 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-location summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Per-Location Summary
          </CardTitle>
          <CardDescription>Ranked by collected revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Avg Days</TableHead>
                    <TableHead className="text-right">Avg Daily Rate</TableHead>
                    <TableHead className="text-right">Avg Booking $</TableHead>
                    <TableHead className="text-right">Rental Base</TableHead>
                    <TableHead className="text-right">Add-ons/Extras</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total Billed</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Deposits</TableHead>
                    <TableHead className="text-right">Walk-in %</TableHead>
                    <TableHead className="text-right">Delivery %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationSummary.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-right">{l.bookings}</TableCell>
                      <TableCell className="text-right">{l.totalDays}</TableCell>
                      <TableCell className="text-right">{l.avgDays.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{money(l.avgDailyRate)}</TableCell>
                      <TableCell className="text-right">{money(l.avgBookingValue)}</TableCell>
                      <TableCell className="text-right">{money(l.rentalBase)}</TableCell>
                      <TableCell className="text-right">{money(l.extras)}</TableCell>
                      <TableCell className="text-right">{money(l.tax)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {money(l.totalBilled)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {money(l.collected)}
                      </TableCell>
                      <TableCell className="text-right">{money(l.deposits)}</TableCell>
                      <TableCell className="text-right">
                        {l.bookings > 0 ? ((l.walkIns / l.bookings) * 100).toFixed(0) : 0}%
                      </TableCell>
                      <TableCell className="text-right">
                        {l.bookings > 0
                          ? ((l.deliveries / l.bookings) * 100).toFixed(0)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                  {locationSummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center text-muted-foreground py-6">
                        {isLoading ? "Loading…" : "No bookings in this period."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Trend across the period */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Daily Bookings & Revenue Trend
            </CardTitle>
            <CardDescription>All locations combined</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis yAxisId="left" fontSize={10} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    fontSize={10}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="bookings"
                    fill="hsl(var(--primary))"
                    radius={3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="collected"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Day-of-Week Demand</CardTitle>
            <CardDescription>Pickups by weekday (all locations)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily x Location matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Breakdown by Location</CardTitle>
          <CardDescription>
            Bookings and collected revenue per day, split by location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div style={{ minWidth: Math.max(700, 220 + locationSummary.length * 180) }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {locationSummary.map((l) => (
                      <TableHead key={l.id} className="text-right">
                        {l.name}
                        <div className="text-[10px] font-normal text-muted-foreground">
                          bookings · collected
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Day Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyMatrix.map((d) => (
                    <TableRow key={d.label}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {d.label}
                      </TableCell>
                      {locationSummary.map((l) => {
                        const cell = d.perLoc[l.id] || {
                          bookings: 0,
                          revenue: 0,
                          collected: 0,
                        };
                        return (
                          <TableCell key={l.id} className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {cell.bookings}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {money(cell.collected)}
                              </span>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Badge className="text-[10px]">{d.totalBookings}</Badge>
                          <span>{money(d.totalCollected)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add-ons per location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Add-ons & Extras by Location
          </CardTitle>
          <CardDescription>
            Attach counts and revenue per add-on, per location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {locationSummary.map((l) => {
            const locMap = addOnsByLoc.get(l.id) || new Map();
            const items = Array.from(locMap.entries())
              .map(([name, s]: [string, any]) => ({
                name,
                count: s.count,
                revenue: s.revenue,
                attach: l.bookings > 0 ? (s.count / l.bookings) * 100 : 0,
              }))
              .sort((a, b) => b.revenue - a.revenue);
            if (items.length === 0) return null;
            return (
              <div key={l.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.bookings} bookings · {money(l.extras)} extras revenue
                  </p>
                </div>
                <div className="space-y-1">
                  {items.map((it) => (
                    <div key={it.name} className="flex items-center gap-3">
                      <span className="text-xs w-40 truncate">{it.name}</span>
                      <Progress value={Math.min(it.attach, 100)} className="flex-1 h-2" />
                      <span className="text-xs w-16 text-right">{it.attach.toFixed(0)}%</span>
                      <span className="text-xs w-24 text-right font-medium">
                        {money2(it.revenue)}
                      </span>
                      <span className="text-xs w-14 text-right text-muted-foreground">
                        ×{it.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {locationSummary.every((l) => (addOnsByLoc.get(l.id)?.size || 0) === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No add-ons attached in this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "bg-primary/5 border-primary/30" : "bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
