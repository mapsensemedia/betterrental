import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Upload, X, Loader2 } from "lucide-react";
import { useCreateDamage } from "@/hooks/use-damages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DamageReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  bookingId?: string;
  bookingCode?: string;
}

const VEHICLE_LOCATIONS = [
  "Front Bumper",
  "Rear Bumper",
  "Front Left Fender",
  "Front Right Fender",
  "Rear Left Fender",
  "Rear Right Fender",
  "Left Door",
  "Right Door",
  "Hood",
  "Trunk",
  "Roof",
  "Windshield",
  "Rear Window",
  "Left Mirror",
  "Right Mirror",
  "Left Headlight",
  "Right Headlight",
  "Left Taillight",
  "Right Taillight",
  "Wheels/Tires",
  "Interior",
  "Other",
];

export function DamageReportDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleName,
  bookingId,
  bookingCode,
}: DamageReportDialogProps) {
  const [description, setDescription] = useState("");
  const [locationOnVehicle, setLocationOnVehicle] = useState("");
  const [severity, setSeverity] = useState<"minor" | "moderate" | "severe">("minor");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const createDamage = useCreateDamage();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `${vehicleId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { error } = await supabase.storage
          .from("condition-photos")
          .upload(fileName, file);

        if (error) {
          console.error("Upload error:", error);
          continue;
        }

        uploadedUrls.push(fileName);
      }

      setPhotoUrls(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo(s) uploaded`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!description.trim() || !locationOnVehicle) return;

    createDamage.mutate({
      vehicleId,
      bookingId: bookingId || "",
      description: description.trim(),
      locationOnVehicle,
      severity,
      photoUrls,
      estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setDescription("");
        setLocationOnVehicle("");
        setSeverity("minor");
        setEstimatedCost("");
        setPhotoUrls([]);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Report Damage
          </DialogTitle>
          <DialogDescription>
            {vehicleName}
            {bookingCode && <span className="ml-2 font-mono text-xs">({bookingCode})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Location on Vehicle *</Label>
            <Select value={locationOnVehicle} onValueChange={setLocationOnVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_LOCATIONS.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Severity *</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor (scratches, small dents)</SelectItem>
                <SelectItem value="moderate">Moderate (visible damage, needs repair)</SelectItem>
                <SelectItem value="severe">Severe (major damage, undrivable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the damage in detail..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label>Estimated Repair Cost ($)</Label>
            <Input
              type="number"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="0.00"
              min="0"
            />
          </div>

          <div>
            <Label>Photos</Label>
            <div className="mt-2 space-y-2">
              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        Photo {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {uploading ? "Uploading..." : "Upload Photos"}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!description.trim() || !locationOnVehicle || createDamage.isPending}
            variant="destructive"
          >
            {createDamage.isPending ? "Submitting..." : "Report Damage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
