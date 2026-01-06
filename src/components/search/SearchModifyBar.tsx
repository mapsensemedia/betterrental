/**
 * SearchModifyBar - Compact bar showing current search criteria with modify option
 * Displayed at top of browse cars page
 */
import { useState } from "react";
import { format } from "date-fns";
import { MapPin, Calendar, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { cn } from "@/lib/utils";

interface SearchModifyBarProps {
  className?: string;
}

export function SearchModifyBar({ className }: SearchModifyBarProps) {
  const { searchData, rentalDays } = useRentalBooking();
  const [showModifyDialog, setShowModifyDialog] = useState(false);

  // Display full address including city
  const locationDisplay = searchData.deliveryMode === "delivery"
    ? searchData.deliveryAddress
    : searchData.pickupLocationAddress || searchData.pickupLocationName;

  const pickupDateDisplay = searchData.pickupDate
    ? format(searchData.pickupDate, "d MMMM")
    : null;
  
  const returnDateDisplay = searchData.returnDate
    ? format(searchData.returnDate, "d MMMM")
    : null;

  return (
    <>
      <div className={cn("bg-card border-b border-border", className)}>
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
            {/* Left: Title and description */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold">Book car in easy steps</h2>
              <p className="text-sm text-muted-foreground">
                Renting a car brings you freedom, and we'll help you find the best car for you at a great price.
            </p>
            </div>

            {/* Right: Search criteria display */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 lg:gap-6">
              {/* Pick-up Location */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                  <span className="text-xs text-muted-foreground">Pick-up</span>
                </div>
                <span className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[150px]">
                  {locationDisplay || "Not set"}
                </span>
              </div>

              {/* Drop-off (same location) */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">Drop-off</span>
                </div>
                <span className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[150px]">
                  {locationDisplay || "Not set"}
                </span>
              </div>

              {/* Pick-up Date */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Pick-up Date</span>
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  {pickupDateDisplay || "Not set"}
                </span>
              </div>

              {/* Drop-off Date */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Drop-off Date</span>
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  {returnDateDisplay || "Not set"}
                </span>
              </div>

              {/* Times */}
              <div className="flex flex-col col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Pick-up / Drop-off</span>
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  {searchData.pickupTime} / {searchData.returnTime}
                </span>
              </div>

              {/* Modify Button */}
              <div className="col-span-2 sm:col-span-1 flex justify-end sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModifyDialog(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Edit className="w-4 h-4" />
                  Modify Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modify Dialog */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modify Your Search</DialogTitle>
          </DialogHeader>
          <RentalSearchCard />
        </DialogContent>
      </Dialog>
    </>
  );
}
