/**
 * Support Panel - Analytics Page
 * 
 * Support performance metrics and dashboards
 */

import { useState } from "react";
import { SupportShell } from "@/components/layout/SupportShell";
import { useSupportAnalytics, useSupportTicketsV2 } from "@/hooks/use-support-v2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle,
  TrendingUp,
  Users,
  Timer,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Chart colors
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted-foreground))",
];

const CATEGORY_LABELS: Record<string, string> = {
  billing: "Billing",
  booking: "Booking",
  ops: "Operations",
  damage: "Damage",
  website_bug: "Website Bug",
  general: "General",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_customer: "Waiting",
  escalated: "Escalated",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

type DateRange = "7d" | "30d" | "90d" | "all";

// Ticket table component
function TicketTable({ tickets }: { tickets: any[] }) {
  if (!tickets?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tickets to display
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[100px]">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.slice(0, 10).map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {ticket.ticket_id}
              </code>
            </TableCell>
            <TableCell className="font-medium max-w-[200px] truncate">
              {ticket.subject}
            </TableCell>
            <TableCell>
              {ticket.customer?.full_name || ticket.guest_name || ticket.guest_email || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <Link to={`/support?id=${ticket.id}`}>
                <Button variant="ghost" size="sm">View</Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SupportAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate date range
  const getDateRange = () => {
    if (dateRange === "all") return undefined;
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return {
      from: startOfDay(subDays(new Date(), days)).toISOString(),
      to: endOfDay(new Date()).toISOString(),
    };
  };

  const { data: analytics, isLoading, refetch } = useSupportAnalytics(getDateRange());
  
  // Get urgent and escalated tickets for tables
  const { data: urgentTickets } = useSupportTicketsV2({ urgent: true, status: "all" });
  const { data: escalatedTickets } = useSupportTicketsV2({ status: "escalated" });
  const { data: unassignedTickets } = useSupportTicketsV2({ assignedTo: "unassigned", status: "all" });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Analytics refreshed");
  };

  // Format time duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <SupportShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Support Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor performance and ticket metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tickets</p>
                      <p className="text-2xl font-bold">{analytics.kpis.totalTickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Open Tickets</p>
                      <p className="text-2xl font-bold">{analytics.kpis.openTickets}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Escalated</p>
                      <p className="text-2xl font-bold">{analytics.kpis.escalatedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Flame className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Urgent</p>
                      <p className="text-2xl font-bold">{analytics.kpis.urgentCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Timer className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg First Response</p>
                      <p className="text-2xl font-bold">
                        {analytics.kpis.avgFirstResponseMins > 0
                          ? formatDuration(analytics.kpis.avgFirstResponseMins)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Resolution</p>
                      <p className="text-2xl font-bold">
                        {analytics.kpis.avgResolutionHours > 0
                          ? formatHours(analytics.kpis.avgResolutionHours)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Users className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unassigned</p>
                      <p className="text-2xl font-bold">{analytics.operational.unassigned}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10">
                      <TrendingUp className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{"> 24h Aging"}</p>
                      <p className="text-2xl font-bold">{analytics.operational.aging24h}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.byCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analytics.byCategory.map((d) => ({
                            ...d,
                            name: CATEGORY_LABELS[d.name] || d.name,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {analytics.byCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No data
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.byStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={analytics.byStatus.map((d) => ({
                          ...d,
                          name: STATUS_LABELS[d.name] || d.name,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No data
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By Priority */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.byPriority.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={analytics.byPriority.map((d) => ({
                          ...d,
                          name: PRIORITY_LABELS[d.name] || d.name,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No data
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Operational Tables */}
            <Tabs defaultValue="urgent" className="space-y-4">
              <TabsList>
                <TabsTrigger value="urgent" className="gap-1">
                  <Flame className="h-3.5 w-3.5" />
                  Urgent ({urgentTickets?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="escalated" className="gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Escalated ({escalatedTickets?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="unassigned" className="gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Unassigned ({unassignedTickets?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="urgent">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Urgent Tickets</CardTitle>
                    <CardDescription>High-priority tickets marked as urgent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TicketTable tickets={urgentTickets || []} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="escalated">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Escalated Tickets</CardTitle>
                    <CardDescription>Tickets escalated to management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TicketTable tickets={escalatedTickets || []} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="unassigned">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Unassigned Tickets</CardTitle>
                    <CardDescription>Tickets waiting to be picked up</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TicketTable tickets={unassignedTickets || []} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </SupportShell>
  );
}
