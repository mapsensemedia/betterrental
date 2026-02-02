/**
 * Vehicle Unit Edit Dialog
 * Dialog for editing vehicle unit info, cost, and status
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUpdateVehicleUnit, VehicleUnit } from "@/hooks/use-vehicle-units";
import { useFleetCategories } from "@/hooks/use-fleet-categories";
import { useLocations } from "@/hooks/use-locations";

interface VehicleUnitEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: VehicleUnit | null;
}

export function VehicleUnitEditDialog({ open, onOpenChange, unit }: VehicleUnitEditDialogProps) {
  const updateUnit = useUpdateVehicleUnit();
  const { data: categories } = useFleetCategories();
  const { data: locations } = useLocations();

  const NO_CATEGORY_VALUE = "none";

  const [formData, setFormData] = useState({
    vin: "",
    license_plate: "",
    color: "",
    acquisition_cost: "",
    acquisition_date: "",
    mileage_at_acquisition: "",
    current_mileage: "",
    tank_capacity_liters: "",
    category_id: NO_CATEGORY_VALUE,
    status: "active",
    notes: "",
  });

  useEffect(() => {
    if (unit) {
      setFormData({
        vin: unit.vin || "",
        license_plate: unit.license_plate || "",
        color: unit.color || "",
        acquisition_cost: String(unit.acquisition_cost || ""),
        acquisition_date: unit.acquisition_date || "",
        mileage_at_acquisition: unit.mileage_at_acquisition ? String(unit.mileage_at_acquisition) : "",
        current_mileage: unit.current_mileage ? String(unit.current_mileage) : "",
        tank_capacity_liters: unit.tank_capacity_liters ? String(unit.tank_capacity_liters) : "",
        category_id: unit.category_id || NO_CATEGORY_VALUE,
        status: unit.status || "active",
        notes: unit.notes || "",
      });
    }
  }, [unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    await updateUnit.mutateAsync({
      id: unit.id,
      vin: formData.vin,
      license_plate: formData.license_plate || null,
      color: formData.color || null,
      acquisition_cost: Number(formData.acquisition_cost) || 0,
      acquisition_date: formData.acquisition_date || null,
      mileage_at_acquisition: formData.mileage_at_acquisition ? Number(formData.mileage_at_acquisition) : null,
      current_mileage: formData.current_mileage ? Number(formData.current_mileage) : null,
      tank_capacity_liters: formData.tank_capacity_liters ? Number(formData.tank_capacity_liters) : null,
      category_id: formData.category_id === NO_CATEGORY_VALUE ? null : formData.category_id,
      status: formData.status,
      notes: formData.notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle Unit</DialogTitle>
          <DialogDescription>
            Update vehicle details, cost information, and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                placeholder="17-character VIN"
                required
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_plate">License Plate</Label>
              <Input
                id="license_plate"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                placeholder="ABC-1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="e.g., Black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_rent">On Rent</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(v) => setFormData({ ...formData, category_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY_VALUE}>No Category</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acquisition_cost">Acquisition Cost ($)</Label>
              <Input
                id="acquisition_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.acquisition_cost}
                onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
                placeholder="25000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acquisition_date">Acquisition Date</Label>
              <Input
                id="acquisition_date"
                type="date"
                value={formData.acquisition_date}
                onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mileage_at_acquisition">Mileage at Acquisition</Label>
              <Input
                id="mileage_at_acquisition"
                type="number"
                min="0"
                value={formData.mileage_at_acquisition}
                onChange={(e) => setFormData({ ...formData, mileage_at_acquisition: e.target.value })}
                placeholder="10000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_mileage">Current Mileage</Label>
              <Input
                id="current_mileage"
                type="number"
                min="0"
                value={formData.current_mileage}
                onChange={(e) => setFormData({ ...formData, current_mileage: e.target.value })}
                placeholder="25000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tank_capacity_liters">Fuel Tank Capacity (Liters)</Label>
            <Input
              id="tank_capacity_liters"
              type="number"
              min="20"
              max="200"
              step="0.1"
              value={formData.tank_capacity_liters}
              onChange={(e) => setFormData({ ...formData, tank_capacity_liters: e.target.value })}
              placeholder="60"
            />
            <p className="text-xs text-muted-foreground">
              Used to calculate pre-purchase fuel pricing for this specific vehicle
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this vehicle..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUnit.isPending}>
              {updateUnit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
