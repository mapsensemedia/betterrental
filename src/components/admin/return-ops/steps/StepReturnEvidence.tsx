import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useBookingConditionPhotos, 
  useUploadConditionPhoto,
  PHOTO_LABELS,
  type PhotoType 
} from "@/hooks/use-condition-photos";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Camera, 
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  Car,
  Fuel,
  Gauge,
  Armchair,
  Lock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepReturnEvidenceProps {
  bookingId: string;
  completion: {
    photosComplete: boolean;
  };
  onComplete?: () => void;
  isLocked?: boolean;
  isComplete?: boolean;
  isException?: boolean;
}

// Return photos include fuel_gauge as a separate slot
const RETURN_PHOTO_TYPES: { type: PhotoType | "fuel_gauge"; label: string }[] = [
  { type: "front", label: "Front" },
  { type: "back", label: "Rear" },
  { type: "left", label: "Driver Side" },
  { type: "right", label: "Passenger Side" },
  { type: "odometer_fuel", label: "Odometer" },
  { type: "fuel_gauge", label: "Fuel Gauge" },
  { type: "front_seat", label: "Front Seat" },
  { type: "back_seat", label: "Back Seat" },
];

const PHOTO_ICONS: Record<string, React.ReactNode> = {
  front: <Car className="h-4 w-4" />,
  back: <Car className="h-4 w-4 rotate-180" />,
  left: <Car className="h-4 w-4 -rotate-90" />,
  right: <Car className="h-4 w-4 rotate-90" />,
  odometer_fuel: <Gauge className="h-4 w-4" />,
  fuel_gauge: <Fuel className="h-4 w-4" />,
  front_seat: <Armchair className="h-4 w-4" />,
  back_seat: <Armchair className="h-4 w-4" />,
};

export function StepReturnEvidence({ 
  bookingId, 
  completion, 
  onComplete, 
  isLocked, 
  isComplete,
  isException 
}: StepReturnEvidenceProps) {
  const { data: photos, isLoading, refetch } = useBookingConditionPhotos(bookingId);
  const uploadMutation = useUploadConditionPhoto();
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Check if fuel is lower than pickup (requires fuel photo)
  const { data: returnMetrics } = useQuery({
    queryKey: ["return-inspection-metrics", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspection_metrics")
        .select("fuel_level")
        .eq("booking_id", bookingId)
        .eq("phase", "return")
        .maybeSingle();
      return data;
    },
  });

  const { data: pickupMetrics } = useQuery({
    queryKey: ["pickup-inspection-metrics", bookingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inspection_metrics")
        .select("fuel_level")
        .eq("booking_id", bookingId)
        .eq("phase", "pickup")
        .maybeSingle();
      return data;
    },
  });

  const fuelIsLower = (returnMetrics?.fuel_level ?? 100) < (pickupMetrics?.fuel_level ?? 0);
  const requiresFuelPhoto = fuelIsLower;
  
  const returnPhotos = photos?.return || [];
  const uploadedTypes = new Set(returnPhotos.map(p => p.photo_type));
  const hasFuelPhoto = uploadedTypes.has("fuel_gauge");

  const handleFileSelect = async (photoType: string, file: File) => {
    setUploadingPhoto(photoType);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        phase: 'return',
        photoType: photoType as PhotoType,
        file,
      });
      refetch();
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleUploadClick = (photoType: string) => {
    if (isLocked) return;
    fileInputRefs.current[photoType]?.click();
  };

  const uploadedCount = returnPhotos.length;
  const totalRequired = RETURN_PHOTO_TYPES.length;
  const hasMinimumPhotos = uploadedCount >= 4;
  
  // For exception returns, require photos. For normal, optional but fuel photo required if fuel is lower
  const fuelPhotoRequired = requiresFuelPhoto && !hasFuelPhoto;
  const canProceed = (!isException || hasMinimumPhotos) && !fuelPhotoRequired;
  
  const stepIsComplete = isComplete;

  return (
    <div className="space-y-6">
      {/* Locked Warning */}
      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete previous steps to unlock this step.
          </AlertDescription>
        </Alert>
      )}

      {/* Fuel Photo Required Warning */}
      {requiresFuelPhoto && !hasFuelPhoto && !isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            <strong>Fuel photo required:</strong> Fuel level is lower than at pickup. Please capture a photo of the fuel gauge for evidence.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className={stepIsComplete 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : isException && !hasMinimumPhotos
          ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
          : fuelPhotoRequired
            ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
            : "border-muted"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            stepIsComplete ? "text-emerald-600" : 
            (isException && !hasMinimumPhotos) || fuelPhotoRequired ? "text-amber-600" : "text-muted-foreground"
          }`}>
            {stepIsComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Evidence capture complete</span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="font-medium">
                  {uploadedCount} of {totalRequired} photos captured
                  {isException && !hasMinimumPhotos && " (minimum 4 required for exception returns)"}
                  {fuelPhotoRequired && " (fuel photo required)"}
                  {!isException && !fuelPhotoRequired && " (optional for normal returns)"}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Return Condition Photos
          </CardTitle>
          <CardDescription>
            Capture photos of the vehicle's condition upon return
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading photos...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {RETURN_PHOTO_TYPES.map((photoType) => {
                  const photo = returnPhotos.find(p => p.photo_type === photoType.type);
                  const hasPhoto = !!photo;
                  const isUploading = uploadingPhoto === photoType.type;
                  const isFuelAndRequired = photoType.type === "fuel_gauge" && requiresFuelPhoto;
                  
                  return (
                    <div key={photoType.type} className="space-y-2">
                      <div 
                        className={cn(
                          "aspect-square rounded-lg border-2 overflow-hidden transition-all",
                          hasPhoto 
                            ? "border-emerald-500/50" 
                            : isFuelAndRequired
                              ? "border-dashed border-amber-500 hover:border-amber-600"
                              : "border-dashed border-muted-foreground/30 hover:border-primary",
                          isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        )}
                        onClick={() => !isUploading && handleUploadClick(photoType.type)}
                      >
                        <input
                          ref={(el) => (fileInputRefs.current[photoType.type] = el)}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={isLocked}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(photoType.type, file);
                            e.target.value = '';
                          }}
                        />
                        
                        {hasPhoto ? (
                          <SignedStorageImage
                            bucket="condition-photos"
                            path={photo.photo_url}
                            alt={photoType.label}
                            className="w-full h-full object-cover"
                          />
                        ) : isUploading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30">
                            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                            <span className="text-xs text-muted-foreground">Uploading...</span>
                          </div>
                        ) : (
                          <div className={cn(
                            "w-full h-full flex flex-col items-center justify-center transition-colors",
                            isFuelAndRequired 
                              ? "bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-950/20" 
                              : "bg-muted/30 hover:bg-muted/50"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                              isFuelAndRequired ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                            )}>
                              {PHOTO_ICONS[photoType.type]}
                            </div>
                            <Upload className={cn(
                              "h-4 w-4 mb-1",
                              isFuelAndRequired ? "text-amber-600" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "text-xs",
                              isFuelAndRequired ? "text-amber-600 font-medium" : "text-muted-foreground"
                            )}>
                              {isFuelAndRequired ? "Required" : "Tap to capture"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-medium",
                          isFuelAndRequired && !hasPhoto ? "text-amber-600" : ""
                        )}>
                          {photoType.label}
                          {isFuelAndRequired && !hasPhoto && " *"}
                        </span>
                        {hasPhoto ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className={cn(
                            "h-3.5 w-3.5",
                            isFuelAndRequired ? "text-amber-500" : "text-muted-foreground/50"
                          )} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Click on any box to capture or replace photo
                </span>
                <Badge variant={hasMinimumPhotos ? "default" : "secondary"}>
                  {uploadedCount}/{totalRequired}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Step Button */}
      {!stepIsComplete && !isLocked && (
        <Button
          onClick={onComplete}
          disabled={!canProceed}
          className="w-full"
          size="lg"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          {fuelPhotoRequired 
            ? "Capture fuel photo to proceed"
            : isException && !hasMinimumPhotos 
              ? `Capture at least 4 photos to proceed`
              : `Complete Evidence Step`
          }
        </Button>
      )}
    </div>
  );
}
