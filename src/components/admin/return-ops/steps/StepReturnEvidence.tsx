import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useBookingConditionPhotos, 
  useUploadConditionPhoto,
  type PhotoType 
} from "@/hooks/use-condition-photos";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { 
  Camera, 
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  Car,
  Fuel,
  Gauge,
  Lock,
  ArrowRight,
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

const RETURN_PHOTO_TYPES: { type: PhotoType; label: string }[] = [
  { type: "front", label: "Front" },
  { type: "back", label: "Rear" },
  { type: "left", label: "Driver Side" },
  { type: "right", label: "Passenger Side" },
  { type: "odometer", label: "Odometer" },
  { type: "fuel_gauge", label: "Fuel Gauge" },
];

const PHOTO_ICONS: Record<PhotoType, React.ReactNode> = {
  front: <Car className="h-4 w-4" />,
  back: <Car className="h-4 w-4 rotate-180" />,
  left: <Car className="h-4 w-4 -rotate-90" />,
  right: <Car className="h-4 w-4 rotate-90" />,
  odometer: <Gauge className="h-4 w-4" />,
  fuel_gauge: <Fuel className="h-4 w-4" />,
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
  
  const returnPhotos = photos?.return || [];
  const uploadedTypes = new Set(returnPhotos.map(p => p.photo_type));

  const handleFileSelect = async (photoType: PhotoType, file: File) => {
    setUploadingPhoto(photoType);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        phase: 'return',
        photoType,
        file,
      });
      refetch();
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleUploadClick = (photoType: PhotoType) => {
    if (isLocked) return;
    fileInputRefs.current[photoType]?.click();
  };

  const uploadedCount = returnPhotos.length;
  const totalRequired = RETURN_PHOTO_TYPES.length;
  const hasMinimumPhotos = uploadedCount >= 4;
  
  // For exception returns, require photos. For normal, optional
  const canProceed = !isException || hasMinimumPhotos;
  const stepIsComplete = isComplete || completion.photosComplete;

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

      {/* Status Card */}
      <Card className={stepIsComplete 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : isException && !hasMinimumPhotos
          ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
          : "border-muted"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            stepIsComplete ? "text-emerald-600" : 
            isException && !hasMinimumPhotos ? "text-amber-600" : "text-muted-foreground"
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
                  {!isException && " (optional for normal returns)"}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {RETURN_PHOTO_TYPES.map((photoType) => {
                  const photo = returnPhotos.find(p => p.photo_type === photoType.type);
                  const hasPhoto = !!photo;
                  const isUploading = uploadingPhoto === photoType.type;
                  
                  return (
                    <div key={photoType.type} className="space-y-2">
                      <div 
                        className={cn(
                          "aspect-square rounded-lg border-2 overflow-hidden transition-all",
                          hasPhoto 
                            ? "border-emerald-500/50" 
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
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                              {PHOTO_ICONS[photoType.type]}
                            </div>
                            <Upload className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Tap to capture</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{photoType.label}</span>
                        {hasPhoto ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
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
          {isException && !hasMinimumPhotos 
            ? `Capture at least 4 photos to proceed`
            : `Complete Evidence Step`
          }
        </Button>
      )}
    </div>
  );
}
