import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Clock,
  Car,
  BookOpen,
  User,
  Filter,
  X,
  ChevronRight,
  Eye,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAdminAlerts, useResolveAlert, useAcknowledgeAlert, type AdminAlert } from "@/hooks/use-alerts";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { PendingVerificationsCard } from "@/components/admin/alerts/PendingVerificationsCard";

const alertTypeLabels: Record<string, string> = {
  verification_pending: "Verification Pending",
  payment_pending: "Payment Pending",
  cleaning_required: "Cleaning Required",
  damage_reported: "Damage Reported",
  late_return: "Late Return",
  hold_expiring: "Hold Expiring",
  return_due_soon: "Return Due Soon",
  overdue: "Overdue",
  customer_issue: "Customer Issue",
  emergency: "Emergency",
};

const alertTypeIcons: Record<string, typeof AlertTriangle> = {
  verification_pending: User,
  payment_pending: AlertCircle,
  cleaning_required: Car,
  damage_reported: AlertTriangle,
  late_return: Clock,
  hold_expiring: Clock,
  return_due_soon: Clock,
  overdue: AlertTriangle,
  customer_issue: Info,
  emergency: AlertTriangle,
};

const statusColors: Record<string, string> = {
  pending: "bg-destructive/10 text-destructive border-destructive/20",
  acknowledged: "bg-warning/10 text-warning border-warning/20",
  resolved: "bg-success/10 text-success border-success/20",
};

export default function AdminAlerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "");

  const { data: alerts = [], isLoading } = useAdminAlerts({
    status: statusFilter as any || undefined,
    alertType: typeFilter as any || undefined,
  });

  const resolveAlert = useResolveAlert();
  const acknowledgeAlert = useAcknowledgeAlert();

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast({ title: "Alert resolved" });
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }
    } catch (error) {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
      toast({ title: "Alert acknowledged" });
    } catch (error) {
      toast({ title: "Failed to acknowledge", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setSearchParams({});
  };

  const hasFilters = statusFilter || typeFilter;
  const pendingCount = alerts.filter(a => a.status === "pending").length;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="heading-2">Alerts</h1>
            <p className="text-muted-foreground">
              {pendingCount > 0 
                ? `${pendingCount} pending alert${pendingCount > 1 ? "s" : ""} require attention`
                : "No pending alerts"}
            </p>
          </div>
        </div>

        {/* Pending Verifications Card */}
        <PendingVerificationsCard />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(alertTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No alerts found</h3>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "Try adjusting your filters" : "All caught up!"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[140px]">Created</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const TypeIcon = alertTypeIcons[alert.alertType] || Info;
                  return (
                    <TableRow key={alert.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={statusColors[alert.status]}
                        >
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            {alert.message && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {alert.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {alertTypeLabels[alert.alertType] || alert.alertType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {alert.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              disabled={acknowledgeAlert.isPending}
                            >
                              Ack
                            </Button>
                          )}
                          {alert.status !== "resolved" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleResolve(alert.id)}
                              disabled={resolveAlert.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Alert Detail Sheet */}
      <Sheet open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <SheetContent className="sm:max-w-lg">
          {selectedAlert && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={statusColors[selectedAlert.status]}
                  >
                    {selectedAlert.status}
                  </Badge>
                  <span>{alertTypeLabels[selectedAlert.alertType]}</span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Alert Info */}
                <div>
                  <h3 className="font-semibold mb-2">{selectedAlert.title}</h3>
                  {selectedAlert.message && (
                    <p className="text-muted-foreground">{selectedAlert.message}</p>
                  )}
                </div>

                <Separator />

                {/* Metadata */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(selectedAlert.createdAt), "PPp")}</span>
                  </div>
                  {selectedAlert.acknowledgedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Acknowledged</span>
                      <span>{format(new Date(selectedAlert.acknowledgedAt), "PPp")}</span>
                    </div>
                  )}
                  {selectedAlert.resolvedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Resolved</span>
                      <span>{format(new Date(selectedAlert.resolvedAt), "PPp")}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Related Entities */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Related</h4>
                  {selectedAlert.bookingId && (
                    <Link 
                      to={`/admin/bookings/${selectedAlert.bookingId}/ops`}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">View Booking</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  )}
                  {selectedAlert.vehicleId && (
                    <Link 
                      to={`/admin/inventory?vehicle=${selectedAlert.vehicleId}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">View Vehicle</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedAlert.status === "pending" && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      disabled={acknowledgeAlert.isPending}
                    >
                      Acknowledge
                    </Button>
                  )}
                  {selectedAlert.status !== "resolved" && (
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleResolve(selectedAlert.id)}
                      disabled={resolveAlert.isPending}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
