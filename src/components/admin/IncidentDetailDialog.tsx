import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Car,
  Calendar,
  MapPin,
  User,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  Wrench,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { 
  useIncidentById, 
  useUpdateIncident, 
  getNextStatuses,
  type IncidentStatus,
} from "@/hooks/use-incidents";
import { cn } from "@/lib/utils";

interface IncidentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string | null;
}

const STATUS_STYLES: Record<string, { label: string; className: string; icon: any }> = {
  reported: { label: "Reported", className: "bg-blue-100 text-blue-800", icon: AlertTriangle },
  investigating: { label: "Investigating", className: "bg-purple-100 text-purple-800", icon: Clock },
  claim_filed: { label: "Claim Filed", className: "bg-indigo-100 text-indigo-800", icon: FileText },
  in_repair: { label: "In Repair", className: "bg-amber-100 text-amber-800", icon: Wrench },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800", icon: CheckCircle },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-800", icon: CheckCircle },
};

const SEVERITY_STYLES: Record<string, { label: string; className: string }> = {
  minor: { label: "Minor", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  moderate: { label: "Moderate", className: "bg-orange-100 text-orange-800 border-orange-200" },
  major: { label: "Major", className: "bg-red-100 text-red-800 border-red-200" },
};

export function IncidentDetailDialog({
  open,
  onOpenChange,
  incidentId,
}: IncidentDetailDialogProps) {
  const { data: incident, isLoading } = useIncidentById(incidentId);
  const updateIncident = useUpdateIncident();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [claimNumber, setClaimNumber] = useState("");
  const [estimateAmount, setEstimateAmount] = useState("");
  const [repairVendor, setRepairVendor] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  if (!incidentId) return null;

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    await updateIncident.mutateAsync({ id: incidentId, status: newStatus });
  };

  const handleUpdateClaim = async () => {
    await updateIncident.mutateAsync({ 
      id: incidentId, 
      claim_number: claimNumber || undefined,
    });
    setEditingSection(null);
  };

  const handleUpdateEstimate = async () => {
    await updateIncident.mutateAsync({ 
      id: incidentId, 
      estimate_amount: estimateAmount ? parseFloat(estimateAmount) : undefined,
    });
    setEditingSection(null);
  };

  const handleUpdateRepair = async () => {
    await updateIncident.mutateAsync({ 
      id: incidentId, 
      repair_vendor: repairVendor || undefined,
    });
    setEditingSection(null);
  };

  const handleUpdateNotes = async () => {
    await updateIncident.mutateAsync({ 
      id: incidentId, 
      internal_notes: internalNotes || undefined,
    });
    setEditingSection(null);
  };

  const nextStatuses = incident ? getNextStatuses(incident.status as IncidentStatus) : [];
  const statusInfo = STATUS_STYLES[incident?.status || "reported"];
  const severityInfo = SEVERITY_STYLES[incident?.severity || "minor"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", severityInfo?.className)}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg">Incident Case</span>
                {incident?.vehicles && (
                  <p className="text-sm font-normal text-muted-foreground">
                    {incident.vehicles.year} {incident.vehicles.make} {incident.vehicles.model}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={severityInfo?.className}>
                {severityInfo?.label}
              </Badge>
              <Badge className={statusInfo?.className}>
                {statusInfo?.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : incident ? (
          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">
                      {format(new Date(incident.incident_date), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium capitalize">
                      {incident.incident_type.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                {incident.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{incident.location}</p>
                    </div>
                  </div>
                )}
                {incident.bookings && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Booking</p>
                      <code className="text-sm font-mono">{incident.bookings.booking_code}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {incident.description}
                </p>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {!incident.is_drivable && (
                  <Badge variant="destructive">Not Drivable</Badge>
                )}
                {incident.towing_required && (
                  <Badge variant="secondary">Towing Required</Badge>
                )}
                {incident.airbags_deployed && (
                  <Badge variant="destructive">Airbags Deployed</Badge>
                )}
                {incident.third_party_involved && (
                  <Badge variant="secondary">Third Party Involved</Badge>
                )}
                {incident.claim_required && (
                  <Badge variant="outline">Claim Required</Badge>
                )}
              </div>

              <Separator />

              {/* Status Workflow */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Status Workflow</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusInfo?.className}>
                    {statusInfo?.label}
                  </Badge>
                  {nextStatuses.length > 0 && (
                    <>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      {nextStatuses.map((status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(status)}
                          disabled={updateIncident.isPending}
                        >
                          Move to {STATUS_STYLES[status]?.label}
                        </Button>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Claim Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Insurance / Claim</h4>
                  {editingSection !== "claim" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setClaimNumber(incident.claim_number || "");
                        setEditingSection("claim");
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editingSection === "claim" ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Claim / Report Number"
                      value={claimNumber}
                      onChange={(e) => setClaimNumber(e.target.value)}
                    />
                    <Button size="sm" onClick={handleUpdateClaim} disabled={updateIncident.isPending}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm">
                    {incident.claim_number || (
                      <span className="text-muted-foreground">No claim number</span>
                    )}
                  </p>
                )}
              </div>

              {/* Cost Estimate */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cost Estimate
                  </h4>
                  {editingSection !== "estimate" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEstimateAmount(incident.estimate_amount?.toString() || "");
                        setEditingSection("estimate");
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editingSection === "estimate" ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Estimated cost"
                      value={estimateAmount}
                      onChange={(e) => setEstimateAmount(e.target.value)}
                    />
                    <Button size="sm" onClick={handleUpdateEstimate} disabled={updateIncident.isPending}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Estimate</p>
                      <p>{incident.estimate_amount ? `$${incident.estimate_amount}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Approved</p>
                      <p>{incident.approved_amount ? `$${incident.approved_amount}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Final</p>
                      <p>{incident.final_invoice_amount ? `$${incident.final_invoice_amount}` : "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Repair Vendor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Repair Info
                  </h4>
                  {editingSection !== "repair" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setRepairVendor(incident.repair_vendor || "");
                        setEditingSection("repair");
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editingSection === "repair" ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Repair vendor name"
                      value={repairVendor}
                      onChange={(e) => setRepairVendor(e.target.value)}
                    />
                    <Button size="sm" onClick={handleUpdateRepair} disabled={updateIncident.isPending}>
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm">
                    {incident.repair_vendor || (
                      <span className="text-muted-foreground">No vendor assigned</span>
                    )}
                  </p>
                )}
              </div>

              <Separator />

              {/* Photos */}
              {incident.incident_photos && incident.incident_photos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Evidence Photos</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {incident.incident_photos.map((photo: any) => (
                      <div key={photo.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={photo.photo_url} 
                          alt="Incident photo" 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Internal Notes</h4>
                  {editingSection !== "notes" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setInternalNotes(incident.internal_notes || "");
                        setEditingSection("notes");
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                {editingSection === "notes" ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Staff notes..."
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateNotes} disabled={updateIncident.isPending}>
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingSection(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {incident.internal_notes || "No notes"}
                  </p>
                )}
              </div>

              {/* Timeline placeholder */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Activity Timeline</h4>
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>Created {format(new Date(incident.created_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                  {incident.closed_at && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="w-2 h-2 rounded-full bg-primary/70" />
                      <span>Closed {format(new Date(incident.closed_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            Incident not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
