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
  
  X,
  ChevronRight,
  ChevronDown,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useAdminAlerts,
  useResolveAlert,
  useAcknowledgeAlert,
  useBulkResolveAlerts,
  getAlertPriority,
  type AdminAlert,
} from "@/hooks/use-alerts";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

import { CollapsibleSection } from "@/components/admin/ops/sections/CollapsibleSection";

const alertTypeLabels: Record<string, string> = {
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
  acknowledged: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const priorityConfig = {
  critical: { label: "Critical", icon: AlertTriangle, color: "text-destructive" },
  action: { label: "Action Needed", icon: Clock, color: "text-amber-500" },
  info: { label: "Informational", icon: Info, color: "text-muted-foreground" },
};

function AlertRow({
  alert,
  onView,
  onAcknowledge,
  onResolve,
  isAcknowledging,
  isResolving,
}: {
  alert: AdminAlert;
  onView: (a: AdminAlert) => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  isAcknowledging: boolean;
  isResolving: boolean;
}) {
  const TypeIcon = alertTypeIcons[alert.alertType] || Info;
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="py-2">
        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${statusColors[alert.status]}`}>
          {alert.status}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{alert.title}</p>
            {alert.message && (
              <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2 hidden md:table-cell">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {alertTypeLabels[alert.alertType] || alert.alertType}
        </span>
      </TableCell>
      <TableCell className="py-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
        </span>
      </TableCell>
      <TableCell className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onView(alert)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View details</TooltipContent>
          </Tooltip>
          {alert.status === "pending" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onAcknowledge(alert.id)} disabled={isAcknowledging}>
                  Ack
                </Button>
              </TooltipTrigger>
              <TooltipContent>Acknowledge alert</TooltipContent>
            </Tooltip>
          )}
          {alert.status !== "resolved" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="sm" className="h-7 px-2" onClick={() => onResolve(alert.id)} disabled={isResolving}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark as resolved</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}


/** Rows shown per group before "Show all". */
const PAGE_SIZE = 8;

export default function AdminAlerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "");
  const [showResolved, setShowResolved] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});


  const { data: alerts = [], isLoading, refetch } = useAdminAlerts({
    status: statusFilter as any || undefined,
    alertType: typeFilter as any || undefined,
    includeResolved: showResolved,
  });

  const resolveAlert = useResolveAlert();
  const acknowledgeAlert = useAcknowledgeAlert();
  const bulkResolve = useBulkResolveAlerts();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({ title: "Alerts refreshed" });
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
      toast({ title: "Alert resolved" });
      if (selectedAlert?.id === alertId) setSelectedAlert(null);
    } catch {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
      toast({ title: "Alert acknowledged" });
    } catch {
      toast({ title: "Failed to acknowledge", variant: "destructive" });
    }
  };

  const handleBulkResolve = async () => {
    const unresolvedIds = alerts.filter((a) => a.status !== "resolved").map((a) => a.id);
    if (unresolvedIds.length === 0) return;
    try {
      await bulkResolve.mutateAsync(unresolvedIds);
      toast({ title: `${unresolvedIds.length} alert(s) resolved` });
    } catch {
      toast({ title: "Failed to bulk resolve", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setSearchParams({});
  };

  const hasFilters = statusFilter || typeFilter;

  // Group alerts by priority. Lifecycle notices (activation, completion,
  // cancellation) are always informational — never Critical or Action Needed.
  const criticalAlerts = alerts.filter((a) => getAlertPriority(a.alertType, a) === "critical");
  const actionAlerts = alerts.filter((a) => getAlertPriority(a.alertType, a) === "action");
  const infoAlerts = alerts.filter((a) => getAlertPriority(a.alertType, a) === "info");
  const pendingCount = [...criticalAlerts, ...actionAlerts].filter((a) => a.status === "pending").length;

  const renderAlertTable = (groupAlerts: AdminAlert[], groupKey: string) => {
    if (groupAlerts.length === 0) return null;
    const limit = expandedGroups[groupKey] ? groupAlerts.length : PAGE_SIZE;
    const visible = groupAlerts.slice(0, limit);
    return (
      <div className="border-t border-border overflow-x-auto">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px] h-9 text-xs">Status</TableHead>
              <TableHead className="h-9 text-xs">Alert</TableHead>
              <TableHead className="w-[130px] h-9 text-xs hidden md:table-cell">Type</TableHead>
              <TableHead className="w-[110px] h-9 text-xs">Created</TableHead>
              <TableHead className="w-[130px] h-9 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onView={setSelectedAlert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                isAcknowledging={acknowledgeAlert.isPending}
                isResolving={resolveAlert.isPending}
              />
            ))}
          </TableBody>
        </Table>
        {groupAlerts.length > PAGE_SIZE && (
          <div className="p-2 text-center border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() =>
                setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
              }
            >
              {expandedGroups[groupKey]
                ? "Show less"
                : `Show all ${groupAlerts.length}`}
            </Button>
          </div>
        )}
      </div>
    );
  };


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
          <div className="flex items-center gap-2">
            {alerts.filter((a) => a.status !== "resolved").length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkResolve}
                disabled={bulkResolve.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh alerts</TooltipContent>
            </Tooltip>
          </div>
        </div>


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

          <div className="flex items-center gap-2 ml-auto">
            <Switch id="show-resolved" checked={showResolved} onCheckedChange={setShowResolved} />
            <Label htmlFor="show-resolved" className="text-sm text-muted-foreground">
              Show resolved
            </Label>
          </div>
        </div>

        {/* Grouped Alerts */}
        {isLoading ? (
          <div className="border border-border rounded-2xl overflow-hidden bg-card p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="border border-border rounded-2xl overflow-hidden bg-card p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No alerts found</h3>
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "Try adjusting your filters" : "All caught up!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Critical */}
            {criticalAlerts.length > 0 && (
              <div className="border border-destructive/20 rounded-2xl overflow-hidden bg-card">
                <CollapsibleSection
                  title={`Critical (${criticalAlerts.length})`}
                  icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                  defaultOpen={true}
                  badge={
                    <Badge variant="destructive" className="text-xs">
                      {criticalAlerts.length}
                    </Badge>
                  }
                >
                  {renderAlertTable(criticalAlerts, "critical")}
                </CollapsibleSection>
              </div>
            )}

            {/* Action Needed */}
            {actionAlerts.length > 0 && (
              <div className="border border-amber-500/20 rounded-2xl overflow-hidden bg-card">
                <CollapsibleSection
                  title={`Action Needed (${actionAlerts.length})`}
                  icon={<Clock className="h-4 w-4 text-amber-500" />}
                  defaultOpen={true}
                  badge={
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {actionAlerts.length}
                    </Badge>
                  }
                >
                  {renderAlertTable(actionAlerts, "action")}
                </CollapsibleSection>
              </div>
            )}

            {/* Informational */}
            {infoAlerts.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden bg-card">
                <CollapsibleSection
                  title={`Informational (${infoAlerts.length})`}
                  icon={<Info className="h-4 w-4 text-muted-foreground" />}
                  defaultOpen={false}
                  badge={
                    <Badge variant="outline" className="text-xs">
                      {infoAlerts.length}
                    </Badge>
                  }
                >
                  {renderAlertTable(infoAlerts, "info")}
                </CollapsibleSection>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Alert Detail Sheet */}
      <Sheet open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <SheetContent className="sm:max-w-lg">
          {selectedAlert && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Badge variant="outline" className={statusColors[selectedAlert.status]}>
                    {selectedAlert.status}
                  </Badge>
                  <span>{alertTypeLabels[selectedAlert.alertType]}</span>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">{selectedAlert.title}</h3>
                  {selectedAlert.message && (
                    <p className="text-muted-foreground">{selectedAlert.message}</p>
                  )}
                </div>

                <Separator />

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
                  {selectedAlert.expiresAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
                      <span>{format(new Date(selectedAlert.expiresAt), "PPp")}</span>
                    </div>
                  )}
                </div>

                <Separator />

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
                      to={`/admin/fleet?vehicle=${selectedAlert.vehicleId}`}
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
