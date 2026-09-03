import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import {
  findPlateConflicts,
  normalizePlate,
  useSetVehiclePlate,
  type PlateConflict,
  type VehicleUnit,
} from "@/hooks/use-vehicle-units";

/**
 * Add, replace or remove the licence plate on a vehicle.
 * A plate can only live on one vehicle at a time — if it is already in use the
 * dialog offers to transfer it (clearing it from the other vehicle).
 */
export function PlateDialog({
  unit,
  open,
  onOpenChange,
}: {
  unit: VehicleUnit | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [plate, setPlate] = useState("");
  const [conflicts, setConflicts] = useState<PlateConflict[]>([]);
  const [checking, setChecking] = useState(false);
  const setPlateMutation = useSetVehiclePlate();

  useEffect(() => {
    if (open) {
      setPlate(unit?.license_plate ?? "");
      setConflicts([]);
    }
  }, [open, unit]);

  // Live duplicate check
  useEffect(() => {
    if (!open || !unit) return;
    const value = normalizePlate(plate);
    if (!value || value === normalizePlate(unit.license_plate ?? "")) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(async () => {
      const found = await findPlateConflicts(value, unit.id);
      if (!cancelled) {
        setConflicts(found);
        setChecking(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [plate, open, unit]);

  if (!unit) return null;

  const vehicleLabel = [unit.vehicle?.make, unit.vehicle?.model].filter(Boolean).join(" ");
  const trimmed = normalizePlate(plate);
  const hasConflict = conflicts.length > 0;

  const save = async (transfer = false) => {
    await setPlateMutation.mutateAsync({ id: unit.id, plate: trimmed || null, transfer });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{unit.license_plate ? "Change or remove plate" : "Add plate"}</DialogTitle>
          <DialogDescription>
            {vehicleLabel || "Vehicle"} — VIN <span className="font-mono">{unit.vin}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="plate-input">Licence plate</Label>
          <Input
            id="plate-input"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="e.g. A628YX"
            className="font-mono uppercase"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty and save to remove the plate from this vehicle.
          </p>
        </div>

        {hasConflict && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Plate {trimmed} is already on{" "}
              {conflicts
                .map((c) => `${[c.make, c.model].filter(Boolean).join(" ")} (${c.vin})`)
                .join(", ")}
              . Transferring moves the plate here and leaves the other vehicle without one.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {unit.license_plate && (
            <Button
              variant="outline"
              className="text-destructive"
              disabled={setPlateMutation.isPending}
              onClick={() => setPlateMutation.mutateAsync({ id: unit.id, plate: null }).then(() => onOpenChange(false))}
            >
              Remove plate
            </Button>
          )}
          {hasConflict ? (
            <Button
              variant="destructive"
              disabled={setPlateMutation.isPending || checking}
              onClick={() => save(true)}
            >
              Transfer plate
            </Button>
          ) : (
            <Button disabled={setPlateMutation.isPending || checking} onClick={() => save(false)}>
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
