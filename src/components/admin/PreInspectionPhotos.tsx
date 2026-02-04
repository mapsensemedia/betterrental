import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CheckCircle2, 
  Loader2,
  Upload,
  ChevronDown,
  Gauge,
  Armchair,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  useBookingConditionPhotos, 
  useUploadConditionPhoto,
  REQUIRED_PHOTOS,
  PHOTO_LABELS,
  getPhotoCompletionStatus,
  type PhotoType 
} from '@/hooks/use-condition-photos';

interface PreInspectionPhotosProps {
  bookingId: string;
}

// Custom SVG icons for vehicle views
const CarFrontIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 11l2-6h10l2 6" />
    <path d="M3 17h18v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4z" />
    <circle cx="6.5" cy="17" r="1.5" />
    <circle cx="17.5" cy="17" r="1.5" />
  </svg>
);

const CarBackIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17h18v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4z" />
    <rect x="6" y="11" width="12" height="2" rx="0.5" />
    <circle cx="6.5" cy="17" r="1.5" />
    <circle cx="17.5" cy="17" r="1.5" />
  </svg>
);

const CarSideIcon = ({ flip }: { flip?: boolean }) => (
  <svg className={cn("h-4 w-4", flip && "scale-x-[-1]")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  odometer_fuel: <Gauge className="h-4 w-4" />,
  front_seat: <Armchair className="h-4 w-4" />,
  back_seat: <Armchair className="h-4 w-4" />,
};

export function PreInspectionPhotos({ bookingId }: PreInspectionPhotosProps) {
  const { data: photos, isLoading } = useBookingConditionPhotos(bookingId);
  const uploadMutation = useUploadConditionPhoto();
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = async (photoType: PhotoType, file: File) => {
    setUploadingPhoto(photoType);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        phase: 'pickup',
        photoType,
        file,
      });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleUploadClick = (photoType: PhotoType) => {
    fileInputRefs.current[photoType]?.click();
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pickupPhotos = photos?.pickup || [];
  const status = getPhotoCompletionStatus(pickupPhotos, 'pickup');

  return (
    <div className="space-y-3">
      {/* Compact summary */}
      <div className="flex items-center justify-between">
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
        <Badge 
          variant={status.complete ? "default" : "secondary"}
          className={cn(status.complete && "bg-emerald-500")}
        >
          {status.complete ? "Complete" : `${REQUIRED_PHOTOS.length - status.uploaded.length} missing`}
        </Badge>
      </div>

      {/* Missing photos summary */}
      {!status.complete && status.missing.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Missing: {status.missing.map(t => PHOTO_LABELS[t]).join(", ")}
        </p>
      )}

      {/* Expandable upload grid */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
          {isExpanded ? "Hide photos" : "Upload photos"}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {REQUIRED_PHOTOS.map((photoType) => {
              const photo = pickupPhotos.find(p => p.photo_type === photoType);
              const isUploading = uploadingPhoto === photoType;
              const isUploaded = !!photo;

              return (
                <div
                  key={photoType}
                  className={cn(
                    "relative border-2 border-dashed rounded-lg p-3 transition-all cursor-pointer text-center",
                    isUploaded ? "border-emerald-500 bg-emerald-500/5" : "border-muted-foreground/25 hover:border-primary"
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

                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isUploaded ? "bg-emerald-500 text-white" : "bg-muted"
                    )}>
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isUploaded ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        PHOTO_ICONS[photoType]
                      )}
                    </div>
                    <p className="text-xs font-medium">{PHOTO_LABELS[photoType]}</p>
                    {!isUploading && !isUploaded && (
                      <Upload className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
