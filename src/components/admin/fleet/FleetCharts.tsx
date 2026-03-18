/**
 * Fleet Revenue vs Cost Chart & Net Profit Trend
 * Uses real booking data grouped by month
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

const REVENUE_STATUSES = ["confirmed", "active", "completed"] as const;

interface FleetChartsProps {
  dateFrom?: string;
  dateTo?: string;
}

function useMonthlyRevenueData(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["fleet-monthly-revenue", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select("start_at, total_amount, status")
        .in("status", [...REVENUE_STATUSES]);

      if (dateFrom) query = query.gte("start_at", dateFrom);
      if (dateTo) query = query.lte("start_at", dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

function useMonthlyDamageCosts(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["fleet-monthly-damage", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("damage_reports")
        .select("created_at, estimated_cost");

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

function useMonthlyMaintenanceCosts(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["fleet-monthly-maintenance", dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("fleet_cost_cache")
        .select("calculation_period_start, total_maintenance_cost")
        .eq("cache_type", "vehicle_unit");

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatYAxis = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
};

export function FleetRevenueVsCostChart({ dateFrom, dateTo }: FleetChartsProps) {
  const { data: bookings, isLoading: loadingBookings } = useMonthlyRevenueData(dateFrom, dateTo);
  const { data: damages, isLoading: loadingDamages } = useMonthlyDamageCosts(dateFrom, dateTo);
  const { data: maintenance, isLoading: loadingMaint } = useMonthlyMaintenanceCosts(dateFrom, dateTo);

  const chartData = useMemo(() => {
    if (!bookings) return [];

    const monthMap = new Map<string, { revenue: number; damage: number; maintenance: number }>();

    // Bucket revenue by month using start_at
    for (const b of bookings) {
      const key = format(parseISO(b.start_at), "yyyy-MM");
      const entry = monthMap.get(key) || { revenue: 0, damage: 0, maintenance: 0 };
      entry.revenue += b.total_amount || 0;
      monthMap.set(key, entry);
    }

    // Bucket damage costs
    for (const d of damages || []) {
      const key = format(parseISO(d.created_at), "yyyy-MM");
      const entry = monthMap.get(key) || { revenue: 0, damage: 0, maintenance: 0 };
      entry.damage += d.estimated_cost || 0;
      monthMap.set(key, entry);
    }

    // Bucket maintenance costs
    for (const m of maintenance || []) {
      if (m.calculation_period_start) {
        const key = format(parseISO(m.calculation_period_start), "yyyy-MM");
        const entry = monthMap.get(key) || { revenue: 0, damage: 0, maintenance: 0 };
        entry.maintenance += m.total_maintenance_cost || 0;
        monthMap.set(key, entry);
      }
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({
        month: format(parseISO(`${key}-01`), "MMM yyyy"),
        revenue: Math.round(values.revenue),
        damage: Math.round(values.damage),
        maintenance: Math.round(values.maintenance),
      }));
  }, [bookings, damages, maintenance]);

  if (loadingBookings || loadingDamages || loadingMaint) {
    return <Skeleton className="h-80" />;
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Costs Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          No booking data available for the selected period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue vs Costs Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis tickFormatter={formatYAxis} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="hsl(var(--chart-2))" name="Revenue" />
            <Bar dataKey="damage" fill="hsl(var(--destructive))" name="Damage Costs" />
            <Bar dataKey="maintenance" fill="hsl(var(--chart-4))" name="Maintenance" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function FleetProfitTrendChart({ dateFrom, dateTo }: FleetChartsProps) {
  const { data: bookings, isLoading: loadingBookings } = useMonthlyRevenueData(dateFrom, dateTo);
  const { data: damages, isLoading: loadingDamages } = useMonthlyDamageCosts(dateFrom, dateTo);
  const { data: maintenance, isLoading: loadingMaint } = useMonthlyMaintenanceCosts(dateFrom, dateTo);

  const chartData = useMemo(() => {
    if (!bookings) return [];

    const monthMap = new Map<string, { revenue: number; costs: number }>();

    for (const b of bookings) {
      const key = format(parseISO(b.start_at), "yyyy-MM");
      const entry = monthMap.get(key) || { revenue: 0, costs: 0 };
      entry.revenue += b.total_amount || 0;
      monthMap.set(key, entry);
    }

    for (const d of damages || []) {
      const key = format(parseISO(d.created_at), "yyyy-MM");
      const entry = monthMap.get(key) || { revenue: 0, costs: 0 };
      entry.costs += d.estimated_cost || 0;
      monthMap.set(key, entry);
    }

    for (const m of maintenance || []) {
      if (m.calculation_period_start) {
        const key = format(parseISO(m.calculation_period_start), "yyyy-MM");
        const entry = monthMap.get(key) || { revenue: 0, costs: 0 };
        entry.costs += m.total_maintenance_cost || 0;
        monthMap.set(key, entry);
      }
    }

    let cumulative = 0;
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => {
        const profit = Math.round(values.revenue - values.costs);
        cumulative += profit;
        return {
          month: format(parseISO(`${key}-01`), "MMM yyyy"),
          profit,
          cumulative: Math.round(cumulative),
        };
      });
  }, [bookings, damages, maintenance]);

  if (loadingBookings || loadingDamages || loadingMaint) {
    return <Skeleton className="h-80" />;
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Net Profit Trend</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
          No booking data available for the selected period
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Net Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis tickFormatter={formatYAxis} className="text-xs" />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Monthly Profit"
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Cumulative"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
