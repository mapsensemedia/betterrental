/**
 * Quarterly Report Generator
 * Generates consolidated PDF/CSV with KPIs, revenue trends, fleet utilization, and cost analysis
 */
import { useState, useMemo } from "react";
import { format, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, FileSpreadsheet, Calendar, TrendingUp, DollarSign, Car, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QuarterlyReportGeneratorProps {
  open: boolean;
  onClose: () => void;
}

interface QuarterOption {
  label: string;
  value: string;
  start: Date;
  end: Date;
}

export function QuarterlyReportGenerator({ open, onClose }: QuarterlyReportGeneratorProps) {
  const quarters: QuarterOption[] = useMemo(() => {
    const opts: QuarterOption[] = [];
    for (let i = 0; i < 8; i++) {
      const d = subQuarters(new Date(), i);
      const start = startOfQuarter(d);
      const end = endOfQuarter(d);
      const q = Math.floor(start.getMonth() / 3) + 1;
      opts.push({
        label: `Q${q} ${start.getFullYear()}`,
        value: `${start.getFullYear()}-Q${q}`,
        start,
        end,
      });
    }
    return opts;
  }, []);

  const [selectedQuarter, setSelectedQuarter] = useState(quarters[0].value);
  const quarter = quarters.find((q) => q.value === selectedQuarter)!;

  // Fetch bookings for the quarter
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["quarterly-report-bookings", quarter.value],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, total_amount, daily_rate, total_days, created_at, location_id, vehicle_id, booking_source")
        .gte("created_at", quarter.start.toISOString())
        .lte("created_at", quarter.end.toISOString())
        .in("status", ["confirmed", "active", "completed"]);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch fleet cost cache
  const { data: fleetCache } = useQuery({
    queryKey: ["quarterly-fleet-cache"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fleet_cost_cache")
        .select("*")
        .eq("cache_type", "vehicle_unit");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch vehicle units
  const { data: units } = useQuery({
    queryKey: ["quarterly-units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, status");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["quarterly-locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const isLoading = bookingsLoading;

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!bookings) return null;
    const totalRevenue = bookings.reduce((s, b) => s + b.total_amount, 0);
    const totalBookings = bookings.length;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const avgDuration = totalBookings > 0
      ? bookings.reduce((s, b) => s + b.total_days, 0) / totalBookings
      : 0;
    const onlineBookings = bookings.filter((b) => (b.booking_source || "online") === "online").length;
    const onlineRate = totalBookings > 0 ? (onlineBookings / totalBookings) * 100 : 0;

    // Fleet utilization
    const totalUnits = units?.length || 1;
    const activeRentals = fleetCache?.reduce((s, c) => s + (c.rental_count || 0), 0) || 0;
    const totalRentalDays = fleetCache?.reduce((s, c) => s + (c.total_rental_days || 0), 0) || 0;
    const totalFleetRevenue = fleetCache?.reduce((s, c) => s + (c.total_rental_revenue || 0), 0) || 0;
    const totalMaintenanceCost = fleetCache?.reduce((s, c) => s + (c.total_maintenance_cost || 0), 0) || 0;
    const totalDamageCost = fleetCache?.reduce((s, c) => s + (c.total_damage_cost || 0), 0) || 0;
    const netProfit = fleetCache?.reduce((s, c) => s + (c.net_profit || 0), 0) || 0;

    // Location breakdown
    const locationBreakdown = (locations || []).map((loc) => {
      const locBookings = bookings.filter((b) => b.location_id === loc.id);
      return {
        name: loc.name,
        bookings: locBookings.length,
        revenue: locBookings.reduce((s, b) => s + b.total_amount, 0),
      };
    }).filter((l) => l.bookings > 0).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalBookings,
      avgBookingValue,
      avgDuration,
      onlineRate,
      totalUnits,
      activeRentals,
      totalRentalDays,
      totalFleetRevenue,
      totalMaintenanceCost,
      totalDamageCost,
      netProfit,
      locationBreakdown,
    };
  }, [bookings, fleetCache, units, locations]);

  const exportCSV = () => {
    if (!kpis || !bookings) return;
    const headers = ["Metric", "Value"];
    const rows = [
      ["Quarter", quarter.label],
      ["Total Revenue", `$${kpis.totalRevenue.toLocaleString()}`],
      ["Total Bookings", String(kpis.totalBookings)],
      ["Avg Booking Value", `$${kpis.avgBookingValue.toFixed(2)}`],
      ["Avg Duration (days)", kpis.avgDuration.toFixed(1)],
      ["Online Booking Rate", `${kpis.onlineRate.toFixed(1)}%`],
      ["Fleet Size", String(kpis.totalUnits)],
      ["Total Rental Days", String(kpis.totalRentalDays)],
      ["Fleet Revenue", `$${kpis.totalFleetRevenue.toLocaleString()}`],
      ["Maintenance Cost", `$${kpis.totalMaintenanceCost.toLocaleString()}`],
      ["Damage Cost", `$${kpis.totalDamageCost.toLocaleString()}`],
      ["Net Profit", `$${kpis.netProfit.toLocaleString()}`],
      [""],
      ["Location", "Bookings", "Revenue"],
      ...kpis.locationBreakdown.map((l) => [l.name, String(l.bookings), `$${l.revenue.toLocaleString()}`]),
    ];

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `quarterly-report-${quarter.value}.csv`;
    link.click();
  };

  const exportPDF = () => {
    if (!kpis) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const locationRows = kpis.locationBreakdown.map((l) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.name}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${l.bookings}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${l.revenue.toLocaleString()}</td>
      </tr>
    `).join("");

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Quarterly Report - ${quarter.label}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1a1a1a}
        h1{font-size:28px;margin-bottom:4px}
        h2{font-size:18px;margin-top:32px;color:#4b5563}
        .subtitle{color:#6b7280;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
        .card{background:#f9fafb;padding:16px;border-radius:8px}
        .card-label{font-size:12px;color:#6b7280;margin-bottom:4px}
        .card-value{font-size:24px;font-weight:600}
        .card-value.green{color:#16a34a}
        .card-value.red{color:#dc2626}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th{text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;font-weight:600;font-size:12px;text-transform:uppercase;color:#6b7280}
        @media print{body{padding:20px}}
      </style></head><body>
      <h1>Quarterly Performance Report</h1>
      <p class="subtitle">${quarter.label} — ${format(quarter.start, "MMM d, yyyy")} to ${format(quarter.end, "MMM d, yyyy")}</p>

      <h2>Revenue & Bookings</h2>
      <div class="grid">
        <div class="card"><div class="card-label">Total Revenue</div><div class="card-value">$${kpis.totalRevenue.toLocaleString()}</div></div>
        <div class="card"><div class="card-label">Total Bookings</div><div class="card-value">${kpis.totalBookings}</div></div>
        <div class="card"><div class="card-label">Avg Booking Value</div><div class="card-value">$${kpis.avgBookingValue.toFixed(0)}</div></div>
        <div class="card"><div class="card-label">Avg Duration</div><div class="card-value">${kpis.avgDuration.toFixed(1)} days</div></div>
        <div class="card"><div class="card-label">Online Rate</div><div class="card-value">${kpis.onlineRate.toFixed(1)}%</div></div>
      </div>

      <h2>Fleet Performance</h2>
      <div class="grid">
        <div class="card"><div class="card-label">Fleet Size</div><div class="card-value">${kpis.totalUnits}</div></div>
        <div class="card"><div class="card-label">Fleet Revenue</div><div class="card-value green">$${kpis.totalFleetRevenue.toLocaleString()}</div></div>
        <div class="card"><div class="card-label">Maintenance Cost</div><div class="card-value red">$${kpis.totalMaintenanceCost.toLocaleString()}</div></div>
        <div class="card"><div class="card-label">Damage Cost</div><div class="card-value red">$${kpis.totalDamageCost.toLocaleString()}</div></div>
        <div class="card"><div class="card-label">Net Profit</div><div class="card-value ${kpis.netProfit >= 0 ? 'green' : 'red'}">$${kpis.netProfit.toLocaleString()}</div></div>
        <div class="card"><div class="card-label">Total Rental Days</div><div class="card-value">${kpis.totalRentalDays}</div></div>
      </div>

      <h2>Revenue by Location</h2>
      <table><thead><tr><th>Location</th><th style="text-align:right">Bookings</th><th style="text-align:right">Revenue</th></tr></thead>
      <tbody>${locationRows}</tbody></table>

      <p style="margin-top:40px;font-size:12px;color:#9ca3af;">Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    printWindow.document.close();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Quarterly Report Generator
          </SheetTitle>
          <SheetDescription>
            Generate consolidated performance reports by quarter
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quarter Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Quarter</label>
            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarters.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label} ({format(q.start, "MMM d")} - {format(q.end, "MMM d, yyyy")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : kpis ? (
            <>
              {/* KPI Summary */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold">${kpis.totalRevenue.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Bookings</span>
                    </div>
                    <p className="text-2xl font-bold">{kpis.totalBookings}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Avg Value</span>
                    </div>
                    <p className="text-2xl font-bold">${kpis.avgBookingValue.toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Car className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Fleet Size</span>
                    </div>
                    <p className="text-2xl font-bold">{kpis.totalUnits}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Profit Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Fleet Profitability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fleet Revenue</span>
                    <span className="font-medium text-green-600">${kpis.totalFleetRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maintenance Cost</span>
                    <span className="font-medium text-destructive">-${kpis.totalMaintenanceCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage Cost</span>
                    <span className="font-medium text-destructive">-${kpis.totalDamageCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Net Profit</span>
                    <span className={`font-bold ${kpis.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
                      ${kpis.netProfit.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Location Breakdown */}
              {kpis.locationBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Revenue by Location</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {kpis.locationBreakdown.map((loc) => (
                      <div key={loc.name} className="flex items-center justify-between text-sm">
                        <span>{loc.name}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{loc.bookings} bookings</Badge>
                          <span className="font-medium">${loc.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Export Buttons */}
              <div className="flex gap-3">
                <Button onClick={exportCSV} className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={exportPDF} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
