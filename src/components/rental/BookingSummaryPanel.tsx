/**
 * BookingSummaryPanel - Persistent summary shown on select-car, extras, checkout pages
 * Uses central pricing utility as single source of truth
 * Supports both legacy vehicles and new category system
 */
import { MapPin, Calendar, Clock, Car, Package, CreditCard, User, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRentalBooking, type AdditionalDriver } from "@/contexts/RentalBookingContext";
import { useVehicle, useCategory } from "@/hooks/use-vehicles";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { calculateBookingPricing, ageRangeToAgeBand, TOTAL_TAX_RATE, YOUNG_DRIVER_FEE, computeDropoffFeeFromGroups } from "@/lib/pricing";
import { useLocations } from "@/hooks/use-locations";
import { formatTimeDisplay } from "@/lib/rental-rules";
import { useSearchParams } from "react-router-dom";
import { calculateAdditionalDriversCost } from "./AdditionalDriversCard";
import { PriceTooltip, PRICE_TOOLTIPS } from "@/components/shared/PriceTooltip";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";

/** Check if an add-on is the "Additional Driver" type (handled separately) */
function isAdditionalDriverAddon(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("additional") && lower.includes("driver");
}

interface BookingSummaryPanelProps {
  className?: string;
  showPricing?: boolean;
  protectionDailyRate?: number;
  /** Override add-on IDs (for pages that manage selection locally) */
  selectedAddOnIds?: string[];
  /** Override add-on quantities (for pages that manage selection locally) */
  addOnQuantities?: Record<string, number>;
  /** Override additional drivers (for pages that manage selection locally) */
  additionalDrivers?: AdditionalDriver[];
  /** VIN-specific tank capacity for fuel add-on calculation */
  unitTankCapacity?: number | null;
}

export function BookingSummaryPanel({
  className,
  showPricing = true,
  protectionDailyRate = 0,
  selectedAddOnIds: overrideAddOnIds,
  addOnQuantities: overrideAddOnQuantities,
  additionalDrivers: overrideAdditionalDrivers,
  unitTankCapacity,
}: BookingSummaryPanelProps) {
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: driverFeeSettings } = useDriverFeeSettings();
  const additionalDriverRate = driverFeeSettings?.additionalDriverDailyRate ?? 15.99;
  const youngAdditionalDriverRate = driverFeeSettings?.youngAdditionalDriverDailyRate ?? 15.00;
  
  // Support both legacy vehicleId and new categoryId - check URL first, then context
  const urlCategoryId = searchParams.get("categoryId");
  const urlVehicleId = searchParams.get("vehicleId");
  const contextVehicleId = searchData.selectedVehicleId;
  
  // Priority: URL categoryId > URL vehicleId > context selectedVehicleId
  const effectiveId = urlCategoryId || urlVehicleId || contextVehicleId;
  
  // Fetch as category (new system)
  const { data: category, isLoading: categoryLoading } = useCategory(effectiveId);
  const { data: legacyVehicle, isLoading: vehicleLoading } = useVehicle(urlVehicleId);
  
  // Use category data if available, otherwise fall back to legacy vehicle
  const vehicle = category || legacyVehicle;
  
  const { data: addOns = [] } = useAddOns();
  const { data: allLocations = [] } = useLocations();

  // Filter out "Additional Driver" add-on ID from regular add-ons
  // since additional drivers are managed separately via additionalDrivers[]
  // Guard: only filter if addOns list has loaded; otherwise exclude IDs we can't verify
  const effectiveAddOnIds = (overrideAddOnIds ?? searchData.selectedAddOnIds).filter((id) => {
    const addon = addOns.find((a) => a.id === id);
    // If addon not found and list is loaded, exclude it (stale ID)
    if (!addon) return addOns.length === 0;
    return !isAdditionalDriverAddon(addon.name);
  });
  
  // Use override additional drivers if provided, otherwise fall back to context
  const effectiveAdditionalDrivers = overrideAdditionalDrivers ?? searchData.additionalDrivers;

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  // Get vehicle category for fuel add-on calculation
  const vehicleCategory = vehicle?.category || (vehicle as any)?.categoryName || "default";
  
  const pricing = (() => {
    if (!vehicle) return null;

    const effectiveQuantities = overrideAddOnQuantities ?? searchData.addOnQuantities;
    const { total: addOnsTotal, itemized, fuelPricing } = calculateAddOnsCost(
      addOns,
      effectiveAddOnIds,
      rentalDays,
      vehicleCategory,
      unitTankCapacity,
      effectiveQuantities
    );
    const deliveryFee = searchData.deliveryFee || 0;
    const isDifferentDropoff = !searchData.returnSameAsPickup && !!searchData.returnLocationId && searchData.returnLocationId !== searchData.pickupLocationId;
    const pickupLoc = allLocations.find(l => l.id === searchData.pickupLocationId);
    const returnLoc = allLocations.find(l => l.id === searchData.returnLocationId);
    const differentDropoffFee = isDifferentDropoff ? computeDropoffFeeFromGroups(pickupLoc?.feeGroup, returnLoc?.feeGroup) : 0;
    
    // Calculate additional drivers cost
    const additionalDriversCost = calculateAdditionalDriversCost(effectiveAdditionalDrivers, rentalDays, additionalDriverRate, youngAdditionalDriverRate);
    
    const breakdown = calculateBookingPricing({
      vehicleDailyRate: vehicle.dailyRate,
      rentalDays,
      protectionDailyRate,
      addOnsTotal: addOnsTotal + additionalDriversCost.total,
      deliveryFee,
      differentDropoffFee,
      driverAgeBand,
      pickupDate: searchData.pickupDate,
    });

    return { 
      basePrice: breakdown.vehicleTotal, 
      weekendSurcharge: breakdown.weekendSurcharge,
      durationDiscount: breakdown.durationDiscount,
      discountType: breakdown.discountType,
      addOnsTotal, 
      additionalDriversCost,
      deliveryFee, 
      differentDropoffFee: breakdown.differentDropoffFee,
      youngDriverFee: breakdown.youngDriverFee,
      dailyFeesTotal: breakdown.dailyFeesTotal,
      pvrtTotal: breakdown.pvrtTotal,
      acsrchTotal: breakdown.acsrchTotal,
      subtotal: breakdown.subtotal, 
      pstAmount: breakdown.pstAmount,
      gstAmount: breakdown.gstAmount,
      taxAmount: breakdown.taxAmount, 
      total: breakdown.total, 
      itemized,
      fuelPricing,
      isDifferentDropoff,
    };
  })();

  // Filter out "Additional Driver" add-on — it's managed separately via additionalDrivers[]
  const selectedAddOnsData = addOns.filter((a) =>
    effectiveAddOnIds.includes(a.id) && !isAdditionalDriverAddon(a.name)
  );

  // Location display - For delivery mode, show the delivery address prominently
  // and the dispatch hub as secondary info
  const isDeliveryMode = searchData.deliveryMode === "delivery";
  const primaryLocationDisplay = isDeliveryMode
    ? searchData.deliveryAddress || searchData.deliveryPlaceName
    : searchData.pickupLocationName;

  const secondaryLocationDisplay = isDeliveryMode
    ? searchData.closestPickupCenterName
      ? `Dispatched from: ${searchData.closestPickupCenterName}`
      : null
    : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 space-y-4",
        className
      )}
    >
      <h3 className="font-semibold text-lg">Booking Summary</h3>

      <Separator />

      {/* Location */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isDeliveryMode ? "Delivery Address" : "Pickup Location"}
            </p>
            {/* Full address with tooltip for long addresses */}
            <p 
              className="text-sm text-muted-foreground break-words"
              title={primaryLocationDisplay || undefined}
            >
              {primaryLocationDisplay || "Not selected"}
            </p>
            {secondaryLocationDisplay && (
              <p className="text-xs text-muted-foreground/70 mt-1 italic">
                {secondaryLocationDisplay}
              </p>
            )}
            {/* Drop-off location */}
            {pricing?.isDifferentDropoff && searchData.returnLocationName && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-sm font-medium">Drop-off Location</p>
                <p className="text-sm text-muted-foreground">{searchData.returnLocationName}</p>
                {pricing.differentDropoffFee > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">${pricing.differentDropoffFee.toFixed(2)} CAD + tax different location fee</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dates & Times */}
      {searchData.pickupDate && searchData.returnDate && (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Pick-up</p>
                  <p className="font-medium">
                    {format(searchData.pickupDate, "MMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground">{formatTimeDisplay(searchData.pickupTime)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return</p>
                  <p className="font-medium">
                    {format(searchData.returnDate, "MMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground">{formatTimeDisplay(searchData.returnTime)}</p>
                </div>
              </div>
              <p className="text-xs text-primary mt-1 font-medium">
                {rentalDays} day{rentalDays > 1 ? "s" : ""} rental
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Vehicle/Category */}
      {vehicle && (
        <>
          <Separator />
          <div className="flex items-start gap-3">
            <Car className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {(vehicle as any).isCategory 
                  ? (vehicle as any).categoryName 
                  : `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              </p>
              <p className="text-sm text-muted-foreground">
                ${vehicle.dailyRate} CAD/day
              </p>
              {vehicle.imageUrl && (
                <img
                  src={vehicle.imageUrl}
                  alt={(vehicle as any).isCategory ? (vehicle as any).categoryName : `${vehicle.make} ${vehicle.model}`}
                  className="w-full h-auto max-h-40 object-contain rounded-lg mt-2"
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Selected Add-ons */}
      {selectedAddOnsData.length > 0 && (
        <>
          <Separator />
          <div className="flex items-start gap-3">
            <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Add-ons</p>
              <ul className="space-y-1">
                {selectedAddOnsData.map((addon) => {
                  const isFuel = addon.name.toLowerCase().includes("fuel");
                  const fuelInfo = isFuel && pricing?.fuelPricing;
                  
                  return (
                    <li
                      key={addon.id}
                      className="text-sm text-muted-foreground"
                    >
                      <div className="flex justify-between">
                        <span>{addon.name}</span>
                        {fuelInfo && (
                          <span className="font-medium text-foreground">
                            ${fuelInfo.ourPrice.toFixed(2)} CAD
                          </span>
                        )}
                      </div>
                      {fuelInfo && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          {fuelInfo.tankLiters}L tank • Save ${fuelInfo.savings.toFixed(2)} CAD
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Pricing */}
      {showPricing && pricing && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Price Breakdown</p>
            </div>
            
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center">
                  ${vehicle?.dailyRate}/day × {rentalDays} days
                  <PriceTooltip content={PRICE_TOOLTIPS.vehicleRental} />
                </span>
                <span>${pricing.basePrice.toFixed(2)} CAD</span>
              </div>
              
              {pricing.weekendSurcharge > 0 && (
                <div className="flex justify-between items-center text-amber-600">
                  <span className="flex items-center">
                    Weekend surcharge
                    <PriceTooltip content={PRICE_TOOLTIPS.weekendSurcharge} />
                  </span>
                  <span>+${pricing.weekendSurcharge.toFixed(2)} CAD</span>
                </div>
              )}
              
              {pricing.durationDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-600">
                  <span className="flex items-center">
                    {pricing.discountType === "monthly" ? "Monthly" : "Weekly"} discount
                    <PriceTooltip content={pricing.discountType === "monthly" ? PRICE_TOOLTIPS.monthlyDiscount : PRICE_TOOLTIPS.weeklyDiscount} />
                  </span>
                  <span>-${pricing.durationDiscount.toFixed(2)} CAD</span>
                </div>
              )}

              {/* Protection — always show */}
              {protectionDailyRate > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    Protection
                    <PriceTooltip content={PRICE_TOOLTIPS.protection("Selected protection")} />
                  </span>
                  <span>${(protectionDailyRate * rentalDays).toFixed(2)} CAD</span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    No Extra Protection
                    <PriceTooltip content={PRICE_TOOLTIPS.protectionNone} />
                  </span>
                  <span>$0.00</span>
                </div>
              )}

              {/* Add-ons — itemized */}
              <div className="pt-1">
                <div className="text-xs text-muted-foreground tracking-wide font-medium flex items-center">
                  Add-ons & Extras
                  <PriceTooltip content={PRICE_TOOLTIPS.addOns} />
                </div>
                {pricing.itemized && pricing.itemized.length > 0 ? (
                  pricing.itemized.map((item, idx) => (
                    <div key={idx} className="flex justify-between pl-3 text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity && item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                      </span>
                      <span>${item.total.toFixed(2)} CAD</span>
                    </div>
                  ))
                ) : (
                  <div className="pl-3 text-sm text-muted-foreground italic">No add-ons selected</div>
                )}
              </div>
              
              {pricing.additionalDriversCost.total > 0 && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center">
                      Additional drivers ({effectiveAdditionalDrivers.length})
                      <PriceTooltip content={PRICE_TOOLTIPS.additionalDrivers} />
                    </span>
                    <span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>
                  </div>
                  {pricing.additionalDriversCost.baseFees > 0 && (
                    <div className="flex justify-between pl-3 text-xs text-muted-foreground">
                      <span>{effectiveAdditionalDrivers.filter(d => d.ageBand !== "20_24").length} × ${additionalDriverRate.toFixed(2)}/day × {rentalDays} days</span>
                      <span>${pricing.additionalDriversCost.baseFees.toFixed(2)}</span>
                    </div>
                  )}
                  {pricing.additionalDriversCost.youngDriverFees > 0 && (
                    <div className="flex justify-between pl-3 text-xs text-amber-600">
                      <span>Young drivers ({effectiveAdditionalDrivers.filter(d => d.ageBand === "20_24").length} × ${youngAdditionalDriverRate.toFixed(2)}/day × {rentalDays} days)</span>
                      <span>${pricing.additionalDriversCost.youngDriverFees.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              
              
              {pricing.differentDropoffFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Different drop-off location</span>
                  <span>${pricing.differentDropoffFee.toFixed(2)} CAD</span>
                </div>
              )}

              {pricing.deliveryFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    Delivery fee
                    <PriceTooltip content={PRICE_TOOLTIPS.deliveryFee} />
                  </span>
                  <span>${pricing.deliveryFee.toFixed(2)} CAD</span>
                </div>
              )}
              
              {pricing.youngDriverFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    Young driver fee (${YOUNG_DRIVER_FEE}/day × {rentalDays} days)
                    <PriceTooltip content={PRICE_TOOLTIPS.youngDriverFee} />
                  </span>
                  <span>${pricing.youngDriverFee.toFixed(2)} CAD</span>
                </div>
              )}
              
              {pricing.pvrtTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    PVRT
                    <PriceTooltip content={PRICE_TOOLTIPS.pvrt} />
                  </span>
                  <span>${pricing.pvrtTotal.toFixed(2)} CAD</span>
                </div>
              )}
              {pricing.acsrchTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    ACSRCH
                    <PriceTooltip content={PRICE_TOOLTIPS.acsrch} />
                  </span>
                  <span>${pricing.acsrchTotal.toFixed(2)} CAD</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center">
                  Tax ({(TOTAL_TAX_RATE * 100).toFixed(0)}%)
                  <PriceTooltip>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>PST (7%)</span>
                        <span className="font-medium">${pricing.pstAmount.toFixed(2)} CAD</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>GST (5%)</span>
                        <span className="font-medium">${pricing.gstAmount.toFixed(2)} CAD</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-border pt-1 font-semibold">
                        <span>Total (12%)</span>
                        <span>${pricing.taxAmount.toFixed(2)} CAD</span>
                      </div>
                    </div>
                  </PriceTooltip>
                </span>
                <span>${pricing.taxAmount.toFixed(2)} CAD</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${pricing.total.toFixed(2)} CAD<span className="text-destructive">*</span></span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                *Estimated total. Final price may vary based on actual rental duration.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
