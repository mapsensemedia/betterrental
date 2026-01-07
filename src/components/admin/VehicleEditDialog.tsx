import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocations } from "@/hooks/use-locations";
import { Loader2 } from "lucide-react";

interface VehicleData {
  id: string;
  make: string;
  model: string;
  year: number;
  category: string;
  daily_rate: number;
  location_id: string | null;
  is_available: boolean;
  is_featured: boolean;
  seats: number | null;
  transmission: string | null;
  fuel_type: string | null;
  image_url: string | null;
  cleaning_buffer_hours: number | null;
}

interface VehicleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleData | null;
  onSave: (data: Partial<VehicleData>) => void;
  isLoading?: boolean;
}

const CATEGORIES = ["Sedan", "SUV", "Electric", "Luxury", "Sports", "Compact", "Van"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid"];

export function VehicleEditDialog({ 
  open, 
  onOpenChange, 
  vehicle, 
  onSave,
  isLoading 
}: VehicleEditDialogProps) {
  const { data: locations = [] } = useLocations();
  
  const [formData, setFormData] = useState<Partial<VehicleData>>({});
  
  useEffect(() => {
    if (vehicle) {
      setFormData({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        category: vehicle.category,
        daily_rate: vehicle.daily_rate,
        location_id: vehicle.location_id,
        is_available: vehicle.is_available ?? true,
        is_featured: vehicle.is_featured ?? false,
        seats: vehicle.seats,
        transmission: vehicle.transmission,
        fuel_type: vehicle.fuel_type,
        image_url: vehicle.image_url,
        cleaning_buffer_hours: vehicle.cleaning_buffer_hours,
      });
    }
  }, [vehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = <K extends keyof VehicleData>(field: K, value: VehicleData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make || ""}
                  onChange={(e) => updateField("make", e.target.value)}
                  placeholder="e.g. BMW"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model || ""}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="e.g. X5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year || ""}
                  onChange={(e) => updateField("year", parseInt(e.target.value))}
                  placeholder="e.g. 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  value={formData.seats || ""}
                  onChange={(e) => updateField("seats", parseInt(e.target.value))}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          </div>

          {/* Category & Location */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Category & Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => updateField("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location_id || "none"}
                  onValueChange={(value) => updateField("location_id", value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Specifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select
                  value={formData.transmission || ""}
                  onValueChange={(value) => updateField("transmission", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((trans) => (
                      <SelectItem key={trans} value={trans}>
                        {trans}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Select
                  value={formData.fuel_type || ""}
                  onValueChange={(value) => updateField("fuel_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel} value={fuel}>
                        {fuel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pricing & Availability</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daily_rate">Daily Rate ($)</Label>
                <Input
                  id="daily_rate"
                  type="number"
                  step="0.01"
                  value={formData.daily_rate || ""}
                  onChange={(e) => updateField("daily_rate", parseFloat(e.target.value))}
                  placeholder="e.g. 150.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer">Cleaning Buffer (hours)</Label>
                <Input
                  id="buffer"
                  type="number"
                  value={formData.cleaning_buffer_hours || ""}
                  onChange={(e) => updateField("cleaning_buffer_hours", parseInt(e.target.value))}
                  placeholder="e.g. 2"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_available"
                  checked={formData.is_available ?? true}
                  onCheckedChange={(checked) => updateField("is_available", checked)}
                />
                <Label htmlFor="is_available">Available for Booking</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured ?? false}
                  onCheckedChange={(checked) => updateField("is_featured", checked)}
                />
                <Label htmlFor="is_featured">Featured Vehicle</Label>
              </div>
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url || ""}
              onChange={(e) => updateField("image_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
