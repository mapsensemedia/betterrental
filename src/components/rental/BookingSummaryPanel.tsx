/**
 * BookingSummaryPanel - Persistent summary shown on select-car, extras, checkout pages
 * Uses central pricing utility as single source of truth
 * Supports both legacy vehicles and new category system
 */
import { MapPin, Calendar, Clock, Car, Package, CreditCard, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicle, useCategory } from "@/hooks/use-vehicles";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { calculateBookingPricing, ageRangeToAgeBand, TOTAL_TAX_RATE } from "@/lib/pricing";
import { useSearchParams } from "react-router-dom";

interface BookingSummaryPanelProps {
  className?: string;
  showPricing?: boolean;
  protectionDailyRate?: number;
  /** Override add-on IDs (for pages that manage selection locally) */
  selectedAddOnIds?: string[];
}

export function BookingSummaryPanel({
  className,
  showPricing = true,
  protectionDailyRate = 0,
  selectedAddOnIds: overrideAddOnIds,
}: BookingSummaryPanelProps) {
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays } = useRentalBooking();
  
  // Support both legacy vehicleId and new categoryId
  const categoryId = searchParams.get("categoryId") || searchData.selectedVehicleId;
  const vehicleId = searchParams.get("vehicleId");
  
  // Try to fetch as category first (new system), then as vehicle (legacy)
  const { data: category } = useCategory(categoryId);
  const { data: legacyVehicle } = useVehicle(vehicleId);
  
  // Use category data if available, otherwise fall back to legacy vehicle
  const vehicle = category || legacyVehicle;
  
  const { data: addOns = [] } = useAddOns();

  // Use override add-on IDs if provided, otherwise fall back to context
  const effectiveAddOnIds = overrideAddOnIds ?? searchData.selectedAddOnIds;

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  const pricing = (() => {
    if (!vehicle) return null;

    const { total: addOnsTotal, itemized } = calculateAddOnsCost(
      addOns,
      effectiveAddOnIds,
      rentalDays
    );
    const deliveryFee = searchData.deliveryFee || 0;
    
    const breakdown = calculateBookingPricing({
      vehicleDailyRate: vehicle.dailyRate,
      rentalDays,
      protectionDailyRate,
      addOnsTotal,
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
      deliveryFee, 
      youngDriverFee: breakdown.youngDriverFee,
      dailyFeesTotal: breakdown.dailyFeesTotal,
      subtotal: breakdown.subtotal, 
      pstAmount: breakdown.pstAmount,
      gstAmount: breakdown.gstAmount,
      taxAmount: breakdown.taxAmount, 
      total: breakdown.total, 
      itemized 
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
                  <p className="text-muted-foreground">{searchData.pickupTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return</p>
                  <p className="font-medium">
                    {format(searchData.returnDate, "MMM d, yyyy")}
                  </p>
                  <p className="text-muted-foreground">{searchData.returnTime}</p>
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
                ${vehicle.dailyRate}/day
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
                {selectedAddOnsData.map((addon) => (
                  <li
                    key={addon.id}
                    className="text-sm text-muted-foreground flex justify-between"
                  >
                    <span>{addon.name}</span>
                  </li>
                ))}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  ${vehicle?.dailyRate}/day × {rentalDays} days
                </span>
                <span>${pricing.basePrice.toFixed(0)}</span>
              </div>
              
              {pricing.weekendSurcharge > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Weekend surcharge</span>
                  <span>+${pricing.weekendSurcharge.toFixed(0)}</span>
                </div>
              )}
              
              {pricing.durationDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{pricing.discountType === "monthly" ? "Monthly" : "Weekly"} discount</span>
                  <span>-${pricing.durationDiscount.toFixed(0)}</span>
                </div>
              )}
              
              {pricing.addOnsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Add-ons</span>
                  <span>${pricing.addOnsTotal.toFixed(0)}</span>
                </div>
              )}
              
              {pricing.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fee</span>
                  <span>${pricing.deliveryFee.toFixed(0)}</span>
                </div>
              )}
              
              {pricing.youngDriverFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Young driver fee</span>
                  <span>${pricing.youngDriverFee.toFixed(0)}</span>
                </div>
              )}
              
              {pricing.dailyFeesTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily fees (PVRT + ACSRCH)</span>
                  <span>${pricing.dailyFeesTotal.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(TOTAL_TAX_RATE * 100).toFixed(0)}%)
                </span>
                <span>${pricing.taxAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-4">
                <span>PST (7%)</span>
                <span>${pricing.pstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pl-4">
                <span>GST (5%)</span>
                <span>${pricing.gstAmount.toFixed(2)}</span>
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${pricing.total.toFixed(0)}<span className="text-destructive">*</span></span>
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
