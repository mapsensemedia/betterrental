import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Upload, X, Image as ImageIcon, AlertTriangle, Car } from "lucide-react";
import { format } from "date-fns";
import { useCreateIncident, useUploadIncidentPhoto, type CreateIncidentParams, type IncidentSeverity } from "@/hooks/use-incidents";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Helper types for dropdown queries  
interface VehicleOption { id: string; make: string; model: string; year: number }
interface StaffOption { id: string; full_name: string | null; email: string | null; role: string | null }

// Query functions defined outside component
const fetchVehicleOptions = async (): Promise<VehicleOption[]> => {
  // Try vehicle_categories first (primary source for vehicle display data)
  const { data: categories } = await supabase
    .from("vehicle_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  
  if (categories && categories.length > 0) {
    return categories.map(c => ({ id: c.id, make: c.name, model: "", year: new Date().getFullYear() }));
  }
  
  // Fallback to vehicles table
  const { data, error } = await supabase.from("vehicles").select("id, make, model, year").eq("is_available", true).order("make");
  if (error) throw error;
  return data || [];
};

const fetchStaffOptions = async (): Promise<StaffOption[]> => {
  const client = supabase as any;
  const { data, error } = await client.from("profiles").select("id, full_name, email, role").in("role", ["admin", "staff"]).order("full_name");
  if (error) throw error;
  return data || [];
};

interface CreateIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-fill data when opening from a booking
  bookingId?: string;
  vehicleId?: string;
  vehicleUnitId?: string;
  customerId?: string;
  bookingCode?: string;
  vehicleName?: string;
}

const INCIDENT_TYPES = [
  { value: "collision", label: "Collision / Accident" },
  { value: "theft", label: "Theft" },
  { value: "vandalism", label: "Vandalism" },
  { value: "mechanical", label: "Mechanical Failure" },
  { value: "weather", label: "Weather Damage" },
  { value: "customer_damage", label: "Customer-Caused Damage" },
  { value: "hit_and_run", label: "Hit and Run" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; description: string; className: string }[] = [
  { 
    value: "minor", 
    label: "Minor", 
    description: "Cosmetic damage, fully drivable",
    className: "border-yellow-400 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
  },
  { 
    value: "moderate", 
    label: "Moderate", 
    description: "Functional damage, may need repairs",
    className: "border-orange-400 bg-orange-50 text-orange-800 hover:bg-orange-100",
  },
  { 
    value: "major", 
    label: "Major", 
    description: "Significant damage, not drivable or safety concern",
    className: "border-red-400 bg-red-50 text-red-800 hover:bg-red-100",
  },
];

export function CreateIncidentDialog({
  open,
  onOpenChange,
  bookingId,
  vehicleId: prefilledVehicleId,
  vehicleUnitId,
  customerId,
  bookingCode,
  vehicleName,
}: CreateIncidentDialogProps) {
  const createIncident = useCreateIncident();
  const uploadPhoto = useUploadIncidentPhoto();

  // Form state
  const [incidentType, setIncidentType] = useState("");
  const [incidentDate, setIncidentDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [vehicleId, setVehicleId] = useState(prefilledVehicleId || "");
  
  // Flags
  const [isDrivable, setIsDrivable] = useState(true);
  const [towingRequired, setTowingRequired] = useState(false);
  const [airbagsDeployed, setAirbagsDeployed] = useState(false);
  const [thirdPartyInvolved, setThirdPartyInvolved] = useState(false);
  const [claimRequired, setClaimRequired] = useState(false);
  
  // Optional fields
  const [claimNumber, setClaimNumber] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  
  // Photos
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Fetch vehicles for selection (when not pre-filled)
  const vehiclesQuery = useQuery<VehicleOption[], Error>({
    queryKey: ["vehicles-for-incident"],
    queryFn: fetchVehicleOptions,
    enabled: open && !prefilledVehicleId,
  });
  const vehicles = vehiclesQuery.data || [];

  // Fetch staff for assignment
  const staffQuery = useQuery<StaffOption[], Error>({
    queryKey: ["staff-for-incident"],
    queryFn: fetchStaffOptions,
    enabled: open,
  });
  const staff = staffQuery.data || [];

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photoFiles.length > 6) {
      return; // Max 6 photos
    }

    const newFiles = [...photoFiles, ...files].slice(0, 6);
    setPhotoFiles(newFiles);

    // Generate previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return newPreviews;
    });
  }, [photoFiles]);

  const removePhoto = (index: number) => {
    const newFiles = photoFiles.filter((_, i) => i !== index);
    setPhotoFiles(newFiles);
    
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setIncidentType("");
    setIncidentDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setSeverity("");
    setDescription("");
    setLocation("");
    if (!prefilledVehicleId) setVehicleId("");
    setIsDrivable(true);
    setTowingRequired(false);
    setAirbagsDeployed(false);
    setThirdPartyInvolved(false);
    setClaimRequired(false);
    setClaimNumber("");
    setAssignedStaffId("");
    setInternalNotes("");
    setPhotoFiles([]);
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviews([]);
  };

  const handleSubmit = async () => {
    if (!incidentType || !severity || !description || !vehicleId) {
      return;
    }

    const params: CreateIncidentParams = {
      booking_id: bookingId || null,
      vehicle_id: vehicleId,
      vehicle_unit_id: vehicleUnitId || null,
      customer_id: customerId || null,
      incident_type: incidentType,
      incident_date: new Date(incidentDate).toISOString(),
      location: location || undefined,
      description,
      severity,
      is_drivable: isDrivable,
      towing_required: towingRequired,
      airbags_deployed: airbagsDeployed,
      third_party_involved: thirdPartyInvolved,
      claim_number: claimNumber || undefined,
      // Note: claim_required is a generated column in DB, don't send it
      assigned_staff_id: assignedStaffId || undefined,
      internal_notes: internalNotes || undefined,
    };

    try {
      const incident = await createIncident.mutateAsync(params);

      // Upload photos
      for (const file of photoFiles) {
        await uploadPhoto.mutateAsync({
          incidentId: incident.id,
          file,
          category: "damage",
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createIncident.isPending || uploadPhoto.isPending;
  const isValid = incidentType && severity && description && vehicleId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Incident
          </DialogTitle>
          <DialogDescription>
            Create an incident case for tracking and insurance purposes.
            {bookingCode && (
              <Badge variant="outline" className="ml-2 font-mono">{bookingCode}</Badge>
            )}
            {vehicleName && (
              <span className="ml-2 text-foreground font-medium">{vehicleName}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Vehicle Selection (if not pre-filled) */}
            {!prefilledVehicleId && (
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Incident Type & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Type *</Label>
                <Select value={incidentType} onValueChange={setIncidentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                />
              </div>
            </div>

            {/* Severity Selection */}
            <div className="space-y-2">
              <Label>Severity *</Label>
              <div className="grid grid-cols-3 gap-3">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      severity === opt.value
                        ? opt.className + " ring-2 ring-offset-2 ring-current"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs opacity-70">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe what happened, extent of damage, circumstances..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <Input
                placeholder="Where did this occur?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Flags */}
            <div className="space-y-3">
              <Label>Incident Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isDrivable"
                    checked={isDrivable}
                    onCheckedChange={(c) => setIsDrivable(!!c)}
                  />
                  <label htmlFor="isDrivable" className="text-sm">Vehicle is drivable</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="towingRequired"
                    checked={towingRequired}
                    onCheckedChange={(c) => setTowingRequired(!!c)}
                  />
                  <label htmlFor="towingRequired" className="text-sm">Towing required</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="airbagsDeployed"
                    checked={airbagsDeployed}
                    onCheckedChange={(c) => setAirbagsDeployed(!!c)}
                  />
                  <label htmlFor="airbagsDeployed" className="text-sm">Airbags deployed</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="thirdPartyInvolved"
                    checked={thirdPartyInvolved}
                    onCheckedChange={(c) => setThirdPartyInvolved(!!c)}
                  />
                  <label htmlFor="thirdPartyInvolved" className="text-sm">Third party involved</label>
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-3">
              <Label>Photos (up to 6)</Label>
              <div className="grid grid-cols-3 gap-3">
                {photoPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < 6 && (
                  <label className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Insurance / Claim */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="claimRequired"
                  checked={claimRequired}
                  onCheckedChange={(c) => setClaimRequired(!!c)}
                />
                <label htmlFor="claimRequired" className="text-sm font-medium">Insurance claim required</label>
              </div>
              {claimRequired && (
                <div className="space-y-2 pl-6">
                  <Label>Claim / Police Report Number</Label>
                  <Input
                    placeholder="Optional - can be added later"
                    value={claimNumber}
                    onChange={(e) => setClaimNumber(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <Label>Assign to Staff (Optional)</Label>
              <Select value={assignedStaffId || "unassigned"} onValueChange={(v) => setAssignedStaffId(v === "unassigned" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staff.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name || s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label>Internal Notes (Optional)</Label>
              <Textarea
                placeholder="Staff-only notes..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0 border-t mt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Incident Case"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
