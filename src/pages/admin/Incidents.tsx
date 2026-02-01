/**
 * Incidents Management - Accident & Damage Case Tracking
 * Unified view for incident cases and damage reports
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Car,
  Search,
  RefreshCw,
  FileText,
  Wrench,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDamageReports } from "@/hooks/use-damages";
import { cn } from "@/lib/utils";
import { CreateIncidentDialog } from "@/components/admin/CreateIncidentDialog";
import { IncidentDetailDialog } from "@/components/admin/IncidentDetailDialog";

// Incident severity and status styles
const INCIDENT_SEVERITY_STYLES: Record<string, { label: string; className: string }> = {
  minor: { label: "Minor", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  moderate: { label: "Moderate", className: "bg-orange-100 text-orange-800 border-orange-200" },
  major: { label: "Major", className: "bg-red-100 text-red-800 border-red-200" },
};

const INCIDENT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  reported: { label: "Reported", className: "bg-blue-100 text-blue-800 border-blue-200" },
  investigating: { label: "Investigating", className: "bg-purple-100 text-purple-800 border-purple-200" },
  claim_filed: { label: "Claim Filed", className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  in_repair: { label: "In Repair", className: "bg-amber-100 text-amber-800 border-amber-200" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 border-green-200" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-800 border-gray-200" },
};

// Fetch incident cases
function useIncidentCases() {
  return useQuery({
    queryKey: ["incident-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_cases")
        .select(`
          *,
          vehicles (id, make, model, year),
          bookings (id, booking_code)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

export default function AdminIncidents() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("incidents");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const { data: incidents = [], isLoading: incidentsLoading, refetch: refetchIncidents } = useIncidentCases();
  const { data: damages = [], isLoading: damagesLoading } = useDamageReports({});

  // Filter incidents
  const filteredIncidents = incidents.filter((incident: any) => {
    const matchesSearch = !searchQuery || 
      incident.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.vehicles?.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.vehicles?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.bookings?.booking_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Filter damages for the damages tab
  const filteredDamages = damages?.filter((damage: any) => {
    const matchesSearch = !searchQuery || 
      damage.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      damage.vehicle?.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      damage.vehicle?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      damage.booking?.bookingCode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  }) || [];

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
              Manage accident cases, damage reports, and insurance claims
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Incident Case
            </Button>
            <Button onClick={() => refetchIncidents()} variant="outline" size="icon">
              <RefreshCw className={`h-4 w-4 ${incidentsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openIncidents}</p>
                <p className="text-xs text-muted-foreground">Open Incidents</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.majorIncidents}</p>
                <p className="text-xs text-muted-foreground">Major Severity</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="major">Major</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="claim_filed">Claim Filed</SelectItem>
              <SelectItem value="in_repair">In Repair</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="incidents" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Incident Cases
              {stats.openIncidents > 0 && (
                <Badge variant="secondary" className="text-xs">{stats.openIncidents}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="damages" className="gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Damage Reports
              {stats.openDamages > 0 && (
                <Badge variant="secondary" className="text-xs">{stats.openDamages}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Incident Cases</CardTitle>
                <CardDescription>Accident and incident case management</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {incidentsLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="p-12 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No incident cases found.</p>
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
                        <TableHead>Claim #</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncidents.map((incident: any) => {
                        const severityStyle = INCIDENT_SEVERITY_STYLES[incident.severity] || { label: incident.severity, className: "" };
                        const statusStyle = INCIDENT_STATUS_STYLES[incident.status] || { label: incident.status, className: "" };

                        return (
                          <TableRow key={incident.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedIncidentId(incident.id)}>
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
                              {incident.vehicles ? (
                                <span className="font-medium">
                                  {incident.vehicles.make} {incident.vehicles.model}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {incident.bookings ? (
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {incident.bookings.booking_code}
                                </code>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {incident.claim_number || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(incident.incident_date), "MMM d, yyyy")}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Damages Tab */}
          <TabsContent value="damages" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Damage Reports</CardTitle>
                    <CardDescription>Vehicle damage tracking from inspections</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin/damages")}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {damagesLoading ? (
                  <div className="p-6 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredDamages.length === 0 ? (
                  <div className="p-12 text-center">
                    <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No damage reports found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Booking</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Reported</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDamages.slice(0, 20).map((damage: any) => (
                        <TableRow key={damage.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/damages?id=${damage.id}`)}>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              damage.severity === "minor" && "bg-yellow-100 text-yellow-800 border-yellow-200",
                              damage.severity === "moderate" && "bg-orange-100 text-orange-800 border-orange-200",
                              damage.severity === "severe" && "bg-red-100 text-red-800 border-red-200",
                            )}>
                              {damage.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{damage.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {damage.vehicle ? (
                              <span className="font-medium">
                                {damage.vehicle.make} {damage.vehicle.model}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {damage.booking ? (
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {damage.booking.bookingCode}
                              </code>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {damage.locationOnVehicle}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(damage.createdAt), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Create Incident Dialog */}
        <CreateIncidentDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
        
        {/* Incident Detail Dialog */}
        <IncidentDetailDialog
          open={!!selectedIncidentId}
          onOpenChange={(open) => !open && setSelectedIncidentId(null)}
          incidentId={selectedIncidentId}
        />
      </div>
    </AdminShell>
  );
}
