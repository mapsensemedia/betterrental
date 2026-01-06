/**
 * RentalStepHeader - Shared step header with stepper, back button, and compact context
 */
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Check, MapPin, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Step {
  id: string;
  label: string;
  path: string;
}

const STEPS: Step[] = [
  { id: "search", label: "Search", path: "/" },
  { id: "select", label: "Select Car", path: "/select-car" },
  { id: "extras", label: "Extras", path: "/extras" },
  { id: "checkout", label: "Checkout", path: "/checkout" },
];

interface RentalStepHeaderProps {
  currentStep: "search" | "select" | "extras" | "checkout";
  showBackButton?: boolean;
  showModifySearch?: boolean;
  className?: string;
}

export function RentalStepHeader({
  currentStep,
  showBackButton = true,
  showModifySearch = true,
  className,
}: RentalStepHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchData } = useRentalBooking();

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleBack = () => {
    if (currentStepIndex > 0) {
      navigate(STEPS[currentStepIndex - 1].path);
    } else {
      navigate(-1);
    }
  };

  const handleModifySearch = () => {
    // Navigate to home with search preserved in context
    navigate("/");
  };

  // Format compact context display
  const locationDisplay =
    searchData.deliveryMode === "delivery"
      ? searchData.deliveryPlaceName || searchData.deliveryAddress
      : searchData.pickupLocationName;

  const dateDisplay = (() => {
    if (!searchData.pickupDate || !searchData.returnDate) return null;
    const pickup = format(searchData.pickupDate, "MMM d");
    const returnD = format(searchData.returnDate, "MMM d");
    return `${pickup} - ${returnD}`;
  })();

  const timeDisplay = `${searchData.pickupTime} - ${searchData.returnTime}`;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  isUpcoming && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Step label (hidden on mobile) */}
              <span
                className={cn(
                  "hidden sm:block ml-2 text-sm font-medium",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 md:w-12 h-0.5 mx-2 md:mx-3",
                    isCompleted ? "bg-success" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Context Row + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl border border-border/50">
        {/* Compact Context */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {locationDisplay && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="max-w-[200px] truncate">{locationDisplay}</span>
              {searchData.deliveryMode === "delivery" && (
                <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  Delivery
                </span>
              )}
            </div>
          )}
          {dateDisplay && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{dateDisplay}</span>
            </div>
          )}
          {searchData.pickupDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{timeDisplay}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showModifySearch && currentStep !== "search" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleModifySearch}
              className="h-8"
            >
              Modify Search
            </Button>
          )}
          {showBackButton && currentStepIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
