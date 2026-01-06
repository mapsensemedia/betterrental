/**
 * Protection - Select protection package before checkout
 */
import { useState } from "react";
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

interface ProtectionPackage {
  id: string;
  name: string;
  dailyRate: number;
  originalRate?: number;
  deductible: string;
  discount?: string;
  rating: number;
  features: {
    name: string;
    included: boolean;
    tooltip?: string;
  }[];
  isRecommended?: boolean;
}

const protectionPackages: ProtectionPackage[] = [
  {
    id: "none",
    name: "No extra protection",
    dailyRate: 0,
    deductible: "Up to full vehicle value",
    rating: 0,
    features: [
      { name: "Loss Damage Waiver", included: false },
      { name: "Tire and Glass Protection", included: false },
      { name: "Extended Roadside Protection", included: false },
    ],
  },
  {
    id: "basic",
    name: "Basic Protection",
    dailyRate: 33.99,
    deductible: "Up to $800.00",
    rating: 1,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Covers vehicle damage and theft with reduced deductible" },
      { name: "Tire and Glass Protection", included: false },
      { name: "Extended Roadside Protection", included: false },
    ],
  },
  {
    id: "smart",
    name: "Smart Protection",
    dailyRate: 39.25,
    originalRate: 50.97,
    discount: "23% online discount",
    deductible: "No deductible",
    rating: 2,
    isRecommended: true,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Full coverage with zero deductible" },
      { name: "Tire and Glass Protection", included: true, tooltip: "Covers tire and windshield damage" },
      { name: "Extended Roadside Protection", included: false },
    ],
  },
  {
    id: "premium",
    name: "All Inclusive Protection",
    dailyRate: 49.77,
    originalRate: 59.96,
    discount: "17% online discount",
    deductible: "No deductible",
    rating: 3,
    features: [
      { name: "Loss Damage Waiver", included: true, tooltip: "Complete peace of mind" },
      { name: "Tire and Glass Protection", included: true, tooltip: "Full tire and glass coverage" },
      { name: "Extended Roadside Protection", included: true, tooltip: "24/7 roadside assistance anywhere" },
    ],
  },
];

const includedFeatures = [
  "Third party insurance",
  "24/7 Roadside Assistance Hotline",
  "Unlimited kilometers",
  "Extended Roadside Protection",
  "Booking option: Best price - Pay now, cancel and rebook for a fee",
];

export default function Protection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchData, rentalDays } = useRentalBooking();
  const { data: vehicles } = useVehicles();
  
  const vehicleId = searchParams.get("vehicleId") || searchData.selectedVehicleId;
  const [selectedPackage, setSelectedPackage] = useState<string>("none");

  const vehicle = vehicles?.find((v) => v.id === vehicleId);
  
  // Calculate total price
  const selectedProtection = protectionPackages.find((p) => p.id === selectedPackage);
  const protectionTotal = (selectedProtection?.dailyRate || 0) * rentalDays;
  const vehicleTotal = (vehicle?.dailyRate || 0) * rentalDays;
  const totalPrice = vehicleTotal + protectionTotal;

  const handleContinue = () => {
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
                Which Protection Package Do You Need?
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
          {/* Protection Packages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {protectionPackages.map((pkg) => (
              <Card
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={cn(
                  "relative p-5 cursor-pointer transition-all hover:shadow-lg",
                  selectedPackage === pkg.id
                    ? "ring-2 ring-primary border-primary"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                {/* Selection indicator */}
                <div className="absolute top-4 right-4">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
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

                {/* Title */}
                <h3 className="font-semibold text-lg mb-2 pr-8">{pkg.name}</h3>

                {/* Rating stars */}
                <div className="flex gap-0.5 mb-3">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-sm",
                        i < pkg.rating ? "text-amber-500" : "text-muted-foreground/30"
                      )}
                    >
                      ★
                    </span>
                  ))}
                </div>

                {/* Discount badge */}
                {pkg.discount && (
                  <Badge variant="destructive" className="mb-3 text-xs">
                    {pkg.discount}
                  </Badge>
                )}

                {/* Deductible */}
                <p
                  className={cn(
                    "text-sm font-medium mb-4",
                    pkg.deductible === "No deductible"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  )}
                >
                  Deductible: {pkg.deductible}
                </p>

                {/* Features */}
                <div className="space-y-2 mb-4 border-t border-border pt-4">
                  {pkg.features.map((feature) => (
                    <div
                      key={feature.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      {feature.included ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={cn(
                          feature.included
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {feature.name}
                      </span>
                      {feature.tooltip && (
                        <Info className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Price */}
                <div className="mt-auto pt-2 border-t border-border">
                  {pkg.dailyRate === 0 ? (
                    <p className="text-lg font-semibold">Included</p>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">CA$</span>
                      <span className="text-2xl font-bold">
                        {pkg.dailyRate.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">/ day</span>
                      {pkg.originalRate && (
                        <span className="text-sm text-muted-foreground line-through">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {includedFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feature}</span>
                  <Info className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
              ))}
            </div>
          </Card>

          {/* Vehicle summary (if available) */}
          {vehicle && (
            <Card className="p-6 mt-6">
              <h3 className="font-semibold mb-4">Selected Vehicle</h3>
              <div className="flex items-center gap-4">
                {vehicle.imageUrl && (
                  <img
                    src={vehicle.imageUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-32 h-20 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${vehicle.dailyRate}/day × {rentalDays} days = $
                    {vehicleTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
