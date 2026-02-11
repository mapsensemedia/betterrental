/**
 * AddOns - Select additional services after protection
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Plus, Minus, Users, Car, Baby, Fuel, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicle, useCategory } from "@/hooks/use-vehicles";
import { useAddOns, isSeatAddOn } from "@/hooks/use-add-ons";
import { cn } from "@/lib/utils";
import { BookingStepper } from "@/components/shared/BookingStepper";
import { BookingSummaryPanel } from "@/components/rental/BookingSummaryPanel";
import { AdditionalDriversCard, calculateAdditionalDriversCost, type AdditionalDriver } from "@/components/rental/AdditionalDriversCard";
import { trackPageView, funnelEvents } from "@/lib/analytics";
import { calculateBookingPricing, ageRangeToAgeBand } from "@/lib/pricing";
import { calculateFuelCostForUnit, FUEL_DISCOUNT_CENTS } from "@/lib/fuel-pricing";
import { useProtectionPackages } from "@/hooks/use-protection-settings";
import { useDriverFeeSettings } from "@/hooks/use-driver-fee-settings";

const ADDON_ICONS: Record<string, typeof Users> = {
  "roadside": Shield,
  "tire": Car,
  "infant": Baby,
  "child": Baby,
  "booster": Baby,
  "gps": Car,
  "driver": Users,
  "additional": Users,
  "fuel": Fuel,
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

function isFuelAddon(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes("fuel") && lowerName.includes("tank");
}

function isPremiumRoadsideAddon(name: string): boolean {
  const lowerName = name.toLowerCase();
  return lowerName.includes("roadside") && (lowerName.includes("premium") || lowerName.includes("extended"));
}

export default function AddOns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays, setSelectedAddOns, setAdditionalDrivers, setAddOnQuantities } = useRentalBooking();
  const { data: addOns = [] } = useAddOns();
  const { data: driverFeeSettings } = useDriverFeeSettings();
  const additionalDriverRate = driverFeeSettings?.additionalDriverDailyRate ?? 15.99;
  const youngAdditionalDriverRate = driverFeeSettings?.youngAdditionalDriverDailyRate ?? 15.00;

  // Support both legacy vehicleId and new categoryId
  const categoryId = searchParams.get("categoryId") || searchData.selectedVehicleId;
  const vehicleId = searchParams.get("vehicleId");
  const protection = searchParams.get("protection") || "none";
  
  const { data: category } = useCategory(categoryId);
  const { data: legacyVehicle } = useVehicle(vehicleId);
  
  // Use category if available, otherwise legacy vehicle
  const vehicle = category || legacyVehicle;

  // Group-aware protection pricing based on vehicle category
  const vehicleCategoryName = vehicle?.category || (vehicle as any)?.categoryName || "";
  const { rates: PROTECTION_RATES } = useProtectionPackages(vehicleCategoryName);
  
  // Initialize local state but filter out any stale "Additional Driver" add-on IDs
  const [selectedAddOnIds, setLocalSelectedAddOns] = useState<string[]>(() => {
    return (searchData.selectedAddOnIds || []).filter((id) => {
      const addon = addOns.find((a) => a.id === id);
      return !addon || !isAdditionalDriverAddon(addon.name);
    });
  });
  const [additionalDrivers, setLocalAdditionalDrivers] = useState<AdditionalDriver[]>(searchData.additionalDrivers || []);
  const [addOnQuantities, setLocalAddOnQuantities] = useState<Record<string, number>>(searchData.addOnQuantities || {});

  // Auto-deselect Premium Roadside if All Inclusive protection is selected
  useEffect(() => {
    if (protection === "premium") {
      setLocalSelectedAddOns((prev) => {
        const filtered = prev.filter((id) => {
          const addon = addOns.find((a) => a.id === id);
          return addon ? !isPremiumRoadsideAddon(addon.name) : true;
        });
        return filtered.length !== prev.length ? filtered : prev;
      });
    }
  }, [protection, addOns]);

  // Track page view on mount
  useEffect(() => {
    trackPageView("Add-ons Selection");
  }, []);

  // Calculate totals using central pricing utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  const protectionInfo = PROTECTION_RATES[protection] || PROTECTION_RATES.none;
  const protectionDailyRate = protectionInfo?.rate || 0;
  const deliveryFee = searchData.deliveryMode === "delivery" ? (searchData.deliveryFee || 0) : 0;
  
  // Calculate add-ons total (exclude "Additional Driver" add-on — handled separately)
  const addOnsTotal = selectedAddOnIds.reduce((sum, id) => {
    const addon = addOns.find((a) => a.id === id);
    if (!addon || isAdditionalDriverAddon(addon.name)) return sum;
    const qty = addOnQuantities[id] || 1;
    return sum + (addon.dailyRate * rentalDays + (addon.oneTimeFee || 0)) * qty;
  }, 0);

  // Calculate additional drivers cost
  const additionalDriversCost = calculateAdditionalDriversCost(additionalDrivers, rentalDays, additionalDriverRate, youngAdditionalDriverRate);

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
    // Remove quantity when deselecting
    if (selectedAddOnIds.includes(id)) {
      setLocalAddOnQuantities((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setLocalAddOnQuantities((prev) => {
      const current = prev[id] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [id]: next };
    });
    // Ensure addon is selected
    if (!selectedAddOnIds.includes(id)) {
      setLocalSelectedAddOns((prev) => [...prev, id]);
    }
  };

  const handleContinue = () => {
    // Track add-ons selection
    funnelEvents.addonsSelected(selectedAddOnIds, addOnsTotal + additionalDriversCost.total);

    // Save to context — ensure "Additional Driver" add-on ID is never in selectedAddOnIds
    const cleanedAddOnIds = selectedAddOnIds.filter((id) => {
      const addon = addOns.find((a) => a.id === id);
      return !addon || !isAdditionalDriverAddon(addon.name);
    });
    setSelectedAddOns(cleanedAddOnIds);
    setAdditionalDrivers(additionalDrivers);
    setAddOnQuantities(addOnQuantities);

    // Build URL params for checkout - always use categoryId for new flow
    const params = new URLSearchParams();
    // Use categoryId for checkout (this is the new category-based flow)
    const checkoutCategoryId = categoryId || vehicleId;
    if (checkoutCategoryId) params.set("categoryId", checkoutCategoryId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    params.set("protection", protection);
    params.set("addOns", cleanedAddOnIds.join(","));
    // Pass quantities as JSON for seat add-ons
    const qtyEntries = Object.entries(addOnQuantities).filter(([_, v]) => v > 1);
    if (qtyEntries.length > 0) {
      params.set("addOnQty", JSON.stringify(Object.fromEntries(qtyEntries)));
    }
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
                    ${totalPrice.toFixed(2)} CAD
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
                addOns.filter((addon) => {
                  // Hide Premium Roadside when All Inclusive protection is selected (already included)
                  if (protection === "premium" && isPremiumRoadsideAddon(addon.name)) {
                    return false;
                  }
                  return true;
                }).map((addon) => {
                  const IconComponent = getAddonIcon(addon.name);
                  const isAdditionalDriver = isAdditionalDriverAddon(addon.name);
                  const isFuel = isFuelAddon(addon.name);
                  const isSeat = isSeatAddOn(addon.name);
                  const isSelected = isAdditionalDriver 
                    ? additionalDrivers.length > 0 
                    : selectedAddOnIds.includes(addon.id);
                  const quantity = addOnQuantities[addon.id] || 1;

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

                  // For fuel addon, show special pricing with asterisk
                  if (isFuel) {
                    const categoryName = vehicle?.category || "default";
                    // Use category-based fallback (VIN-specific would come from assigned unit)
                    const fuelCost = calculateFuelCostForUnit(null, categoryName);
                    
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
                            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <Fuel className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{addon.name}</h3>
                              <p className="text-sm font-semibold text-foreground">
                                ${fuelCost.ourPrice.toFixed(2)} CAD
                                <span className="text-destructive">*</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Pre-purchase fuel with us and save time at the pump
                              </p>
                              <p className="text-xs text-emerald-600 font-medium mt-1">
                                *{FUEL_DISCOUNT_CENTS}¢/L below market price – Save ${fuelCost.savings.toFixed(2)} CAD
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
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
                  }

                  const addonCost = (addon.dailyRate * rentalDays + (addon.oneTimeFee || 0)) * (isSeat ? quantity : 1);

                  return (
                    <Card
                      key={addon.id}
                      className={cn(
                        "p-4 transition-all cursor-pointer",
                        isSelected && "ring-2 ring-primary border-primary"
                      )}
                      onClick={() => !isSeat && handleToggleAddOn(addon.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium">{addon.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              ${addon.dailyRate.toFixed(2)} CAD / day
                              {addon.oneTimeFee ? ` + $${addon.oneTimeFee} CAD one-time` : ""}
                            </p>
                            {addon.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {addon.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <button className="text-sm text-muted-foreground hover:text-foreground">
                            Details
                          </button>
                          {isSeat && isSelected ? (
                            <div className="flex items-center bg-primary rounded-full h-10 px-1 gap-0">
                              <button
                                className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (quantity <= 1) {
                                    handleToggleAddOn(addon.id);
                                  } else {
                                    handleQuantityChange(addon.id, -1);
                                  }
                                }}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold text-primary-foreground">
                                {quantity}
                              </span>
                              <button
                                className="w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(addon.id, 1);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              className={cn(
                                "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors",
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/30 hover:border-primary"
                              )}
                              onClick={(e) => {
                                if (isSeat) {
                                  e.stopPropagation();
                                  handleToggleAddOn(addon.id);
                                }
                              }}
                            >
                              {isSelected ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <Plus className="w-5 h-5" />
                              )}
                            </button>
                          )}
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
                  addOnQuantities={addOnQuantities}
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
