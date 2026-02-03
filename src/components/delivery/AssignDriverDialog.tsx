import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { useAvailableDrivers } from "@/hooks/use-available-drivers";
import { useAssignDriver } from "@/hooks/use-assign-driver";

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  customerName: string;
}

export function AssignDriverDialog({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
  customerName,
}: AssignDriverDialogProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const { data: drivers, isLoading: driversLoading } = useAvailableDrivers();
  const assignDriver = useAssignDriver();

  const handleAssign = () => {
    if (!selectedDriverId) return;
    
    assignDriver.mutate(
      { bookingId, driverId: selectedDriverId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedDriverId("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
          <DialogDescription>
            Select a driver to assign to booking <strong>{bookingCode}</strong> for {customerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="driver">Select Driver</Label>
            {driversLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading drivers...
              </div>
            ) : drivers && drivers.length > 0 ? (
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{driver.fullName}</span>
                        {driver.phone && (
                          <span className="text-xs text-muted-foreground">
                            ({driver.phone})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No drivers available. Add users with the "driver" role first.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedDriverId || assignDriver.isPending}
          >
            {assignDriver.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
