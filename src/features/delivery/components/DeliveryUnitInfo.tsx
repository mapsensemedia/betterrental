import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Car, Gauge } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY UNIT INFO COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface UnitInfo {
  id: string;
  vin: string;
  licensePlate: string;
  color: string | null;
  currentMileage: number | null;
}

interface DeliveryUnitInfoProps {
  unit: UnitInfo | null | undefined;
  vehicleName?: string;
  showCard?: boolean;
  className?: string;
}

export function DeliveryUnitInfo({ 
  unit, 
  vehicleName,
  showCard = true,
  className 
}: DeliveryUnitInfoProps) {
  if (!unit) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-6 text-center">
          <Car className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No vehicle unit assigned</p>
        </CardContent>
      </Card>
    );
  }

  const handleCopyVin = async () => {
    try {
      await navigator.clipboard.writeText(unit.vin);
      toast.success("VIN copied to clipboard");
    } catch {
      toast.error("Failed to copy VIN");
    }
  };

  const content = (
    <div className="space-y-3">
      {/* VIN Row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">VIN</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">{unit.vin}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopyVin}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* License Plate */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">License Plate</span>
        <span className="font-mono text-sm font-medium bg-muted px-2 py-0.5 rounded">
          {unit.licensePlate}
        </span>
      </div>

      {/* Color */}
      {unit.color && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Color</span>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border" style={{ 
              backgroundColor: getColorHex(unit.color) 
            }} />
            <span className="text-sm capitalize">{unit.color}</span>
          </div>
        </div>
      )}

      {/* Mileage */}
      {unit.currentMileage && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Odometer</span>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {unit.currentMileage.toLocaleString()} mi
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Car className="h-4 w-4" />
          {vehicleName || 'Vehicle Details'}
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT UNIT DISPLAY (For cards)
// ─────────────────────────────────────────────────────────────────────────────

interface CompactUnitInfoProps {
  unit: UnitInfo | null | undefined;
  className?: string;
}

export function CompactUnitInfo({ unit, className }: CompactUnitInfoProps) {
  if (!unit) return null;

  return (
    <div className={cn("flex items-center gap-3 text-sm", className)}>
      <span className="font-mono font-medium bg-muted px-2 py-0.5 rounded text-xs">
        {unit.licensePlate}
      </span>
      {unit.color && (
        <span className="text-muted-foreground capitalize">{unit.color}</span>
      )}
      {unit.currentMileage && (
        <span className="text-muted-foreground">
          {unit.currentMileage.toLocaleString()} mi
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIN DISPLAY (For lists)
// ─────────────────────────────────────────────────────────────────────────────

interface VinDisplayProps {
  vin: string;
  showCopy?: boolean;
  truncate?: boolean;
  className?: string;
}

export function VinDisplay({ 
  vin, 
  showCopy = true, 
  truncate = false,
  className 
}: VinDisplayProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(vin);
      toast.success("VIN copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="font-mono text-xs">
        {truncate ? `...${vin.slice(-8)}` : vin}
      </span>
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getColorHex(colorName: string): string {
  const colors: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    silver: '#c0c0c0',
    gray: '#808080',
    grey: '#808080',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#eab308',
    orange: '#ea580c',
    brown: '#78350f',
    gold: '#ca8a04',
    beige: '#d4c4a8',
    tan: '#d2b48c',
    burgundy: '#800020',
    maroon: '#800000',
    navy: '#000080',
    purple: '#7c3aed',
    pink: '#ec4899',
  };

  return colors[colorName.toLowerCase()] || '#9ca3af';
}
