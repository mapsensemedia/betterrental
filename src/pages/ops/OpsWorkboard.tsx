/**
 * OpsWorkboard - Daily task overview for operations staff
 */

import { useNavigate } from "react-router-dom";
import { OpsShell } from "@/components/ops/OpsShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Car, 
  ArrowRightLeft, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

interface TaskCount {
  pickupsToday: number;
  pickupsTomorrow: number;
  activeRentals: number;
  returnsExpected: number;
  overdueReturns: number;
}

function useWorkboardCounts() {
  return useQuery({
    queryKey: ["ops-workboard-counts"],
    queryFn: async (): Promise<TaskCount> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();

      const [pickupsRes, activeRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, start_at")
          .eq("status", "confirmed")
          .gte("start_at", todayStart)
          .lt("start_at", tomorrowEnd),
        supabase
          .from("bookings")
          .select("id, end_at")
          .eq("status", "active"),
      ]);

      const pickups = pickupsRes.data || [];
      const activeRentals = activeRes.data || [];

      const pickupsToday = pickups.filter((b) => {
        const d = parseISO(b.start_at);
        return isToday(d);
      }).length;

      const pickupsTomorrow = pickups.filter((b) => {
        const d = parseISO(b.start_at);
        return isTomorrow(d);
      }).length;

      const returnsExpected = activeRentals.filter((b) => {
        const d = parseISO(b.end_at);
        return isToday(d) || isTomorrow(d);
      }).length;

      const overdueReturns = activeRentals.filter((b) => {
        const d = parseISO(b.end_at);
        return d < now;
      }).length;

      return {
        pickupsToday,
        pickupsTomorrow,
        activeRentals: activeRentals.length,
        returnsExpected,
        overdueReturns,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  variant = "default",
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  href: string;
  variant?: "default" | "warning" | "success";
}) {
  const navigate = useNavigate();

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        variant === "warning" ? "border-amber-500/50" : ""
      }`}
      onClick={() => navigate(href)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`p-2 rounded-lg ${
              variant === "warning"
                ? "bg-amber-500/10 text-amber-600"
                : variant === "success"
                ? "bg-green-500/10 text-green-600"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpsWorkboard() {
  const { data: counts, isLoading } = useWorkboardCounts();
  const navigate = useNavigate();

  return (
    <OpsShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Workboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")} — Today's overview
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Pickups Today"
              value={counts?.pickupsToday || 0}
              subtitle={`+${counts?.pickupsTomorrow || 0} tomorrow`}
              icon={Car}
              href="/ops/pickups"
            />
            <StatCard
              title="Active Rentals"
              value={counts?.activeRentals || 0}
              icon={ArrowRightLeft}
              href="/ops/active"
              variant="success"
            />
            <StatCard
              title="Expected Returns"
              value={counts?.returnsExpected || 0}
              subtitle="Today & tomorrow"
              icon={RotateCcw}
              href="/ops/returns"
            />
            {(counts?.overdueReturns || 0) > 0 && (
              <StatCard
                title="Overdue"
                value={counts?.overdueReturns || 0}
                subtitle="Requires action"
                icon={AlertTriangle}
                href="/ops/returns?filter=overdue"
                variant="warning"
              />
            )}
          </div>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigate("/ops/pickups")}
            >
              <span className="flex items-center gap-2">
                <Car className="w-4 h-4" />
                Process Pickup
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigate("/ops/returns")}
            >
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Process Return
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigate("/ops/fleet")}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Check Fleet Status
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </OpsShell>
  );
}
