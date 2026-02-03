/**
 * AdditionalDriversCard - Component to add/remove additional drivers with age selection
 * Each additional driver in the 21-25 age range incurs a young driver fee
 */
import { useState } from "react";
import { Users, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { YOUNG_DRIVER_FEE, DriverAgeBand } from "@/lib/pricing";

export interface AdditionalDriver {
  id: string;
  name: string;
  ageBand: DriverAgeBand;
}

interface AdditionalDriversCardProps {
  drivers: AdditionalDriver[];
  onDriversChange: (drivers: AdditionalDriver[]) => void;
  rentalDays: number;
  className?: string;
}

export function AdditionalDriversCard({
  drivers,
  onDriversChange,
  rentalDays,
  className,
}: AdditionalDriversCardProps) {
  const [isExpanded, setIsExpanded] = useState(drivers.length > 0);

  const addDriver = () => {
    const newDriver: AdditionalDriver = {
      id: crypto.randomUUID(),
      name: "",
      ageBand: "25_70", // Default to 25-70 (no young driver fee)
    };
    onDriversChange([...drivers, newDriver]);
    setIsExpanded(true);
  };

  const removeDriver = (id: string) => {
    onDriversChange(drivers.filter((d) => d.id !== id));
  };

  const updateDriver = (id: string, updates: Partial<AdditionalDriver>) => {
    onDriversChange(
      drivers.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  // Calculate total additional driver fees
  const youngDriverCount = drivers.filter((d) => d.ageBand === "20_24").length;
  const totalYoungDriverFees = youngDriverCount * YOUNG_DRIVER_FEE;
  const baseDriverFee = 15.99; // Per day per additional driver
  const totalBaseFees = drivers.length * baseDriverFee * rentalDays;
  const totalFees = totalBaseFees + totalYoungDriverFees;

  return (
    <Card className={cn("p-4 transition-all", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Additional Drivers</h3>
            <p className="text-sm text-muted-foreground">
              CA${baseDriverFee.toFixed(2)} / day per driver
            </p>
          </div>
        </div>

        {drivers.length === 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={addDriver}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </Button>
        ) : (
          <div className="text-right">
            <p className="font-semibold">CA${totalFees.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {drivers.length} driver{drivers.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {drivers.length > 0 && (
        <div className="space-y-4 mt-4">
          {drivers.map((driver, index) => (
            <div
              key={driver.id}
              className="p-4 border border-border rounded-lg bg-muted/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Additional Driver {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeDriver(driver.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`driver-name-${driver.id}`}>
                    Driver Name (optional)
                  </Label>
                  <Input
                    id={`driver-name-${driver.id}`}
                    placeholder="Enter name"
                    value={driver.name}
                    onChange={(e) =>
                      updateDriver(driver.id, { name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`driver-age-${driver.id}`}>Age Range *</Label>
                  <Select
                    value={driver.ageBand}
                    onValueChange={(value: DriverAgeBand) =>
                      updateDriver(driver.id, { ageBand: value })
                    }
                  >
                    <SelectTrigger id={`driver-age-${driver.id}`}>
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25_70">25-70 years</SelectItem>
                      <SelectItem value="20_24">
                        20-24 years (+${YOUNG_DRIVER_FEE} fee)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {driver.ageBand === "20_24" && (
                <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-md">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    A CAD ${YOUNG_DRIVER_FEE} young driver fee applies for drivers
                    aged 20-24.
                  </p>
                </div>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addDriver}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Driver
          </Button>

          {youngDriverCount > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Base ({drivers.length} × ${baseDriverFee}/day × {rentalDays}{" "}
                  days)
                </span>
                <span>CA${totalBaseFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-600">
                <span>
                  Young driver fees ({youngDriverCount} × ${YOUNG_DRIVER_FEE})
                </span>
                <span>CA${totalYoungDriverFees.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Calculate total additional drivers cost
 */
export function calculateAdditionalDriversCost(
  drivers: AdditionalDriver[],
  rentalDays: number
): { baseFees: number; youngDriverFees: number; total: number } {
  const baseDriverFee = 15.99;
  const youngDriverCount = drivers.filter((d) => d.ageBand === "20_24").length;
  const baseFees = drivers.length * baseDriverFee * rentalDays;
  const youngDriverFees = youngDriverCount * YOUNG_DRIVER_FEE;
  return {
    baseFees,
    youngDriverFees,
    total: baseFees + youngDriverFees,
  };
}
