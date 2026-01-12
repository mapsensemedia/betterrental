/**
 * Protection - Select protection package before checkout
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, X, Info, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicles } from "@/hooks/use-vehicles";
import { cn } from "@/lib/utils";
import { BookingStepper } from "@/components/shared/BookingStepper";
import { BookingSummaryPanel } from "@/components/rental/BookingSummaryPanel";
import { trackPageView, funnelEvents } from "@/lib/analytics";
import { 
  calculateBookingPricing, 
  ageRangeToAgeBand, 
  PROTECTION_PACKAGES,
  BOOKING_INCLUDED_FEATURES,
} from "@/lib/pricing";

export default function Protection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: vehicles } = useVehicles();
  
  const vehicleId = searchParams.get("vehicleId") || searchData.selectedVehicleId;
  const [selectedPackage, setSelectedPackage] = useState<string>("none");

  const vehicle = vehicles?.find((v) => v.id === vehicleId);

  // Track page view on mount
  useEffect(() => {
    trackPageView("Protection Selection");
    if (vehicleId && vehicle) {
      funnelEvents.vehicleSelected(vehicleId, vehicle.make, vehicle.model, vehicle.dailyRate);
    }
  }, [vehicleId, vehicle]);
  
  // Calculate total price using central pricing utility
  const driverAgeBand = ageRangeToAgeBand(searchData.ageRange);
  const selectedProtection = PROTECTION_PACKAGES.find((p) => p.id === selectedPackage);
  
  const pricing = calculateBookingPricing({
    vehicleDailyRate: vehicle?.dailyRate || 0,
    rentalDays,
    protectionDailyRate: selectedProtection?.dailyRate || 0,
    driverAgeBand,
  });
  
  const totalPrice = pricing.total;

  const handleContinue = () => {
    // Track protection selection
    funnelEvents.protectionSelected(selectedPackage, selectedProtection?.dailyRate || 0);

    // Build URL params for add-ons step
    const params = new URLSearchParams();
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    params.set("protection", selectedPackage);

    navigate(`/add-ons?${params.toString()}`);
  };

  const handleBack = () => {
    navigate("/search");
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
                  Which protection do you need?
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
            {/* Protection Packages - Main Content */}
            <div className="lg:col-span-2">
              {/* Protection Packages - Horizontal row on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {PROTECTION_PACKAGES.map((pkg) => (
                  <Card
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={cn(
                      "relative p-4 cursor-pointer transition-all hover:shadow-md flex flex-col",
                      selectedPackage === pkg.id
                        ? "ring-2 ring-primary border-primary"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {/* Header row: Title + Selection indicator */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-base leading-tight">{pkg.name}</h3>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          selectedPackage === pkg.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedPackage === pkg.id && (
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Rating stars + discount badge inline */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-xs",
                              i < pkg.rating ? "text-amber-500" : "text-muted-foreground/30"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      {pkg.discount && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 h-5 border-emerald-600 text-emerald-600 whitespace-nowrap"
                        >
                          - {pkg.discount.replace(' online discount', '')}
                        </Badge>
                      )}
                    </div>

                    {/* Deductible */}
                    <p
                      className={cn(
                        "text-xs font-medium mb-3",
                        pkg.deductible === "No deductible"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      )}
                    >
                      {pkg.deductible === "No deductible" ? "No deductible" : `Deductible: ${pkg.deductible.replace('Up to ', '')}`}
                    </p>

                    {/* Features - compact list */}
                    <div className="space-y-1.5 mb-3 flex-1">
                      {pkg.features.map((feature) => (
                        <div
                          key={feature.name}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {feature.included ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          )}
                          <span
                            className={cn(
                              "truncate",
                              feature.included
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {feature.name}
                          </span>
                          {feature.tooltip && (
                            <Info className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Price - compact */}
                    <div className="pt-2 border-t border-border mt-auto">
                      {pkg.dailyRate === 0 ? (
                        <p className="text-sm font-semibold">Included</p>
                      ) : (
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">CA$</span>
                          <span className="text-lg font-bold">
                            {pkg.dailyRate.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">/ day</span>
                          {pkg.originalRate && (
                            <span className="text-xs text-muted-foreground line-through ml-1">
                              CA${pkg.originalRate.toFixed(2)}/day
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Included Features */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Your booking overview:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BOOKING_INCLUDED_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{feature}</span>
                      <Info className="w-3 h-3 text-muted-foreground ml-auto" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar - Booking Summary with Total */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <BookingSummaryPanel 
                  showPricing={true} 
                  protectionDailyRate={selectedProtection?.dailyRate || 0}
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
