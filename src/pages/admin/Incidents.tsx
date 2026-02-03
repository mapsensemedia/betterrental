/**
 * Incidents Management - Accident & Damage Case Summary
 * Quick overview with link to Support Panel for full case management
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDamageReports } from "@/hooks/use-damages";
import { CreateIncidentDialog } from "@/components/admin/CreateIncidentDialog";

// Incident severity and status styles
const INCIDENT_SEVERITY_STYLES: Record<string, { label: string; className: string }> = {
  minor: { label: "Minor", className: "bg-warning/10 text-warning border-warning/20" },
  moderate: { label: "Moderate", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  major: { label: "Major", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const INCIDENT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  reported: { label: "Reported", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  investigating: { label: "Investigating", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  claim_filed: { label: "Claim Filed", className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  in_repair: { label: "In Repair", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  resolved: { label: "Resolved", className: "bg-success/10 text-success border-success/20" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-border" },
};

// Fetch incident cases with their linked support tickets
function useIncidentCasesWithTickets() {
  return useQuery({
    queryKey: ["incident-cases-with-tickets"],
    queryFn: async () => {
      // Fetch incidents
      const { data: incidents, error: incidentsError } = await supabase
        .from("incident_cases")
        .select(`
          *,
          bookings (id, booking_code)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (incidentsError) throw incidentsError;
      
      // Fetch support tickets for these incidents
      const incidentIds = (incidents || []).map(i => i.id);
      const { data: tickets } = incidentIds.length > 0
        ? await (supabase.from("support_tickets_v2") as any)
            .select("id, ticket_id, incident_id, status")
            .in("incident_id", incidentIds)
        : { data: [] };
      
      const ticketMap = new Map((tickets || []).map((t: any) => [t.incident_id, t]));
      
      // Fetch category info for vehicle_id
      const vehicleIds = [...new Set((incidents || []).map(i => i.vehicle_id).filter(Boolean))];
      const { data: categories } = vehicleIds.length > 0
        ? await supabase.from("vehicle_categories").select("id, name").in("id", vehicleIds)
        : { data: [] };
      
      const categoryMap = new Map((categories || []).map(c => [c.id, c]));
      
      return (incidents || []).map(incident => ({
        ...incident,
        support_ticket: ticketMap.get(incident.id) || null,
        category: categoryMap.get(incident.vehicle_id),
      }));
    },
  });
}

export default function AdminIncidents() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: incidents = [], isLoading, refetch } = useIncidentCasesWithTickets();
  const { data: damages = [] } = useDamageReports({});

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast.success("Incidents refreshed");
  };

  // Stats
  const stats = {
    openIncidents: incidents.filter((i: any) => !["resolved", "closed"].includes(i.status)).length,
    majorIncidents: incidents.filter((i: any) => i.severity === "major" && !["resolved", "closed"].includes(i.status)).length,
    pendingClaims: incidents.filter((i: any) => i.claim_required && !i.claim_number).length,
    openDamages: damages?.filter((d: any) => d.status !== "closed").length || 0,
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Incidents & Damages</h1>
            <p className="text-muted-foreground text-sm">
              Quick overview — manage all cases in the Support Panel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" asChild className="gap-2">
              <Link to="/support?category=incident">
                <MessageSquare className="h-4 w-4" />
                Manage in Support
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Incident
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a new incident case</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openIncidents}</p>
                <p className="text-xs text-muted-foreground">Open Incidents</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.majorIncidents}</p>
                <p className="text-xs text-muted-foreground">Major Severity</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingClaims}</p>
                <p className="text-xs text-muted-foreground">Pending Claims</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openDamages}</p>
                <p className="text-xs text-muted-foreground">Open Damages</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Incidents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Incident Cases</CardTitle>
                <CardDescription>Latest incidents — click to view in Support Panel</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/support?category=incident" className="gap-1.5">
                  View All <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No incident cases found.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Incident
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.slice(0, 20).map((incident: any) => {
                    const severityStyle = INCIDENT_SEVERITY_STYLES[incident.severity] || { label: incident.severity, className: "" };
                    const statusStyle = INCIDENT_STATUS_STYLES[incident.status] || { label: incident.status, className: "" };

                    return (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <Badge variant="outline" className={severityStyle.className}>
                            {severityStyle.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyle.className}>
                            {statusStyle.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {incident.incident_type?.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell>
                          {incident.category ? (
                            <span className="font-medium">{incident.category.name}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {incident.bookings ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {incident.bookings.booking_code}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {incident.support_ticket ? (
                            <Link
                              to={`/support?id=${incident.support_ticket.id}`}
                              className="text-primary hover:underline text-xs font-mono"
                            >
                              {incident.support_ticket.ticket_id}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-xs">No ticket</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(incident.incident_date), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {incident.support_ticket && (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/support?id=${incident.support_ticket.id}`}>
                                <MessageSquare className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Open Damages Summary */}
        {stats.openDamages > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Open Damage Reports</CardTitle>
                  <CardDescription>Damages pending resolution</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/support?category=damage" className="gap-1.5">
                    View All <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {stats.openDamages} damage reports are awaiting review.{" "}
                <Link to="/support?category=damage" className="text-primary hover:underline">
                  Manage in Support Panel →
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Incident Dialog */}
      <CreateIncidentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </AdminShell>
  );
}
