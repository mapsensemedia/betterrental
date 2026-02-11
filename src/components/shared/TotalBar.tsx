/**
 * TotalBar - Always-visible total price bar for customer booking pages
 * Uses central pricing utility as source of truth
 */
import { useSearchParams } from "react-router-dom";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useCategory } from "@/hooks/use-vehicles";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { calculateBookingPricing, ageRangeToAgeBand } from "@/lib/pricing";
import { useProtectionPackages } from "@/hooks/use-protection-settings";
import { cn } from "@/lib/utils";

interface TotalBarProps {
  className?: string;
  protectionDailyRate?: number;
  /** Override add-on IDs (for pages that manage selection locally) */
  selectedAddOnIds?: string[];
  /** VIN-specific tank capacity for fuel add-on calculation */
  unitTankCapacity?: number | null;
}

export function TotalBar({ 
  className, 
  protectionDailyRate = 0,
  selectedAddOnIds: overrideAddOnIds,
  unitTankCapacity,
}: TotalBarProps) {
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays } = useRentalBooking();
  
  // Get category ID from URL params or context
  const categoryId = searchParams.get("categoryId") || searchParams.get("vehicleId") || searchData.selectedVehicleId;
  const { data: vehicle } = useCategory(categoryId);
  const { data: addOns = [] } = useAddOns();

  // Use override add-on IDs if provided, otherwise fall back to context
  const effectiveAddOnIds = overrideAddOnIds ?? searchData.selectedAddOnIds;
  
  // Get vehicle category for fuel add-on calculation and group-based protection pricing
  const vehicleCategory = vehicle?.category || (vehicle as any)?.categoryName || "default";
  
  // Get group-aware protection rates
  const { rates: protectionRates } = useProtectionPackages(vehicleCategory);

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  const { total: addOnsTotal } = calculateAddOnsCost(
    addOns,
    effectiveAddOnIds,
    rentalDays,
    vehicleCategory,
    unitTankCapacity
  );
  const deliveryFee = searchData.deliveryFee || 0;

  const pricing = vehicle
    ? calculateBookingPricing({
        vehicleDailyRate: vehicle.dailyRate,
        rentalDays,
        protectionDailyRate,
        addOnsTotal,
        deliveryFee,
        driverAgeBand,
        pickupDate: searchData.pickupDate,
      })
    : null;

  if (!pricing) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg">Total</span>
        <span className="font-bold text-xl">
          ${pricing.total.toFixed(2)} CAD
          <span className="text-destructive">*</span>
        </span>
      </div>
      {pricing.discountType !== "none" && (
        <p className="text-xs text-emerald-600 mt-1">
          {pricing.discountType === "monthly" ? "20% monthly" : "10% weekly"} discount applied
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        *Estimated total. Final price may vary.
      </p>
    </div>
  );
}
