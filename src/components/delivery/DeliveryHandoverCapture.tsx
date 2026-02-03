import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateDeliveryStatus, type DeliveryStatus } from "@/hooks/use-my-deliveries";
import { Camera, Upload, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface DeliveryHandoverCaptureProps {
  bookingId: string;
  currentStatus: DeliveryStatus;
  onComplete?: () => void;
}

const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus | null> = {
  assigned: "picked_up",
  picked_up: "en_route",
  en_route: "delivered",
  delivered: null,
  issue: null,
  cancelled: null,
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Mark as Picked Up",
  picked_up: "Start Delivery",
  en_route: "Complete Delivery",
  delivered: "Completed",
  issue: "Issue Reported",
  cancelled: "Cancelled",
};

export function DeliveryHandoverCapture({ 
  bookingId, 
  currentStatus,
  onComplete 
}: DeliveryHandoverCaptureProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateStatus = useUpdateDeliveryStatus();

  const nextStatus = STATUS_TRANSITIONS[currentStatus];
  const canProgress = nextStatus !== null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileName = `${bookingId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("condition-photos")
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("condition-photos")
          .getPublicUrl(fileName);

        return urlData.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setPhotos((prev) => [...prev, ...urls]);
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;

    // For delivery completion, require at least one photo
    if (nextStatus === "delivered" && photos.length === 0) {
      toast.error("Please capture at least one handover photo");
      return;
    }

    try {
      await updateStatus.mutateAsync({
        bookingId,
        status: nextStatus,
        notes: notes || undefined,
        photoUrls: photos.length > 0 ? photos : undefined,
      });
      
      setNotes("");
      setPhotos([]);
      onComplete?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleReportIssue = async () => {
    if (!notes.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    try {
      await updateStatus.mutateAsync({
        bookingId,
        status: "issue",
        notes,
        photoUrls: photos.length > 0 ? photos : undefined,
      });
      
      toast.success("Issue reported to admin");
      setNotes("");
      setPhotos([]);
      onComplete?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!canProgress && currentStatus !== "issue") {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-medium text-green-700">Delivery Complete</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Update Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo Upload */}
        <div>
          <Label className="mb-2 block">
            Handover Photos {nextStatus === "delivered" && "(Required)"}
          </Label>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2 mb-2">
            {photos.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {uploading ? "Uploading..." : "Take/Upload Photo"}
          </Button>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="mb-2 block">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about the delivery..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {canProgress && (
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatus.isPending}
              className="w-full"
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {STATUS_LABELS[currentStatus]}
            </Button>
          )}
          
          {currentStatus !== "issue" && currentStatus !== "delivered" && (
            <Button
              variant="outline"
              onClick={handleReportIssue}
              disabled={updateStatus.isPending}
              className="w-full text-destructive hover:text-destructive"
            >
              Report Issue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
