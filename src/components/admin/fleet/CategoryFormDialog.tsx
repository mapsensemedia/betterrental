/**
 * Category Form Dialog
 * Create/edit vehicle categories with all fields
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
import {
  useCreateFleetCategory,
  useUpdateFleetCategory,
  type FleetCategory,
} from "@/hooks/use-fleet-categories";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: FleetCategory | null;
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const isEdit = !!category;
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    daily_rate: "100",
    seats: "5",
    fuel_type: "Gas",
    transmission: "Automatic",
  });

  const createCategory = useCreateFleetCategory();
  const updateCategory = useUpdateFleetCategory();

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || "",
        image_url: category.image_url || "",
        daily_rate: String(category.daily_rate),
        seats: String(category.seats || 5),
        fuel_type: category.fuel_type || "Gas",
        transmission: category.transmission || "Automatic",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        image_url: "",
        daily_rate: "100",
        seats: "5",
        fuel_type: "Gas",
        transmission: "Automatic",
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      image_url: formData.image_url.trim() || undefined,
      daily_rate: parseFloat(formData.daily_rate) || 100,
      seats: parseInt(formData.seats) || 5,
      fuel_type: formData.fuel_type,
      transmission: formData.transmission,
    };

    if (isEdit && category) {
      await updateCategory.mutateAsync({ id: category.id, ...payload });
    } else {
      await createCategory.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the category details. This is what customers will see."
              : "Create a new vehicle category for customer browsing."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Economy Car - Versa or Similar"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_url">Category Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                type="url"
              />
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="h-24 w-full object-cover rounded-md border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Public Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description visible to customers..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="daily_rate">Daily Rate ($) *</Label>
                <Input
                  id="daily_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="seats">Seats</Label>
                <Select
                  value={formData.seats}
                  onValueChange={(value) => setFormData({ ...formData, seats: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 5, 6, 7, 8, 9].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} seats</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fuel Type</Label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(value) => setFormData({ ...formData, fuel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gas">Gas</SelectItem>
                    <SelectItem value="Electric">Electric</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Transmission</Label>
                <Select
                  value={formData.transmission}
                  onValueChange={(value) => setFormData({ ...formData, transmission: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Automatic">Automatic</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
