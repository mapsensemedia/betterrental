import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CheckCircle2, 
  Loader2,
  Car,
  Fuel,
  Gauge,
  Upload
} from 'lucide-react';
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

const PHOTO_ICONS: Record<PhotoType, React.ReactNode> = {
  front: <Car className="h-5 w-5" />,
  back: <Car className="h-5 w-5 rotate-180" />,
  left: <Car className="h-5 w-5 -rotate-90" />,
  right: <Car className="h-5 w-5 rotate-90" />,
  odometer: <Gauge className="h-5 w-5" />,
  fuel_gauge: <Fuel className="h-5 w-5" />,
};

export function PreInspectionPhotos({ bookingId }: PreInspectionPhotosProps) {
  const { data: photos, isLoading } = useBookingConditionPhotos(bookingId);
  const uploadMutation = useUploadConditionPhoto();
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = async (photoType: PhotoType, file: File) => {
    setUploadingPhoto(photoType);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        phase: 'pickup', // Pre-inspection is pickup phase
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
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Pre-Inspection Photos
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Upload timestamped photos before handover
            </CardDescription>
          </div>
          {status.complete ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="secondary">
              {status.uploaded.length}/{REQUIRED_PHOTOS.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {REQUIRED_PHOTOS.map((photoType) => {
            const photo = pickupPhotos.find(p => p.photo_type === photoType);
            const isUploading = uploadingPhoto === photoType;
            const isUploaded = !!photo;

            return (
              <div
                key={photoType}
                className={`
                  relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer
                  ${isUploaded ? 'border-green-500 bg-green-500/5' : 'border-muted-foreground/25 hover:border-primary'}
                `}
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
                    if (file) {
                      handleFileSelect(photoType, file);
                    }
                    e.target.value = '';
                  }}
                />

                <div className="flex flex-col items-center gap-2 text-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isUploaded ? 'bg-green-500 text-white' : 'bg-muted'}
                  `}>
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isUploaded ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      PHOTO_ICONS[photoType]
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{PHOTO_LABELS[photoType]}</p>
                    {isUploading && (
                      <p className="text-xs text-muted-foreground">Uploading...</p>
                    )}
                    {!isUploading && !isUploaded && (
                      <p className="text-xs text-muted-foreground">
                        <Upload className="h-3 w-3 inline mr-1" />
                        Upload
                      </p>
                    )}
                    {isUploaded && (
                      <p className="text-xs text-green-600">✓ Captured</p>
                    )}
                  </div>
                </div>

                {isUploaded && (
                  <div className="absolute top-1 right-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
