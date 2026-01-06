/**
 * AddOns - Select additional services after protection
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Info, Plus, Shield, Users, Car, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { useVehicles } from "@/hooks/use-vehicles";
import { useAddOns } from "@/hooks/use-add-ons";
import { cn } from "@/lib/utils";

const ADDON_ICONS: Record<string, typeof Users> = {
  "additional driver": Users,
  "roadside": Car,
  "tire": Car,
  "infant": Baby,
  "toddler": Baby,
  "booster": Baby,
  "gps": Car,
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

const includedFeatures = [
  "Third party insurance",
  "24/7 Roadside Assistance Hotline",
  "Unlimited kilometers",
  "Booking option: Best price - Pay now, cancel and rebook for a fee",
];

export default function AddOns() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays, setSelectedAddOns, toggleAddOn } = useRentalBooking();
  const { data: vehicles } = useVehicles();
  const { data: addOns = [] } = useAddOns();

  const vehicleId = searchParams.get("vehicleId") || searchData.selectedVehicleId;
  const protection = searchParams.get("protection") || "none";
  const [selectedAddOnIds, setLocalSelectedAddOns] = useState<string[]>(searchData.selectedAddOnIds || []);

  const vehicle = vehicles?.find((v) => v.id === vehicleId);

  // Calculate totals
  const protectionRates: Record<string, number> = {
    none: 0,
    basic: 33.99,
    smart: 39.25,
    premium: 49.77,
  };
  const protectionDailyRate = protectionRates[protection] || 0;
  const protectionTotal = protectionDailyRate * rentalDays;
  const vehicleTotal = (vehicle?.dailyRate || 0) * rentalDays;
  
  const addOnsTotal = selectedAddOnIds.reduce((sum, id) => {
    const addon = addOns.find((a) => a.id === id);
    if (!addon) return sum;
    return sum + addon.dailyRate * rentalDays + (addon.oneTimeFee || 0);
  }, 0);

  const totalPrice = vehicleTotal + protectionTotal + addOnsTotal;

  const handleToggleAddOn = (id: string) => {
    setLocalSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    // Save to context
    setSelectedAddOns(selectedAddOnIds);

    // Build URL params for checkout
    const params = new URLSearchParams();
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    params.set("protection", protection);
    params.set("addOns", selectedAddOnIds.join(","));

    navigate(`/checkout?${params.toString()}`);
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (vehicleId) params.set("vehicleId", vehicleId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    navigate(`/protection?${params.toString()}`);
  };

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold uppercase tracking-wide">
                Which Add-Ons Do You Need?
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total:</p>
                <p className="text-2xl font-bold">
                  CA${totalPrice.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={handleContinue}
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add-ons List */}
            <div className="lg:col-span-2 space-y-4">
              {addOns.length > 0 ? (
                addOns.map((addon) => {
                  const IconComponent = getAddonIcon(addon.name);
                  const isSelected = selectedAddOnIds.includes(addon.id);
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

            {/* Booking Overview Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Your booking overview:
                </h3>
                <div className="space-y-3">
                  {includedFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                      <span>{feature}</span>
                      <Info className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Vehicle info */}
                {vehicle && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex gap-3">
                      {vehicle.imageUrl && (
                        <img
                          src={vehicle.imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-20 h-14 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rentalDays} rental day{rentalDays > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
