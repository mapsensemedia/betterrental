/**
 * BookingSummaryPanel - Persistent summary shown on select-car, extras, checkout pages
 */
import { MapPin, Calendar, Clock, Car, Package, CreditCard, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicle } from "@/hooks/use-vehicles";
import { useAddOns, calculateAddOnsCost } from "@/hooks/use-add-ons";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { calculateBookingPricing, ageRangeToAgeBand, TAX_RATE } from "@/lib/pricing";

interface BookingSummaryPanelProps {
  className?: string;
  showPricing?: boolean;
  protectionDailyRate?: number;
}

export function BookingSummaryPanel({
  className,
  showPricing = true,
  protectionDailyRate = 0,
}: BookingSummaryPanelProps) {
  const { searchData, rentalDays } = useRentalBooking();
  const { data: vehicle } = useVehicle(searchData.selectedVehicleId);
  const { data: addOns = [] } = useAddOns();

  // Calculate pricing using central utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  
  const pricing = (() => {
    if (!vehicle) return null;

    const { total: addOnsTotal, itemized } = calculateAddOnsCost(
      addOns,
      searchData.selectedAddOnIds,
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
    });

    return { 
      basePrice: breakdown.vehicleTotal, 
      addOnsTotal, 
      deliveryFee, 
      youngDriverFee: breakdown.youngDriverFee,
      subtotal: breakdown.subtotal, 
      taxAmount: breakdown.taxAmount, 
      total: breakdown.total, 
      itemized 
    };
  })();

  const selectedAddOnsData = addOns.filter((a) =>
    searchData.selectedAddOnIds.includes(a.id)
  );

  // Location display
  const locationDisplay =
    searchData.deliveryMode === "delivery"
      ? searchData.deliveryPlaceName || searchData.deliveryAddress
      : searchData.pickupLocationName;

  const centerDisplay =
    searchData.deliveryMode === "delivery"
      ? searchData.closestPickupCenterName
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
              {searchData.deliveryMode === "delivery" ? "Delivery To" : "Pickup Location"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {locationDisplay || "Not selected"}
            </p>
            {centerDisplay && (
              <p className="text-xs text-muted-foreground mt-1">
                From: {centerDisplay}
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

      {/* Selected Vehicle */}
      {vehicle && (
        <>
          <Separator />
          <div className="flex items-start gap-3">
            <Car className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              <p className="text-sm text-muted-foreground">{vehicle.category}</p>
              {vehicle.imageUrl && (
                <img
                  src={vehicle.imageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
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
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(TAX_RATE * 100).toFixed(0)}%)
                </span>
                <span>${pricing.taxAmount.toFixed(0)}</span>
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
