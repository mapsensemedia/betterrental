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
import { calculateBookingPricing, ageRangeToAgeBand, TOTAL_TAX_RATE, YOUNG_DRIVER_FEE } from "@/lib/pricing";
import { formatTimeDisplay } from "@/lib/rental-rules";
import { useSearchParams } from "react-router-dom";
import { calculateAdditionalDriversCost } from "./AdditionalDriversCard";
import { PriceTooltip, PRICE_TOOLTIPS } from "@/components/shared/PriceTooltip";

interface BookingSummaryPanelProps {
  className?: string;
  showPricing?: boolean;
  protectionDailyRate?: number;
  /** Override add-on IDs (for pages that manage selection locally) */
  selectedAddOnIds?: string[];
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
  additionalDrivers: overrideAdditionalDrivers,
  unitTankCapacity,
}: BookingSummaryPanelProps) {
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays } = useRentalBooking();
  
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

  // Use override add-on IDs if provided, otherwise fall back to context
  const effectiveAddOnIds = overrideAddOnIds ?? searchData.selectedAddOnIds;
  
  // Use override additional drivers if provided, otherwise fall back to context
  const effectiveAdditionalDrivers = overrideAdditionalDrivers ?? searchData.additionalDrivers;

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  // Get vehicle category for fuel add-on calculation
  const vehicleCategory = vehicle?.category || (vehicle as any)?.categoryName || "default";
  
  const pricing = (() => {
    if (!vehicle) return null;

    const { total: addOnsTotal, itemized, fuelPricing } = calculateAddOnsCost(
      addOns,
      effectiveAddOnIds,
      rentalDays,
      vehicleCategory,
      unitTankCapacity
    );
    const deliveryFee = searchData.deliveryFee || 0;
    
    // Calculate additional drivers cost
    const additionalDriversCost = calculateAdditionalDriversCost(effectiveAdditionalDrivers, rentalDays);
    
    const breakdown = calculateBookingPricing({
      vehicleDailyRate: vehicle.dailyRate,
      rentalDays,
      protectionDailyRate,
      addOnsTotal: addOnsTotal + additionalDriversCost.total,
      deliveryFee,
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
      youngDriverFee: breakdown.youngDriverFee,
      dailyFeesTotal: breakdown.dailyFeesTotal,
      subtotal: breakdown.subtotal, 
      pstAmount: breakdown.pstAmount,
      gstAmount: breakdown.gstAmount,
      taxAmount: breakdown.taxAmount, 
      total: breakdown.total, 
      itemized,
      fuelPricing,
    };
  })();

  const selectedAddOnsData = addOns.filter((a) =>
    effectiveAddOnIds.includes(a.id)
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
                  className="w-full h-24 object-cover rounded-lg mt-2"
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
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center">
                  Add-ons & Extras
                  <PriceTooltip content={PRICE_TOOLTIPS.addOns} />
                </p>
                {pricing.itemized && pricing.itemized.length > 0 ? (
                  pricing.itemized.map((item, idx) => (
                    <div key={idx} className="flex justify-between pl-3 text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span>${item.total.toFixed(2)} CAD</span>
                    </div>
                  ))
                ) : (
                  <p className="pl-3 text-sm text-muted-foreground italic">No add-ons selected</p>
                )}
              </div>
              
              {pricing.additionalDriversCost.total > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    Additional drivers ({effectiveAdditionalDrivers.length})
                    <PriceTooltip content={PRICE_TOOLTIPS.additionalDrivers} />
                  </span>
                  <span>${pricing.additionalDriversCost.total.toFixed(2)} CAD</span>
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
                    Young driver fee (primary)
                    <PriceTooltip content={PRICE_TOOLTIPS.youngDriverFee} />
                  </span>
                  <span>${pricing.youngDriverFee.toFixed(2)} CAD</span>
                </div>
              )}
              
              {pricing.dailyFeesTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center">
                    Daily fees (PVRT + ACSRCH)
                    <PriceTooltip content={PRICE_TOOLTIPS.dailyFees} />
                  </span>
                  <span>${pricing.dailyFeesTotal.toFixed(2)} CAD</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center">
                  Tax ({(TOTAL_TAX_RATE * 100).toFixed(0)}%)
                  <PriceTooltip content={PRICE_TOOLTIPS.totalTax} />
                </span>
                <span>${pricing.taxAmount.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-4">
                <span>PST (7%)</span>
                <span>${pricing.pstAmount.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-4">
                <span>GST (5%)</span>
                <span>${pricing.gstAmount.toFixed(2)} CAD</span>
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
