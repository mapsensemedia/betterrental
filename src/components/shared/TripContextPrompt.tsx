import { useState } from "react";
import { MapPin, Calendar, ChevronRight, User } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  description = "Select your pickup location, rental dates, and confirm your age to continue",
  onComplete,
}: TripContextPromptProps) {
  const {
    searchData,
    setPickupLocation,
    setPickupDateTime,
    setReturnDateTime,
    setAgeConfirmed,
  } = useRentalBooking();

  const locationId = searchData.pickupLocationId;
  const startDate = searchData.pickupDate;
  const endDate = searchData.returnDate;
  const ageRange = searchData.ageRange;

  const [step, setStep] = useState<"location" | "dates" | "age">(
    locationId ? (startDate && endDate ? "age" : "dates") : "location"
  );
  const [localAgeRange, setLocalAgeRange] = useState<"20-24" | "25-70" | null>(ageRange);

  const handleLocationSelect = (id: string) => {
    setPickupLocation(id);
    setStep("dates");
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setPickupDateTime(range?.from || null, searchData.pickupTime);
    setReturnDateTime(range?.to || null, searchData.returnTime);
  };

  const handleAgeSelect = (range: "20-24" | "25-70") => {
    setLocalAgeRange(range);
    setAgeConfirmed(true, range);
  };

  const handleContinue = () => {
    if (step === "location" && locationId) {
      setStep("dates");
      return;
    }
    if (step === "dates" && startDate && endDate) {
      setStep("age");
      return;
    }
    if (step === "age" && localAgeRange) {
      onOpenChange(false);
      onComplete?.();
    }
  };

  const isComplete = locationId && startDate && endDate && localAgeRange;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "location" ? (
              <MapPin className="w-5 h-5 text-primary" />
            ) : step === "dates" ? (
              <Calendar className="w-5 h-5 text-primary" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2 flex-wrap">
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
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={() => locationId && startDate && endDate && setStep("age")}
              disabled={!locationId || !startDate || !endDate}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                step === "age"
                  ? "bg-primary text-primary-foreground"
                  : localAgeRange
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground",
                (!locationId || !startDate || !endDate) && "opacity-50 cursor-not-allowed"
              )}
            >
              <User className="w-4 h-4" />
              Age
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
          ) : step === "dates" ? (
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
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Confirm the primary driver's age range
              </p>
              <RadioGroup
                value={localAgeRange || ""}
                onValueChange={(value) => handleAgeSelect(value as "20-24" | "25-70")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="20-24" id="age-20-24" />
                  <Label htmlFor="age-20-24" className="flex-1 cursor-pointer">
                    <span className="font-medium">20-24 years old</span>
                    <p className="text-sm text-muted-foreground">Young driver fee applies (CAD $20)</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="25-70" id="age-25-70" />
                  <Label htmlFor="age-25-70" className="flex-1 cursor-pointer">
                    <span className="font-medium">25-70 years old</span>
                    <p className="text-sm text-muted-foreground">No additional fee</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step !== "age" ? (
            <Button 
              onClick={handleContinue} 
              disabled={
                (step === "location" && !locationId) ||
                (step === "dates" && (!startDate || !endDate))
              }
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleContinue} disabled={!isComplete}>
              Continue
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}