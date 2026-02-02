/**
 * VIN Form Dialog
 * Add vehicle to category VIN pool
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useAddVinToCategory } from "@/hooks/use-fleet-categories";
import { useLocations } from "@/hooks/use-locations";

interface VinFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
}

export function VinFormDialog({ open, onOpenChange, categoryId, categoryName }: VinFormDialogProps) {
  const [formData, setFormData] = useState({
    vin: "",
    license_plate: "",
    location_id: "",
    status: "available" as const,
    year: "",
    make: "",
    model: "",
    tank_capacity_liters: "",
    notes: "",
  });

  const addVin = useAddVinToCategory();
  const { data: locations } = useLocations();

  useEffect(() => {
    if (open) {
      setFormData({
        vin: "",
        license_plate: "",
        location_id: locations?.[0]?.id || "",
        status: "available",
        year: String(new Date().getFullYear()),
        make: "",
        model: "",
        tank_capacity_liters: "",
        notes: "",
      });
    }
  }, [open, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await addVin.mutateAsync({
      category_id: categoryId,
      vin: formData.vin.trim(),
      license_plate: formData.license_plate.trim(),
      location_id: formData.location_id,
      status: formData.status,
      year: formData.year ? parseInt(formData.year) : undefined,
      make: formData.make.trim() || undefined,
      model: formData.model.trim() || undefined,
      tank_capacity_liters: formData.tank_capacity_liters ? parseFloat(formData.tank_capacity_liters) : undefined,
      notes: formData.notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Vehicle to {categoryName}</DialogTitle>
          <DialogDescription>
            Add a vehicle to this category's VIN pool.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="vin">VIN Number *</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                  placeholder="1HGBH41JXMN109186"
                  required
                  maxLength={17}
                  className="font-mono"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plate">Plate Number *</Label>
                <Input
                  id="plate"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                  required
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as typeof formData.status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on_rent">On Rent</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2030"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder={String(new Date().getFullYear())}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Toyota"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Camry"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tank_capacity">Fuel Tank Capacity (Liters)</Label>
              <Input
                id="tank_capacity"
                type="number"
                min="20"
                max="200"
                step="0.1"
                value={formData.tank_capacity_liters}
                onChange={(e) => setFormData({ ...formData, tank_capacity_liters: e.target.value })}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Used for fuel service add-on pricing calculation
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addVin.isPending || !formData.vin.trim() || !formData.license_plate.trim() || !formData.location_id}
            >
              {addVin.isPending ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
