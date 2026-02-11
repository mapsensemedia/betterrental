/**
 * AdditionalDriversCard - Component to add/remove additional drivers with age selection
 * Reads base driver fee from system_settings via useDriverFeeSettings hook.
 */
import { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DriverAgeBand } from "@/lib/pricing";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";

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
  drivers, onDriversChange, rentalDays, className,
}: AdditionalDriversCardProps) {
  const [isExpanded, setIsExpanded] = useState(drivers.length > 0);
  const { data: feeSettings } = useDriverFeeSettings();
  const baseDriverFee = feeSettings?.additionalDriverDailyRate ?? 15.99;

  const addDriver = () => {
    const newDriver: AdditionalDriver = {
      id: crypto.randomUUID(),
      name: "",
      ageBand: "25_70",
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

  const totalBaseFees = drivers.length * baseDriverFee * rentalDays;

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
              ${baseDriverFee.toFixed(2)} CAD / day per driver
            </p>
          </div>
        </div>

        {drivers.length === 0 ? (
          <Button variant="outline" size="sm" onClick={addDriver} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Driver
          </Button>
        ) : (
          <div className="text-right">
            <p className="font-semibold">${totalBaseFees.toFixed(2)} CAD</p>
            <p className="text-xs text-muted-foreground">
              {drivers.length} driver{drivers.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {drivers.length > 0 && (
        <div className="space-y-4 mt-4">
          {drivers.map((driver, index) => (
            <div key={driver.id} className="p-4 border border-border rounded-lg bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Additional Driver {index + 1}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeDriver(driver.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`driver-name-${driver.id}`}>Driver Name (optional)</Label>
                  <Input id={`driver-name-${driver.id}`} placeholder="Enter name" value={driver.name} onChange={(e) => updateDriver(driver.id, { name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`driver-age-${driver.id}`}>Age Range *</Label>
                  <Select value={driver.ageBand} onValueChange={(value: DriverAgeBand) => updateDriver(driver.id, { ageBand: value })}>
                    <SelectTrigger id={`driver-age-${driver.id}`}>
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25_70">25-70 years</SelectItem>
                      <SelectItem value="20_24">20-24 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addDriver} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Another Driver
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Calculate total additional drivers cost using provided fee rate
 */
export function calculateAdditionalDriversCost(
  drivers: AdditionalDriver[],
  rentalDays: number,
  baseDriverFee: number = 15.99
): { baseFees: number; youngDriverFees: number; total: number } {
  const baseFees = drivers.length * baseDriverFee * rentalDays;
  return {
    baseFees,
    youngDriverFees: 0,
    total: baseFees,
  };
}
