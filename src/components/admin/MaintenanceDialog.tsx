import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Wrench, CheckCircle } from "lucide-react";
import { useSetVehicleMaintenance, useClearVehicleMaintenance } from "@/hooks/use-vehicle-maintenance";

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  currentStatus: string | null;
  currentReason: string | null;
  currentUntil: string | null;
}

export function MaintenanceDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleName,
  currentStatus,
  currentReason,
  currentUntil,
}: MaintenanceDialogProps) {
  const [reason, setReason] = useState(currentReason || "");
  const [maintenanceUntil, setMaintenanceUntil] = useState(currentUntil || "");
  
  const setMaintenance = useSetVehicleMaintenance();
  const clearMaintenance = useClearVehicleMaintenance();

  const isMaintenance = currentStatus === "maintenance";

  const handleSetMaintenance = () => {
    if (!reason.trim()) return;
    
    setMaintenance.mutate({
      vehicleId,
      reason: reason.trim(),
      maintenanceUntil: maintenanceUntil || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setReason("");
        setMaintenanceUntil("");
      }
    });
  };

  const handleClearMaintenance = () => {
    clearMaintenance.mutate(vehicleId, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {isMaintenance ? "Clear Maintenance" : "Mark for Maintenance"}
          </DialogTitle>
          <DialogDescription>
            {vehicleName}
          </DialogDescription>
        </DialogHeader>

        {isMaintenance ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="font-medium text-amber-600">Currently in maintenance</p>
              {currentReason && (
                <p className="text-sm text-muted-foreground mt-1">Reason: {currentReason}</p>
              )}
              {currentUntil && (
                <p className="text-sm text-muted-foreground">
                  Expected return: {format(new Date(currentUntil), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Clear maintenance to make this vehicle available for bookings again.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Scheduled service, damage repair, tire replacement..."
              />
            </div>
            <div>
              <Label>Expected Return Date (optional)</Label>
              <Input
                type="date"
                value={maintenanceUntil}
                onChange={(e) => setMaintenanceUntil(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Vehicle will be unavailable for bookings during maintenance
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {isMaintenance ? (
            <Button 
              onClick={handleClearMaintenance}
              disabled={clearMaintenance.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {clearMaintenance.isPending ? "Clearing..." : "Clear Maintenance"}
            </Button>
          ) : (
            <Button 
              onClick={handleSetMaintenance}
              disabled={!reason.trim() || setMaintenance.isPending}
            >
              <Wrench className="w-4 h-4 mr-2" />
              {setMaintenance.isPending ? "Saving..." : "Mark Maintenance"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
