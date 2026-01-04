import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Car,
  Camera,
  Wrench
} from 'lucide-react';
import { useVehicleReadyStatus } from '@/hooks/use-vehicle-prep';
import { useUpdateBookingStatus } from '@/hooks/use-bookings';

interface VehicleReadyGateProps {
  bookingId: string;
  currentStatus: string;
}

export function VehicleReadyGate({ bookingId, currentStatus }: VehicleReadyGateProps) {
  const { data: readyStatus, isLoading } = useVehicleReadyStatus(bookingId);
  const updateStatus = useUpdateBookingStatus();

  // Only show for confirmed bookings
  if (currentStatus !== 'confirmed') return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!readyStatus) return null;

  const handleMarkReady = () => {
    // This would update a custom field or trigger a workflow
    // For now, we'll just show the status
    updateStatus.mutate({ 
      bookingId, 
      newStatus: 'confirmed' // Status stays confirmed, but we track "ready" state
    });
  };

  return (
    <Card className={readyStatus.isReady ? 'border-green-500/50' : 'border-yellow-500/50'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" />
            Vehicle Ready Status
          </CardTitle>
          {readyStatus.isReady ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Ready for Handover
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Not Ready
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {readyStatus.isReady ? (
          <Alert className="border-green-500/50 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">All requirements met</AlertTitle>
            <AlertDescription className="text-green-600">
              Vehicle prep and pre-inspection photos are complete. Ready for customer handover.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {!readyStatus.prepComplete && (
              <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/5">
                <Wrench className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-700">Prep Checklist Incomplete</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {readyStatus.incompletePrepItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {!readyStatus.photosComplete && (
              <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/5">
                <Camera className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-700">Pre-Inspection Photos Missing</AlertTitle>
                <AlertDescription className="text-yellow-600">
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {readyStatus.missingPhotos.map((photo, i) => (
                      <li key={i} className="capitalize">{photo.replace('_', ' ')}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
