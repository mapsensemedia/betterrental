/**
 * Audit Logs Page for Admin Dashboard
 * Shows complete changelog: who changed, what changed, when
 * Useful for disputes and staff control
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import {
  History,
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  FileText,
  Car,
  CreditCard,
  Shield,
  Camera,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs, useAuditStats, type AuditLog } from "@/hooks/use-audit-logs";
import { format, formatDistanceToNow } from "date-fns";

// Action icons and colors
const ACTION_CONFIG: Record<string, { icon: typeof History; color: string; bgColor: string }> = {
  booking_created: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  booking_status_change: { icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  booking_updated: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  payment_received: { icon: CreditCard, color: "text-green-500", bgColor: "bg-green-500/10" },
  payment_created: { icon: CreditCard, color: "text-green-500", bgColor: "bg-green-500/10" },
  verification_approved: { icon: Shield, color: "text-green-500", bgColor: "bg-green-500/10" },
  verification_rejected: { icon: Shield, color: "text-destructive", bgColor: "bg-destructive/10" },
  verification_submitted: { icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  vehicle_assigned: { icon: Car, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  vehicle_updated: { icon: Car, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  photo_uploaded: { icon: Camera, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  damage_reported: { icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10" },
  receipt_created: { icon: CreditCard, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  receipt_issued: { icon: CreditCard, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  default: { icon: History, color: "text-muted-foreground", bgColor: "bg-muted" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] || ACTION_CONFIG.default;
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Diff viewer for old/new data
function DataDiff({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (!oldData && !newData) return null;

  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  const changes = Array.from(allKeys).filter((key) => {
    const oldVal = JSON.stringify(oldData?.[key]);
    const newVal = JSON.stringify(newData?.[key]);
    return oldVal !== newVal;
  });

  if (changes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No changes detected</p>
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((key) => (
        <div key={key} className="text-xs font-mono">
          <span className="font-medium text-foreground">{key}:</span>
          {oldData?.[key] !== undefined && (
            <span className="text-destructive line-through ml-2">
              {JSON.stringify(oldData[key])}
            </span>
          )}
          {newData?.[key] !== undefined && (
            <span className="text-green-600 ml-2">
              {JSON.stringify(newData[key])}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// Single audit log item
function AuditLogItem({ log }: { log: AuditLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = getActionConfig(log.action);
  const Icon = config.icon;

  const hasChanges = log.oldData || log.newData;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-start gap-4 text-left">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{formatActionLabel(log.action)}</span>
                <Badge variant="outline" className="text-xs">
                  {log.entityType}
                </Badge>
                {log.entityId && (
                  <span className="text-xs text-muted-foreground font-mono">
                    #{log.entityId.slice(0, 8)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{log.userName || log.userEmail || log.userId?.slice(0, 8) || "System"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Expand indicator */}
            {hasChanges && (
              <div className="shrink-0">
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            )}
          </button>
        </CollapsibleTrigger>

        {hasChanges && (
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t mt-0">
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Changes</p>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm:ss a")}
                  </span>
                </div>
                <DataDiff oldData={log.oldData} newData={log.newData} />
                {log.entityType === "booking" && log.entityId && (
                  <Link
                    to={`/admin/bookings/${log.entityId}/ops`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    View Booking <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export default function AdminAuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch, isRefetching } = useAuditLogs({ limit: 200 });
  const { data: stats } = useAuditStats();

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Entity filter
      if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
      
      // Action filter
      if (actionFilter !== "all" && log.action !== actionFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          log.action,
          log.entityType,
          log.entityId,
          log.userName,
          log.userEmail,
          JSON.stringify(log.newData),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(query);
      }

      return true;
    });
  }, [logs, entityFilter, actionFilter, searchQuery]);

  // Get unique entity types and actions for filters
  const entityTypes = useMemo(() => {
    const types = new Set(logs.map((l) => l.entityType));
    return Array.from(types).sort();
  }, [logs]);

  const actionTypes = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return Array.from(actions).sort();
  }, [logs]);

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track all admin changes: who, what, when
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last 24h</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entity Types</p>
                  <p className="text-2xl font-bold">{entityTypes.length}</p>
                </div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Action Types</p>
                  <p className="text-2xl font-bold">{actionTypes.length}</p>
                </div>
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {formatActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => <AuditLogItem key={log.id} log={log} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No audit logs found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || entityFilter !== "all" || actionFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Admin actions will appear here"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results count */}
        {filteredLogs.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredLogs.length} of {logs.length} logs
          </p>
        )}
      </div>
    </AdminShell>
  );
}
