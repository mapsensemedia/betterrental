/**
 * Seed Fleet Categories Component
 * Allows admins to populate the database with sample categories and vehicles
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Database, Car, CheckCircle2 } from "lucide-react";
import { FLEET_CATEGORIES, CategorySeedData } from "@/lib/seed-categories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface SeedFleetCategoriesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeedFleetCategories({ open, onOpenChange }: SeedFleetCategoriesProps) {
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    FLEET_CATEGORIES.map((c) => c.name)
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentCategory: "" });

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSeed = async () => {
    const categoriesToSeed = FLEET_CATEGORIES.filter((c) => selectedCategories.includes(c.name));
    if (!categoriesToSeed.length) return;

    setIsSeeding(true);
    setProgress({ current: 0, total: categoriesToSeed.length, currentCategory: "" });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to seed data");
        return;
      }

      for (let i = 0; i < categoriesToSeed.length; i++) {
        const cat = categoriesToSeed[i];
        setProgress({ current: i + 1, total: categoriesToSeed.length, currentCategory: cat.name });

        // Create category
        const { data: category, error: catError } = await supabase
          .from("vehicle_categories")
          .insert({
            name: cat.name,
            description: cat.description,
            created_by: user.id,
          })
          .select()
          .single();

        if (catError) {
          if (catError.code === "23505") {
            // Category already exists, skip
            toast.info(`Category "${cat.name}" already exists, skipping`);
            continue;
          }
          throw catError;
        }

        // Create vehicles and units for this category
        for (const vehicle of cat.vehicles) {
          // Check if vehicle exists
          let vehicleId: string;
          const { data: existingVehicle } = await supabase
            .from("vehicles")
            .select("id")
            .eq("make", vehicle.make)
            .eq("model", vehicle.model)
            .eq("year", vehicle.year)
            .maybeSingle();

          if (existingVehicle) {
            vehicleId = existingVehicle.id;
          } else {
            // Create vehicle entry
            const { data: newVehicle, error: vehicleError } = await supabase
              .from("vehicles")
              .insert({
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                daily_rate: Math.round(vehicle.acquisitionCost / 300), // Estimate daily rate
                description: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                category: cat.name,
              })
              .select()
              .single();

            if (vehicleError) throw vehicleError;
            vehicleId = newVehicle.id;
          }

          // Check if unit with this VIN exists
          const { data: existingUnit } = await supabase
            .from("vehicle_units")
            .select("id")
            .eq("vin", vehicle.vin)
            .maybeSingle();

          if (existingUnit) {
            // Update to assign to category
            await supabase
              .from("vehicle_units")
              .update({ category_id: category.id })
              .eq("id", existingUnit.id);
          } else {
            // Create vehicle unit
            await supabase.from("vehicle_units").insert({
              vehicle_id: vehicleId,
              vin: vehicle.vin,
              license_plate: vehicle.licensePlate,
              acquisition_cost: vehicle.acquisitionCost,
              current_mileage: vehicle.currentMileage,
              purchase_date: new Date(2023, Math.floor(Math.random() * 12), 1).toISOString(),
              category_id: category.id,
              status: "active",
            });
          }
        }
      }

      toast.success(`Successfully seeded ${categoriesToSeed.length} categories with vehicles!`);
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Seed error:", error);
      toast.error(`Failed to seed data: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const totalVehicles = FLEET_CATEGORIES
    .filter((c) => selectedCategories.includes(c.name))
    .reduce((sum, c) => sum + c.vehicles.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Seed Fleet Categories
          </DialogTitle>
          <DialogDescription>
            Populate your fleet with sample categories and vehicles. Select which categories to add.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {FLEET_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCategories.includes(cat.name) 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-muted-foreground/50"
                }`}
                onClick={() => toggleCategory(cat.name)}
              >
                <Checkbox
                  checked={selectedCategories.includes(cat.name)}
                  onCheckedChange={() => toggleCategory(cat.name)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{cat.name}</p>
                    <Badge variant="secondary" className="shrink-0">
                      <Car className="w-3 h-3 mr-1" />
                      {cat.vehicles.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...new Set(cat.vehicles.map((v) => `${v.make} ${v.model}`))].slice(0, 3).map((model) => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {isSeeding && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Seeding {progress.current}/{progress.total}: {progress.currentCategory}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            <CheckCircle2 className="w-4 h-4" />
            {selectedCategories.length} categories, {totalVehicles} vehicles selected
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSeeding}>
            Cancel
          </Button>
          <Button onClick={handleSeed} disabled={isSeeding || !selectedCategories.length}>
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Seeding...
              </>
            ) : (
              "Seed Categories"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
