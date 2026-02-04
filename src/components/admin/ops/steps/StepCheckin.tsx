import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Upload, 
  Camera, 
  Loader2, 
  X,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit2,
  Save,
  Car,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { UnitAssignmentCard } from "@/components/admin/UnitAssignmentCard";
import { cn } from "@/lib/utils";

interface StepCheckinProps {
  booking: any;
  completion: {
    govIdVerified: boolean;
    licenseOnFile: boolean;
    nameMatches: boolean;
    licenseNotExpired: boolean;
    ageVerified: boolean;
  };
  onStepComplete?: () => void;
  vehicleName?: string;
}

export function StepCheckin({ booking, completion, onStepComplete, vehicleName }: StepCheckinProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewLicenseOpen, setViewLicenseOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  
  // Contact info state
  const [contactInfo, setContactInfo] = useState({
    phone: "",
    email: "",
    address: "",
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile-level license status
  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-license", booking.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("driver_license_status, driver_license_expiry, driver_license_front_url, driver_license_number, full_name, email, phone, address")
        .eq("id", booking.user_id)
        .maybeSingle();
      return data as {
        driver_license_status: string | null;
        driver_license_expiry: string | null;
        driver_license_front_url: string | null;
        driver_license_number: string | null;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        address: string | null;
      } | null;
    },
    enabled: !!booking.user_id,
  });
  
  // Initialize contact info from profile
  useEffect(() => {
    if (profile) {
      setContactInfo({
        phone: profile.phone || booking.profiles?.phone || "",
        email: profile.email || booking.profiles?.email || "",
        address: profile.address || "",
      });
      setLicenseNumber(profile.driver_license_number || "");
    }
  }, [profile, booking.profiles]);
  
  const licenseOnFile = profile?.driver_license_status === "on_file";
  const licenseExpiry = profile?.driver_license_expiry;
  const licenseFrontUrl = profile?.driver_license_front_url;
  
  const isComplete = 
    completion.govIdVerified &&
    completion.licenseOnFile &&
    completion.nameMatches &&
    completion.licenseNotExpired &&
    completion.ageVerified;

  // Update contact info mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: typeof contactInfo & { licenseNumber: string }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: data.phone || null,
          address: data.address || null,
          driver_license_number: data.licenseNumber || null,
        })
        .eq("id", booking.user_id);
      
      if (profileError) throw profileError;
      
      // Also store in booking notes for reference
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          special_instructions: booking.special_instructions 
            ? `${booking.special_instructions}\n\nCustomer Contact: ${data.phone || 'N/A'}, ${data.email || 'N/A'}, ${data.address || 'N/A'}`
            : `Customer Contact: ${data.phone || 'N/A'}, ${data.email || 'N/A'}, ${data.address || 'N/A'}`,
        })
        .eq("id", booking.id);
      
      if (bookingError) throw bookingError;
    },
    onSuccess: () => {
      toast({ title: "Contact info saved" });
      setEditingContact(false);
      refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to save", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

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
          driver_license_number: licenseNumber || null,
        })
        .eq("id", booking.user_id);

      if (updateError) throw updateError;

      toast({
        title: "License Uploaded",
        description: "Driver's license saved to customer profile",
      });

      // Refresh all profile-related queries immediately
      await Promise.all([
        refetchProfile(),
        queryClient.refetchQueries({ queryKey: ["profile-license", booking.user_id] }),
        queryClient.refetchQueries({ queryKey: ["license-status", booking.user_id] }),
        queryClient.refetchQueries({ queryKey: ["booking", booking.id] }),
      ]);
      
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
  
  const handleSaveContact = () => {
    updateContactMutation.mutate({ ...contactInfo, licenseNumber });
  };
  
  return (
    <div className="space-y-4">
      {/* Customer Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Customer Information</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setEditingContact(!editingContact)}
            >
              {editingContact ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingContact ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone Number
                </Label>
                <Input
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </Label>
                <Input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@example.com"
                  disabled // Email usually comes from auth
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Home Address
                </Label>
                <Input
                  value={contactInfo.address}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>
              <Button 
                onClick={handleSaveContact}
                disabled={updateContactMutation.isPending}
                className="w-full"
              >
                {updateContactMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Contact Info
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.profiles?.full_name || "Unknown"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contactInfo.phone || booking.profiles?.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contactInfo.email || booking.profiles?.email || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contactInfo.address || "Not provided"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver's License Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Driver's License</CardTitle>
            </div>
            {licenseOnFile ? (
              <Badge className="bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                On File
              </Badge>
            ) : (
              <Badge variant="destructive">Missing</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* License Image Preview */}
          {licenseOnFile && licenseFrontUrl && (
            <div 
              className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setViewLicenseOpen(true)}
            >
              <SignedStorageImage
                path={licenseFrontUrl}
                bucket="driver-licenses"
                alt="Driver's License"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>
          )}
          
          {/* License Number */}
          <div className="space-y-2">
            <Label>License Number</Label>
            <div className="flex gap-2">
              <Input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Enter license number"
              />
              {licenseNumber !== (profile?.driver_license_number || "") && (
                <Button 
                  size="sm"
                  onClick={() => updateContactMutation.mutate({ ...contactInfo, licenseNumber })}
                  disabled={updateContactMutation.isPending}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
          
          {/* Upload Button */}
          {!licenseOnFile && (
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(true)}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Capture License Now
            </Button>
          )}
          
          {/* Replace License Button */}
          {licenseOnFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
              className="w-full gap-2"
            >
              <Camera className="h-4 w-4" />
              Replace License Photo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Verification Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Verification Checklist</CardTitle>
            </div>
            <StatusIndicator complete={isComplete} />
          </div>
          <CardDescription>
            Verify all items by comparing with the physical ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <VerificationItem 
              label="Government Photo ID verified (in person)"
              passed={completion.govIdVerified}
            />
            <VerificationItem 
              label="Driver's License on file"
              passed={completion.licenseOnFile}
            />
            <VerificationItem 
              label="Name matches booking"
              passed={completion.nameMatches}
            />
            <VerificationItem 
              label="License not expired"
              passed={completion.licenseNotExpired}
            />
            <VerificationItem 
              label="Age verified (21+)"
              passed={completion.ageVerified}
            />
          </div>
        </CardContent>
      </Card>

      {/* VIN Unit Assignment Card */}
      {booking.vehicle_id && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vehicle Unit Assignment</CardTitle>
            </div>
            <CardDescription>
              Assign a specific VIN unit for this rental
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UnitAssignmentCard
              bookingId={booking.id}
              vehicleId={booking.vehicle_id}
              vehicleName={vehicleName || "Vehicle"}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={viewLicenseOpen} onOpenChange={setViewLicenseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Driver's License</DialogTitle>
            <DialogDescription>
              Compare this with the physical ID presented by the customer
            </DialogDescription>
          </DialogHeader>
          {licenseFrontUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <SignedStorageImage
                path={licenseFrontUrl}
                bucket="driver-licenses"
                alt="Driver's License"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {profile?.driver_license_number && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">License Number</p>
              <p className="font-mono font-medium">{profile.driver_license_number}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            {/* License Number Input */}
            <div className="space-y-2">
              <Label>License Number (Optional)</Label>
              <Input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="Enter license number"
              />
            </div>
            
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

function VerificationItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <span className={cn(
        "text-sm",
        passed && "text-emerald-700 dark:text-emerald-400"
      )}>
        {label}
      </span>
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
