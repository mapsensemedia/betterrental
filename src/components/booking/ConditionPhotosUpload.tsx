import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  CheckCircle2, 
  Circle,
  Loader2,
  Car,
  Fuel,
  Gauge
} from 'lucide-react';
import { 
  useBookingConditionPhotos, 
  useUploadConditionPhoto,
  REQUIRED_PHOTOS,
  PHOTO_LABELS,
  getPhotoCompletionStatus,
  type PhotoPhase,
  type PhotoType 
} from '@/hooks/use-condition-photos';

interface ConditionPhotosUploadProps {
  bookingId: string;
  bookingStatus: string;
}

const PHOTO_ICONS: Record<PhotoType, React.ReactNode> = {
  front: <Car className="h-4 w-4" />,
  back: <Car className="h-4 w-4 rotate-180" />,
  left: <Car className="h-4 w-4 -rotate-90" />,
  right: <Car className="h-4 w-4 rotate-90" />,
  odometer: <Gauge className="h-4 w-4" />,
  fuel_gauge: <Fuel className="h-4 w-4" />,
};

export function ConditionPhotosUpload({ bookingId, bookingStatus }: ConditionPhotosUploadProps) {
  const { data: photos, isLoading } = useBookingConditionPhotos(bookingId);
  const uploadMutation = useUploadConditionPhoto();
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const canUploadPickup = ['confirmed', 'active'].includes(bookingStatus);
  const canUploadReturn = bookingStatus === 'active';

  const handleFileSelect = async (phase: PhotoPhase, photoType: PhotoType, file: File) => {
    const key = `${phase}-${photoType}`;
    setUploadingPhoto(key);
    try {
      await uploadMutation.mutateAsync({
        bookingId,
        phase,
        photoType,
        file,
      });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleUploadClick = (phase: PhotoPhase, photoType: PhotoType) => {
    const key = `${phase}-${photoType}`;
    fileInputRefs.current[key]?.click();
  };

  const renderPhotoGrid = (phase: PhotoPhase, canUpload: boolean) => {
    const phasePhotos = phase === 'pickup' ? photos?.pickup || [] : photos?.return || [];
    const status = getPhotoCompletionStatus(phasePhotos, phase);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {status.uploaded.length} of {REQUIRED_PHOTOS.length} photos
            </span>
            {status.complete && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {REQUIRED_PHOTOS.map((photoType) => {
            const photo = phasePhotos.find(p => p.photo_type === photoType);
            const key = `${phase}-${photoType}`;
            const isUploading = uploadingPhoto === key;
            const isUploaded = !!photo;

            return (
              <div
                key={key}
                className={`
                  relative border rounded-lg p-3 transition-colors
                  ${isUploaded ? 'border-green-500 bg-green-500/5' : 'border-dashed'}
                  ${canUpload && !isUploading ? 'hover:border-primary cursor-pointer' : ''}
                `}
                onClick={() => canUpload && !isUploading && handleUploadClick(phase, photoType)}
              >
                <input
                  ref={(el) => (fileInputRefs.current[key] = el)}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(phase, photoType, file);
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
                    {!isUploading && !isUploaded && canUpload && (
                      <p className="text-xs text-muted-foreground">Tap to capture</p>
                    )}
                    {isUploaded && (
                      <p className="text-xs text-green-600">Captured</p>
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

        {!canUpload && (
          <p className="text-sm text-muted-foreground text-center">
            {phase === 'pickup' 
              ? 'Pickup photos can only be uploaded when booking is confirmed or active.'
              : 'Return photos can only be uploaded when booking is active.'}
          </p>
        )}
      </div>
    );
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

  const pickupStatus = getPhotoCompletionStatus(photos?.pickup || [], 'pickup');
  const returnStatus = getPhotoCompletionStatus(photos?.return || [], 'return');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Vehicle Condition Photos
            </CardTitle>
            <CardDescription>
              Document the vehicle condition at pickup and return
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pickup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pickup" className="flex items-center gap-2">
              {pickupStatus.complete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              Pickup Photos
            </TabsTrigger>
            <TabsTrigger value="return" className="flex items-center gap-2">
              {returnStatus.complete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              Return Photos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pickup" className="mt-4">
            {renderPhotoGrid('pickup', canUploadPickup)}
          </TabsContent>
          <TabsContent value="return" className="mt-4">
            {renderPhotoGrid('return', canUploadReturn)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
