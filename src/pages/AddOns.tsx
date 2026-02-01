/**
 * AddOns - Select additional services after protection
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Plus, Users, Car, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicle, useCategory } from "@/hooks/use-vehicles";
import { useAddOns } from "@/hooks/use-add-ons";
import { cn } from "@/lib/utils";
import { BookingStepper } from "@/components/shared/BookingStepper";
import { BookingSummaryPanel } from "@/components/rental/BookingSummaryPanel";
import { AdditionalDriversCard, calculateAdditionalDriversCost, type AdditionalDriver } from "@/components/rental/AdditionalDriversCard";
import { trackPageView, funnelEvents } from "@/lib/analytics";
import { calculateBookingPricing, ageRangeToAgeBand } from "@/lib/pricing";

const ADDON_ICONS: Record<string, typeof Users> = {
  "roadside": Car,
  "tire": Car,
  "infant": Baby,
  "toddler": Baby,
  "booster": Baby,
  "gps": Car,
  "driver": Users,
  "additional": Users,
};

function getAddonIcon(name: string) {
  const lowerName = name.toLowerCase();
  for (const [key, Icon] of Object.entries(ADDON_ICONS)) {
    if (lowerName.includes(key)) {
      return Icon;
    }
  }
  return Car;
}

function isAdditionalDriverAddon(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes("additional") && lowerName.includes("driver");
}

export default function AddOns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays, setSelectedAddOns, setAdditionalDrivers } = useRentalBooking();
  const { data: addOns = [] } = useAddOns();

  // Support both legacy vehicleId and new categoryId
  const categoryId = searchParams.get("categoryId") || searchData.selectedVehicleId;
  const vehicleId = searchParams.get("vehicleId");
  const protection = searchParams.get("protection") || "none";
  
  const { data: category } = useCategory(categoryId);
  const { data: legacyVehicle } = useVehicle(vehicleId);
  
  // Use category if available, otherwise legacy vehicle
  const vehicle = category || legacyVehicle;
  
  const [selectedAddOnIds, setLocalSelectedAddOns] = useState<string[]>(searchData.selectedAddOnIds || []);
  const [additionalDrivers, setLocalAdditionalDrivers] = useState<AdditionalDriver[]>(searchData.additionalDrivers || []);

  // Track page view on mount
  useEffect(() => {
    trackPageView("Add-ons Selection");
  }, []);

  // Calculate totals using central pricing utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  const protectionRates: Record<string, number> = {
    none: 0,
    basic: 33.99,
    smart: 39.25,
    premium: 49.77,
  };
  const protectionDailyRate = protectionRates[protection] || 0;
  const deliveryFee = searchData.deliveryMode === "delivery" ? (searchData.deliveryFee || 0) : 0;
  
  // Calculate add-ons total
  const addOnsTotal = selectedAddOnIds.reduce((sum, id) => {
    const addon = addOns.find((a) => a.id === id);
    if (!addon) return sum;
    return sum + addon.dailyRate * rentalDays + (addon.oneTimeFee || 0);
  }, 0);

  // Calculate additional drivers cost
  const additionalDriversCost = calculateAdditionalDriversCost(additionalDrivers, rentalDays);

  const pricing = calculateBookingPricing({
    vehicleDailyRate: vehicle?.dailyRate || 0,
    rentalDays,
    protectionDailyRate,
    addOnsTotal: addOnsTotal + additionalDriversCost.total,
    deliveryFee,
    driverAgeBand,
    pickupDate: searchData.pickupDate,
  });
  
  const totalPrice = pricing.total;

  const handleToggleAddOn = (id: string) => {
    setLocalSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    // Track add-ons selection
    funnelEvents.addonsSelected(selectedAddOnIds, addOnsTotal + additionalDriversCost.total);

    // Save to context
    setSelectedAddOns(selectedAddOnIds);
    setAdditionalDrivers(additionalDrivers);

    // Build URL params for checkout - always use categoryId for new flow
    const params = new URLSearchParams();
    // Use categoryId for checkout (this is the new category-based flow)
    const checkoutCategoryId = categoryId || vehicleId;
    if (checkoutCategoryId) params.set("categoryId", checkoutCategoryId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    params.set("protection", protection);
    params.set("addOns", selectedAddOnIds.join(","));

    navigate(`/checkout?${params.toString()}`);
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (categoryId && !vehicleId) {
      params.set("categoryId", categoryId);
    } else if (vehicleId) {
      params.set("vehicleId", vehicleId);
    }
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    navigate(`/protection?${params.toString()}`);
  };


  return (
    <CustomerLayout>
      {/* Step Progress Indicator */}
      <div className="bg-background border-b border-border py-4">
        <div className="container mx-auto px-4">
          <BookingStepper currentStep={3} />
        </div>
      </div>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="shrink-0 h-8 w-8"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-xs sm:text-lg font-semibold uppercase tracking-wide line-clamp-1">
                  Which add-ons do you need?
                </h1>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Total:</p>
                  <p className="text-base sm:text-2xl font-bold whitespace-nowrap">
                    CA${totalPrice.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={handleContinue}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 hidden sm:flex"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Add-ons List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold mb-2">Extras & Equipment</h2>
              {addOns.length > 0 ? (
                addOns.map((addon) => {
                  const IconComponent = getAddonIcon(addon.name);
                  const isAdditionalDriver = isAdditionalDriverAddon(addon.name);
                  const isSelected = isAdditionalDriver 
                    ? additionalDrivers.length > 0 
                    : selectedAddOnIds.includes(addon.id);

                  // For additional driver addon, show expanded card
                  if (isAdditionalDriver) {
                    return (
                      <AdditionalDriversCard
                        key={addon.id}
                        drivers={additionalDrivers}
                        onDriversChange={setLocalAdditionalDrivers}
                        rentalDays={rentalDays}
                      />
                    );
                  }

                  const addonCost = addon.dailyRate * rentalDays + (addon.oneTimeFee || 0);

                  return (
                    <Card
                      key={addon.id}
                      className={cn(
                        "p-4 transition-all cursor-pointer",
                        isSelected && "ring-2 ring-primary border-primary"
                      )}
                      onClick={() => handleToggleAddOn(addon.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium">{addon.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              CA${addon.dailyRate.toFixed(2)} / day
                              {addon.oneTimeFee ? ` + $${addon.oneTimeFee} one-time` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <button className="text-sm text-muted-foreground hover:text-foreground">
                            Details
                          </button>
                          <button
                            className={cn(
                              "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary"
                            )}
                          >
                            {isSelected ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Plus className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No add-ons available</p>
                </Card>
              )}
            </div>

            {/* Booking Summary Sidebar with Total */}
            <div className="lg:col-span-1 lg:row-span-2">
              <div className="sticky top-24 space-y-4">
                <BookingSummaryPanel 
                  showPricing={true} 
                  protectionDailyRate={protectionDailyRate}
                  selectedAddOnIds={selectedAddOnIds}
                  additionalDrivers={additionalDrivers}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Fixed Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border sm:hidden">
          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
