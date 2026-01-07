import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBookingConditionPhotos } from "@/hooks/use-condition-photos";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { 
  Camera, 
  CheckCircle2,
  XCircle,
  ImageIcon,
} from "lucide-react";

interface StepReturnEvidenceProps {
  bookingId: string;
  completion: {
    photosComplete: boolean;
  };
}

const RETURN_PHOTO_TYPES = [
  { type: "front", label: "Front" },
  { type: "rear", label: "Rear" },
  { type: "driver_side", label: "Driver Side" },
  { type: "passenger_side", label: "Passenger Side" },
  { type: "interior_front", label: "Interior Front" },
  { type: "interior_rear", label: "Interior Rear" },
  { type: "fuel", label: "Fuel Gauge" },
  { type: "odometer", label: "Odometer" },
];

export function StepReturnEvidence({ bookingId, completion }: StepReturnEvidenceProps) {
  const { data: photos, isLoading } = useBookingConditionPhotos(bookingId);
  
  const returnPhotos = photos?.return || [];
  const uploadedTypes = new Set(returnPhotos.map(p => p.photo_type));

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={completion.photosComplete 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${completion.photosComplete ? "text-emerald-600" : "text-amber-600"}`}>
            {completion.photosComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Return photos captured</span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="font-medium">
                  {returnPhotos.length} of {RETURN_PHOTO_TYPES.length} photos captured
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Return Condition Photos
          </CardTitle>
          <CardDescription>
            Review the captured return condition photos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading photos...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {RETURN_PHOTO_TYPES.map((photoType) => {
                  const photo = returnPhotos.find(p => p.photo_type === photoType.type);
                  const hasPhoto = !!photo;
                  
                  return (
                    <div key={photoType.type} className="space-y-2">
                      <div className={`aspect-square rounded-lg border-2 overflow-hidden ${
                        hasPhoto 
                          ? "border-emerald-500/50" 
                          : "border-dashed border-muted-foreground/30"
                      }`}>
                        {hasPhoto ? (
                          <SignedStorageImage
                            bucket="condition-photos"
                            path={photo.photo_url}
                            alt={photoType.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/30">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
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
                  Photos can be captured via the mobile app or customer portal
                </span>
                <Badge variant={completion.photosComplete ? "default" : "secondary"}>
                  {returnPhotos.length}/{RETURN_PHOTO_TYPES.length}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
