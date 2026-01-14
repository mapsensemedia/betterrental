import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckInSection } from "@/components/admin/CheckInSection";
import { CheckCircle2, XCircle, UserCheck, Upload, Camera, Loader2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StepCheckinProps {
  booking: any;
  completion: {
    govIdVerified: boolean;
    licenseOnFile: boolean;
    nameMatches: boolean;
    licenseNotExpired: boolean;
    ageVerified: boolean;
  };
}

export function StepCheckin({ booking, completion }: StepCheckinProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile-level license status
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-license", booking.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("driver_license_status, driver_license_expiry, driver_license_front_url")
        .eq("id", booking.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!booking.user_id,
  });
  
  const licenseOnFile = profile?.driver_license_status === "on_file";
  const licenseExpiry = profile?.driver_license_expiry;
  
  const isComplete = 
    completion.govIdVerified &&
    completion.licenseOnFile &&
    completion.nameMatches &&
    completion.licenseNotExpired &&
    completion.ageVerified;

  // Handle staff license upload for customer
  const handleUploadLicense = async () => {
    if (!selectedFile || !booking.user_id) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${booking.user_id}/front.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("driver-licenses")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 1 year)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("driver-licenses")
        .createSignedUrl(filePath, 31536000);

      if (signedError) throw signedError;

      // Update customer profile with the license
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          driver_license_front_url: signedData.signedUrl,
          driver_license_status: "on_file",
          driver_license_uploaded_at: new Date().toISOString(),
        })
        .eq("id", booking.user_id);

      if (updateError) throw updateError;

      toast({
        title: "License Uploaded",
        description: "Driver's license saved to customer profile",
      });

      // Refresh data
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["profile-license", booking.user_id] });
      
      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error("License upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload license",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Customer Check-In</CardTitle>
            </div>
            <StatusIndicator complete={isComplete} />
          </div>
          <CardDescription>
            Verify Government ID, driver's license on file, name, expiry, and age (21+)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckInSection
            bookingId={booking.id}
            bookingStartAt={booking.start_at}
            customerName={booking.profiles?.full_name || null}
            licenseOnFile={licenseOnFile}
            licenseExpiryFromProfile={licenseExpiry}
            onUploadLicense={() => setUploadDialogOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Staff License Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Driver's License</DialogTitle>
            <DialogDescription>
              Take a photo or upload the customer's driver's license. This will be saved to their profile for future rentals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedFile ? (
              <div className="space-y-3">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="License preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {selectedFile.name}
                </p>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium">Take photo or upload file</p>
                  <p className="text-sm text-muted-foreground">
                    Tap to capture or select an image
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUploadLicense}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save to Profile"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusIndicator({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
}
