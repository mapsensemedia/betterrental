/**
 * VIN Assignment Dialog
 * Multi-select VINs to assign to a category
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useVehicleUnits } from "@/hooks/use-vehicle-units";
import { useAssignVehiclesToCategory, VehicleCategory } from "@/hooks/use-vehicle-categories";
import { Search, Car } from "lucide-react";

interface VinAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: VehicleCategory | null;
}

export function VinAssignmentDialog({ open, onOpenChange, category }: VinAssignmentDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allUnits, isLoading } = useVehicleUnits();
  const assignMutation = useAssignVehiclesToCategory();

  // Pre-select units already in this category
  useEffect(() => {
    if (category && allUnits) {
      const alreadyAssigned = allUnits
        .filter((u: any) => u.category_id === category.id)
        .map((u) => u.id);
      setSelectedIds(new Set(alreadyAssigned));
    } else {
      setSelectedIds(new Set());
    }
  }, [category, allUnits, open]);

  const filteredUnits = allUnits?.filter((unit) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const vehicle = unit.vehicle as any;
    return (
      unit.vin?.toLowerCase().includes(searchLower) ||
      unit.license_plate?.toLowerCase().includes(searchLower) ||
      vehicle?.make?.toLowerCase().includes(searchLower) ||
      vehicle?.model?.toLowerCase().includes(searchLower)
    );
  });

  const toggleUnit = (unitId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(unitId)) {
      newSet.delete(unitId);
    } else {
      newSet.add(unitId);
    }
    setSelectedIds(newSet);
  };

  const handleAssign = async () => {
    if (!category) return;
    try {
      await assignMutation.mutateAsync({
        categoryId: category.id,
        unitIds: Array.from(selectedIds),
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Vehicles to Category</DialogTitle>
          <DialogDescription>
            Select vehicles to add to "{category?.name}". A vehicle can only belong to one category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by VIN, plate, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedIds.size} vehicle{selectedIds.size !== 1 ? "s" : ""} selected
          </div>

          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading vehicles...</div>
            ) : !filteredUnits?.length ? (
              <div className="p-4 text-center text-muted-foreground">No vehicles found</div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredUnits.map((unit) => {
                  const vehicle = unit.vehicle as any;
                  const isSelected = selectedIds.has(unit.id);
                  const isInOtherCategory = unit.category_id && unit.category_id !== category?.id;

                  return (
                    <div
                      key={unit.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleUnit(unit.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleUnit(unit.id)}
                      />
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {vehicle?.year} {vehicle?.make} {vehicle?.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          VIN: {unit.vin} • {unit.license_plate || "No plate"}
                        </p>
                      </div>
                      {isInOtherCategory && (
                        <Badge variant="outline" className="text-xs">
                          In other category
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? "Assigning..." : "Assign Vehicles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
