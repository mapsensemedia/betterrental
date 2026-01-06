import { useState } from "react";
import { MapPin, Calendar, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { LocationSelector } from "./LocationSelector";

interface TripContextPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onComplete?: () => void;
}

export function TripContextPrompt({
  open,
  onOpenChange,
  title = "Where and when?",
  description = "Select your pickup location and rental dates to continue",
  onComplete,
}: TripContextPromptProps) {
  const {
    searchData,
    setPickupLocation,
    setPickupDateTime,
    setReturnDateTime,
  } = useRentalBooking();

  const locationId = searchData.pickupLocationId;
  const startDate = searchData.pickupDate;
  const endDate = searchData.returnDate;

  const [step, setStep] = useState<"location" | "dates">(
    locationId ? "dates" : "location"
  );

  const handleLocationSelect = (id: string) => {
    setPickupLocation(id);
    setStep("dates");
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setPickupDateTime(range?.from || null, searchData.pickupTime);
    setReturnDateTime(range?.to || null, searchData.returnTime);
  };

  const handleContinue = () => {
    onOpenChange(false);
    onComplete?.();
  };

  const isComplete = locationId && startDate && endDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "location" ? (
              <MapPin className="w-5 h-5 text-primary" />
            ) : (
              <Calendar className="w-5 h-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep("location")}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                step === "location"
                  ? "bg-primary text-primary-foreground"
                  : locationId
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <MapPin className="w-4 h-4" />
              Location
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={() => locationId && setStep("dates")}
              disabled={!locationId}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                step === "dates"
                  ? "bg-primary text-primary-foreground"
                  : startDate && endDate
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
                !locationId && "opacity-50 cursor-not-allowed"
              )}
            >
              <Calendar className="w-4 h-4" />
              Dates
            </button>
          </div>

          {/* Step content */}
          {step === "location" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose where you'd like to pick up your vehicle
              </p>
              <LocationSelector
                value={locationId}
                onChange={handleLocationSelect}
                className="w-full"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs mb-1">Pickup</p>
                  <p className="font-medium">
                    {startDate ? format(startDate, "EEE, MMM d") : "Select date"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-muted-foreground text-xs mb-1">Return</p>
                  <p className="font-medium">
                    {endDate ? format(endDate, "EEE, MMM d") : "Select date"}
                  </p>
                </div>
              </div>
              <CalendarComponent
                mode="range"
                selected={{
                  from: startDate || undefined,
                  to: endDate || undefined,
                }}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                disabled={(date) => date < new Date()}
                className="pointer-events-auto rounded-xl border"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!isComplete}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}