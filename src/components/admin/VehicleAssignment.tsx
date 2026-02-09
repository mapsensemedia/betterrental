import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { 
  useAvailableVehicles, 
  useAssignVehicle,
  useCheckVehicleAvailability,
  useUnassignVehicle,
} from '@/hooks/use-vehicle-assignment';

interface VehicleAssignmentProps {
  bookingId: string;
  currentVehicleId: string | null;
  currentVehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
  } | null;
  locationId: string;
  startAt: string;
  endAt: string;
  onChangeCategoryClick?: () => void;
}

export function VehicleAssignment({
  bookingId,
  currentVehicleId,
  currentVehicle,
  locationId,
  startAt,
  endAt,
  onChangeCategoryClick,
}: VehicleAssignmentProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: availableVehicles = [], isLoading: loadingVehicles } = useAvailableVehicles(
    locationId,
    startAt,
    endAt,
    bookingId
  );

  const { data: conflictCheck } = useCheckVehicleAvailability(
    currentVehicleId,
    startAt,
    endAt,
    bookingId
  );

  const assignVehicle = useAssignVehicle();
  const unassignVehicle = useUnassignVehicle();

  const handleAssign = () => {
    if (!selectedVehicleId) return;
    
    assignVehicle.mutate({
      bookingId,
      vehicleId: selectedVehicleId,
      startAt,
      endAt,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedVehicleId(null);
      },
    });
  };

  const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle Assignment
            </CardTitle>
            {currentVehicle ? (
              <Badge className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Assigned
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unassigned
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentVehicle ? (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">
                {currentVehicle.year} {currentVehicle.make} {currentVehicle.model}
              </p>
              {conflictCheck && !conflictCheck.isAvailable && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Conflict Detected</AlertTitle>
                  <AlertDescription>
                    This vehicle has overlapping bookings:
                    <ul className="list-disc list-inside mt-1">
                      {conflictCheck.conflicts.map((c, i) => (
                        <li key={i} className="text-xs">
                          {c.bookingCode}: {format(new Date(c.startAt), 'MMM d')} - {format(new Date(c.endAt), 'MMM d')}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No vehicle assigned. Select a vehicle to lock inventory.
              </AlertDescription>
            </Alert>
          )}

          {currentVehicle ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  onClick={() => setDialogOpen(true)} 
                  variant="outline"
                  className="flex-1"
                >
                  Change Vehicle
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => unassignVehicle.mutate(bookingId)}
                  disabled={unassignVehicle.isPending}
                >
                  {unassignVehicle.isPending ? "..." : "Remove"}
                </Button>
              </div>
              {onChangeCategoryClick && (
                <Button 
                  onClick={onChangeCategoryClick} 
                  variant="outline"
                  className="w-full"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Change Vehicle Category
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={() => setDialogOpen(true)} 
                className="w-full"
              >
                Assign Vehicle
              </Button>
              {onChangeCategoryClick && (
                <Button 
                  onClick={onChangeCategoryClick} 
                  variant="outline"
                  className="w-full"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Change Vehicle Category
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle</DialogTitle>
            <DialogDescription>
              Select an available vehicle for this booking period:
              <span className="font-medium block mt-1">
                {format(new Date(startAt), 'MMM d, yyyy')} - {format(new Date(endAt), 'MMM d, yyyy')}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingVehicles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableVehicles.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No vehicles available at this location for the selected dates.
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedVehicleId || ''}
                onValueChange={setSelectedVehicleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.daily_rate}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedVehicle && (
              <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-4">
                {selectedVehicle.image_url && (
                  <img
                    src={selectedVehicle.image_url}
                    alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                    className="w-20 h-14 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedVehicle.category} • ${selectedVehicle.daily_rate}/day
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedVehicleId || assignVehicle.isPending}
            >
              {assignVehicle.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  Assign Vehicle
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
