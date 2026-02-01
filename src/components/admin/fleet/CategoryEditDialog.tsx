/**
 * Category Edit Dialog
 * Dialog for editing fleet category info and pricing
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUpdateFleetCategory, FleetCategory } from "@/hooks/use-fleet-categories";

interface CategoryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: FleetCategory | null;
}

export function CategoryEditDialog({ open, onOpenChange, category }: CategoryEditDialogProps) {
  const updateCategory = useUpdateFleetCategory();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    daily_rate: "",
    seats: "",
    fuel_type: "Gas",
    transmission: "Automatic",
    is_active: true,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        daily_rate: String(category.daily_rate || ""),
        seats: String(category.seats || ""),
        fuel_type: category.fuel_type || "Gas",
        transmission: category.transmission || "Automatic",
        is_active: category.is_active ?? true,
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    await updateCategory.mutateAsync({
      id: category.id,
      name: formData.name,
      description: formData.description || null,
      daily_rate: Number(formData.daily_rate) || 0,
      seats: Number(formData.seats) || 5,
      fuel_type: formData.fuel_type,
      transmission: formData.transmission,
      is_active: formData.is_active,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update category details and pricing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Mid-Size SUV"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily_rate">Daily Rate ($)</Label>
              <Input
                id="daily_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.daily_rate}
                onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                placeholder="100.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seats">Seats</Label>
              <Input
                id="seats"
                type="number"
                min="1"
                max="15"
                value={formData.seats}
                onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                placeholder="5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuel_type">Fuel Type</Label>
              <Select
                value={formData.fuel_type}
                onValueChange={(v) => setFormData({ ...formData, fuel_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gas">Gas</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transmission">Transmission</Label>
              <Select
                value={formData.transmission}
                onValueChange={(v) => setFormData({ ...formData, transmission: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transmission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Automatic">Automatic</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="is_active" className="font-medium">Active</Label>
              <p className="text-sm text-muted-foreground">
                Make this category available for booking
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCategory.isPending}>
              {updateCategory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
