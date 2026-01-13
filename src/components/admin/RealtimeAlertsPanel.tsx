/**
 * Real-time alerts panel for admin dashboard
 * Shows live updates of system alerts
 */
import { useAdminAlerts } from "@/hooks/use-alerts";
import { useRealtimeAlerts } from "@/hooks/use-realtime-subscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Radio,
  FileCheck,
  Car,
  CreditCard,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";

const ALERT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  verification_pending: { icon: FileCheck, color: "text-purple-500" },
  payment_pending: { icon: CreditCard, color: "text-blue-500" },
  overdue: { icon: AlertTriangle, color: "text-destructive" },
  return_due_soon: { icon: Clock, color: "text-amber-500" },
  damage_reported: { icon: AlertTriangle, color: "text-red-500" },
  late_return: { icon: Clock, color: "text-orange-500" },
  customer_issue: { icon: Bell, color: "text-yellow-500" },
  emergency: { icon: AlertTriangle, color: "text-destructive" },
};

export function RealtimeAlertsPanel() {
  const { data: alerts = [], isLoading } = useAdminAlerts({ status: "pending" });
  const navigate = useNavigate();
  
  // Enable real-time updates
  useRealtimeAlerts();
  
  const pendingAlerts = alerts.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5" />
            Live Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-5 w-5 text-amber-500" />
            Live Alerts
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse" />
              Live
            </Badge>
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {pendingAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" />
            <p className="text-sm">No pending alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingAlerts.map((alert) => {
              const config = ALERT_TYPE_CONFIG[alert.alertType] || { icon: Bell, color: "text-muted-foreground" };
              const Icon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (alert.bookingId) {
                      navigate(`/admin/bookings/${alert.bookingId}/ops`);
                    } else {
                      navigate("/admin/alerts");
                    }
                  }}
                >
                  <div className={`shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}

            {alerts.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2" 
                asChild
              >
                <Link to="/admin/alerts">
                  View all {alerts.length} alerts
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
