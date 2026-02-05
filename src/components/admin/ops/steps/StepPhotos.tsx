import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  CheckCircle2, 
  Loader2,
  Upload,
  X,
  Car,
  Armchair,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useBookingConditionPhotos, 
  useUploadConditionPhoto,
  REQUIRED_PHOTOS,
  PHOTO_LABELS,
  getPhotoCompletionStatus,
  type PhotoType 
} from '@/hooks/use-condition-photos';

interface StepPhotosProps {
  bookingId: string;
  completion: {
    photosComplete: boolean;
  };
}

// Custom SVG icons for vehicle views
const CarFrontIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 11l2-6h10l2 6" />
    <path d="M3 17h18v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4z" />
    <circle cx="6.5" cy="17" r="1.5" />
    <circle cx="17.5" cy="17" r="1.5" />
  </svg>
);

const CarBackIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17h18v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4z" />
    <rect x="6" y="11" width="12" height="2" rx="0.5" />
    <circle cx="6.5" cy="17" r="1.5" />
    <circle cx="17.5" cy="17" r="1.5" />
  </svg>
);

const CarSideIcon = ({ flip }: { flip?: boolean }) => (
  <svg className={cn("h-5 w-5", flip && "scale-x-[-1]")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h2l2-4h8l2 4h4v4H3z" />
    <circle cx="6" cy="16" r="2" />
    <circle cx="18" cy="16" r="2" />
  </svg>
);

const PHOTO_ICONS: Record<PhotoType, React.ReactNode> = {
  front: <CarFrontIcon />,
  back: <CarBackIcon />,
  left: <CarSideIcon />,
  right: <CarSideIcon flip />,
  odometer_fuel: <Gauge className="h-5 w-5" />,
  fuel_gauge: <Gauge className="h-5 w-5" />,
  front_seat: <Armchair className="h-5 w-5" />,
  back_seat: <Armchair className="h-5 w-5" />,
};

export function StepPhotos({ bookingId, completion }: StepPhotosProps) {
  const { data: photos, isLoading } = useBookingConditionPhotos(bookingId);
  const uploadMutation = useUploadConditionPhoto();
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = useCallback(async (photoType: PhotoType, file: File) => {
    // Add to uploading set
    setUploadingPhotos(prev => new Set(prev).add(photoType));
    
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        phase: 'pickup',
        photoType,
        file,
      });
    } finally {
      // Remove from uploading set
      setUploadingPhotos(prev => {
        const next = new Set(prev);
        next.delete(photoType);
        return next;
      });
    }
  }, [bookingId, uploadMutation]);

  const handleUploadClick = (photoType: PhotoType) => {
    fileInputRefs.current[photoType]?.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pickupPhotos = photos?.pickup || [];
  const status = getPhotoCompletionStatus(pickupPhotos, 'pickup');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Handover Photos</CardTitle>
          </div>
          <StatusIndicator complete={status.complete} />
        </div>
        <CardDescription>
          Capture all required photos before handover. Each upload happens independently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress summary */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {status.complete ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Camera className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={cn(
              "text-sm font-medium",
              status.complete && "text-emerald-600"
            )}>
              {status.complete ? "All photos captured" : `${status.uploaded.length}/${REQUIRED_PHOTOS.length} photos`}
            </span>
          </div>
          {!status.complete && (
            <Badge variant="secondary">
              {REQUIRED_PHOTOS.length - status.uploaded.length} missing
            </Badge>
          )}
        </div>

        {/* Photo grid - larger cards for easier tapping */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {REQUIRED_PHOTOS.map((photoType) => {
            const photo = pickupPhotos.find(p => p.photo_type === photoType);
            const isUploading = uploadingPhotos.has(photoType);
            const isUploaded = !!photo;

            return (
              <div
                key={photoType}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer",
                  isUploaded 
                    ? "border-emerald-500 bg-emerald-500/5" 
                    : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50",
                  isUploading && "opacity-70 cursor-wait"
                )}
                onClick={() => !isUploading && handleUploadClick(photoType)}
              >
                <input
                  ref={(el) => (fileInputRefs.current[photoType] = el)}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(photoType, file);
                    e.target.value = '';
                  }}
                />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    isUploaded 
                      ? "bg-emerald-500 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isUploaded ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      PHOTO_ICONS[photoType]
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{PHOTO_LABELS[photoType]}</p>
                    {!isUploading && !isUploaded && (
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                        <Upload className="h-3 w-3" />
                        Tap to capture
                      </p>
                    )}
                    {isUploaded && (
                      <p className="text-xs text-emerald-600 mt-1">Uploaded</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center">
          Photos upload independently - you can continue capturing while previous uploads finish.
        </p>
      </CardContent>
    </Card>
  );
}

function StatusIndicator({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Camera className="w-3 h-3 mr-1" />
      In Progress
    </Badge>
  );
}
