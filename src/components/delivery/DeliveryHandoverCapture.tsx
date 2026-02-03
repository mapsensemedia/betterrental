import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateDeliveryStatus, type DeliveryStatus } from "@/hooks/use-my-deliveries";
import { Camera, X, Loader2, Check, Clock, AlertTriangle, Truck, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeliveryHandoverCaptureProps {
  bookingId: string;
  currentStatus: DeliveryStatus;
  onComplete?: () => void;
}

// Status transitions: each status maps to its next logical step
const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus | null> = {
  unassigned: "picked_up", // Once claimed, driver can mark as picked up
  assigned: "picked_up",
  picked_up: "en_route",
  en_route: "delivered",
  delivered: null,
  issue: null,
  cancelled: null,
};

// Button labels for progressing to the next status
const STATUS_ACTION_LABELS: Record<DeliveryStatus, string> = {
  unassigned: "Mark as Picked Up",
  assigned: "Mark as Picked Up",
  picked_up: "Start Delivery (En Route)",
  en_route: "Complete Delivery",
  delivered: "Completed",
  issue: "Issue Reported",
  cancelled: "Cancelled",
};

// Status display info
const STATUS_INFO: Record<DeliveryStatus, { label: string; icon: React.ElementType; color: string }> = {
  unassigned: { label: "Awaiting Assignment", icon: Clock, color: "text-muted-foreground" },
  assigned: { label: "Assigned - Ready to Pick Up", icon: Clock, color: "text-blue-600" },
  picked_up: { label: "Picked Up - Ready for Delivery", icon: Truck, color: "text-amber-600" },
  en_route: { label: "En Route to Customer", icon: Truck, color: "text-orange-600" },
  delivered: { label: "Delivered", icon: PackageCheck, color: "text-green-600" },
  issue: { label: "Issue Reported", icon: AlertTriangle, color: "text-destructive" },
  cancelled: { label: "Cancelled", icon: AlertTriangle, color: "text-muted-foreground" },
};

export function DeliveryHandoverCapture({ 
  bookingId, 
  currentStatus,
  onComplete 
}: DeliveryHandoverCaptureProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateStatus = useUpdateDeliveryStatus();

  const nextStatus = STATUS_TRANSITIONS[currentStatus];
  const canProgress = nextStatus !== null;
  const canReportIssue = currentStatus !== "delivered" && currentStatus !== "issue" && currentStatus !== "cancelled";
  const statusInfo = STATUS_INFO[currentStatus];
  const StatusIcon = statusInfo.icon;

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
    if (!issueDescription.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    try {
      await updateStatus.mutateAsync({
        bookingId,
        status: "issue",
        notes: issueDescription,
        photoUrls: photos.length > 0 ? photos : undefined,
      });
      
      toast.success("Issue reported to admin");
      setIssueDescription("");
      setIssueDialogOpen(false);
      setPhotos([]);
      onComplete?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Terminal states: delivered, cancelled
  if (currentStatus === "delivered") {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-medium text-green-700">Delivery Complete</p>
        </CardContent>
      </Card>
    );
  }

  if (currentStatus === "cancelled") {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-lg font-medium text-muted-foreground">Delivery Cancelled</p>
        </CardContent>
      </Card>
    );
  }

  if (currentStatus === "issue") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <p className="text-lg font-medium text-destructive">Issue Reported</p>
          <p className="text-sm text-muted-foreground mt-1">Admin has been notified</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            Update Delivery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status Display */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">Current Status</p>
            <p className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
          </div>

          {/* Photo Upload - Required for final delivery */}
          <div>
            <Label className="mb-2 block">
              Handover Photos {nextStatus === "delivered" && <span className="text-destructive">(Required)</span>}
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
                size="lg"
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {STATUS_ACTION_LABELS[currentStatus]}
              </Button>
            )}
            
            {canReportIssue && (
              <Button
                variant="outline"
                onClick={() => setIssueDialogOpen(true)}
                disabled={updateStatus.isPending}
                className="w-full text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issue Report Dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Report Delivery Issue
            </DialogTitle>
            <DialogDescription>
              Describe the issue with this delivery. Admin will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="issue-description">Issue Description</Label>
              <Textarea
                id="issue-description"
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Describe what went wrong..."
                rows={4}
                className="mt-1.5"
              />
            </div>
            
            {photos.length > 0 && (
              <div>
                <Label>Attached Photos ({photos.length})</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {photos.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReportIssue}
              disabled={updateStatus.isPending || !issueDescription.trim()}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Report Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
