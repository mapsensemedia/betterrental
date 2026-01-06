/**
 * BookingStepper - Visual step progress indicator for booking flow
 * Shows: Search → Select Car → Extras → Checkout
 */
import { Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRentalBooking } from "@/contexts/RentalBookingContext";

const STEPS = [
  { id: 1, label: "Search", path: "/search" },
  { id: 2, label: "Select Car", path: "/search" },
  { id: 3, label: "Extras", path: "/add-ons" },
  { id: 4, label: "Checkout", path: "/checkout" },
];

interface BookingStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
}

export function BookingStepper({ currentStep, className }: BookingStepperProps) {
  const location = useLocation();
  const { searchData, isSearchValid } = useRentalBooking();

  // Build URL params for navigation
  const buildParams = () => {
    const params = new URLSearchParams();
    if (searchData.selectedVehicleId) params.set("vehicleId", searchData.selectedVehicleId);
    if (searchData.pickupDate) params.set("startAt", searchData.pickupDate.toISOString());
    if (searchData.returnDate) params.set("endAt", searchData.returnDate.toISOString());
    if (searchData.pickupLocationId) params.set("locationId", searchData.pickupLocationId);
    return params.toString();
  };

  const getStepPath = (stepId: number) => {
    const params = buildParams();
    switch (stepId) {
      case 1:
      case 2:
        return "/search";
      case 3:
        return `/protection?${params}`;
      case 4:
        return `/checkout?${params}`;
      default:
        return "/search";
    }
  };

  const canNavigateTo = (stepId: number): boolean => {
    if (stepId === 1) return true;
    if (stepId === 2) return isSearchValid;
    if (stepId === 3) return isSearchValid && !!searchData.selectedVehicleId;
    if (stepId === 4) return isSearchValid && !!searchData.selectedVehicleId;
    return false;
  };

  return (
    <div className={cn("flex items-center justify-center gap-0 px-2", className)}>
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isClickable = canNavigateTo(step.id) && step.id < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              {isClickable ? (
                <Link to={getStepPath(step.id)} className="flex flex-col items-center group">
                  <div
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs mt-1 whitespace-nowrap group-hover:text-primary",
                      isCurrent && "font-medium text-foreground",
                      isCompleted && "text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </Link>
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary text-primary-foreground",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs mt-1 whitespace-nowrap",
                      isCurrent && "font-medium text-foreground",
                      isCompleted && "text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )}
            </div>

            {/* Connector Line - shorter on mobile */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-12 md:w-16 h-0.5 mx-1 sm:mx-2",
                  step.id < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
