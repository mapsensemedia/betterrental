import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { useDamageReports, useDamageById, useUpdateDamage } from "@/hooks/use-damages";
import { useLocations } from "@/hooks/use-locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Car, 
  Search, 
  ExternalLink,
  DollarSign,
  ImageIcon,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DamageSeverity = Database["public"]["Enums"]["damage_severity"];

const SEVERITY_STYLES: Record<DamageSeverity, { label: string; className: string }> = {
  minor: { label: "Minor", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  moderate: { label: "Moderate", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  severe: { label: "Severe", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  under_review: { label: "Under Review", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  resolved: { label: "Resolved", className: "bg-green-500/10 text-green-600 border-green-500/20" },
};

export default function AdminDamages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");

  const { data: damages, isLoading } = useDamageReports({
    status: statusFilter as any,
    severity: severityFilter as DamageSeverity | "all",
    locationId: locationFilter || undefined,
  });
  const { data: locations } = useLocations();
  const { data: selectedDamage, isLoading: isLoadingDetail } = useDamageById(selectedId);
  const updateDamage = useUpdateDamage();

  const filteredDamages = damages?.filter(d => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      d.description.toLowerCase().includes(search) ||
      d.booking?.bookingCode.toLowerCase().includes(search) ||
      d.vehicle?.make.toLowerCase().includes(search) ||
      d.vehicle?.model.toLowerCase().includes(search)
    );
  });

  const openDetail = (id: string) => {
    setSearchParams({ id });
    setResolutionNotes("");
    setEstimatedCost("");
  };

  const closeDetail = () => {
    setSearchParams({});
  };

  const handleStatusChange = (status: string) => {
    if (!selectedId) return;
    updateDamage.mutate({
      damageId: selectedId,
      status,
      resolutionNotes: resolutionNotes || undefined,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
    });
  };

  const handleAddToBilling = () => {
    if (!selectedDamage?.booking_id) return;
    navigate(`/admin/billing?booking=${selectedDamage.booking_id}&adjustment=damage&amount=${estimatedCost || selectedDamage.estimated_cost || ""}`);
  };

  // Group photos by phase
  const pickupPhotos = selectedDamage?.photos?.filter((p: any) => p.phase === "pickup") || [];
  const returnPhotos = selectedDamage?.photos?.filter((p: any) => p.phase === "return") || [];

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Damages</h1>
            <p className="text-muted-foreground">Track and manage damage reports</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search damages..."
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
              <SelectItem value="severe">Severe</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter || "all"} onValueChange={(v) => setLocationFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !filteredDamages?.length ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDamages.map((damage) => {
                    const severityStyle = SEVERITY_STYLES[damage.severity];
                    const statusStyle = STATUS_STYLES[damage.status] || STATUS_STYLES.under_review;

                    return (
                      <TableRow key={damage.id} className="cursor-pointer hover:bg-muted/50">
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
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
                            {damage.locationOnVehicle}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(damage.createdAt), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetail(damage.id)}>
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Damage Report Details</SheetTitle>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : selectedDamage ? (
            <div className="mt-6 space-y-6">
              {/* Status & Severity */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={SEVERITY_STYLES[selectedDamage.severity as DamageSeverity]?.className}>
                  {SEVERITY_STYLES[selectedDamage.severity as DamageSeverity]?.label || selectedDamage.severity}
                </Badge>
                <Badge variant="outline" className={STATUS_STYLES[selectedDamage.status]?.className}>
                  {STATUS_STYLES[selectedDamage.status]?.label || selectedDamage.status}
                </Badge>
              </div>

              {/* Vehicle & Booking */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Related Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">
                      {selectedDamage.vehicles?.make} {selectedDamage.vehicles?.model} ({selectedDamage.vehicles?.year})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Booking</span>
                    <Link 
                      to={`/admin/bookings?id=${selectedDamage.booking_id}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {selectedDamage.bookings?.booking_code}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location on Vehicle</span>
                    <span>{selectedDamage.location_on_vehicle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reported</span>
                    <span>{format(new Date(selectedDamage.created_at), "MMM d, yyyy HH:mm")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedDamage.description}</p>
                </CardContent>
              </Card>

              {/* Evidence Compare */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Photo Evidence Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Pickup Photos</p>
                      {pickupPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {pickupPhotos.slice(0, 4).map((photo: any) => (
                            <div key={photo.id} className="aspect-square rounded-lg bg-muted overflow-hidden">
                              <img 
                                src={photo.photo_url} 
                                alt={photo.photo_type}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">No photos</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Return Photos</p>
                      {returnPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {returnPhotos.slice(0, 4).map((photo: any) => (
                            <div key={photo.id} className="aspect-square rounded-lg bg-muted overflow-hidden">
                              <img 
                                src={photo.photo_url} 
                                alt={photo.photo_type}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">No photos</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost & Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Resolution Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Estimated Cost</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={estimatedCost || selectedDamage.estimated_cost || ""}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Resolution Notes</label>
                    <Textarea
                      placeholder="Add notes about the damage resolution..."
                      value={resolutionNotes || selectedDamage.resolution_notes || ""}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {selectedDamage.status !== "resolved" && (
                  <>
                    {selectedDamage.status === "under_review" && (
                      <Button onClick={() => handleStatusChange("confirmed")}>
                        Confirm Damage
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => handleStatusChange("resolved")}
                    >
                      Mark Resolved
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={handleAddToBilling}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Add Charge to Billing
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
