/**
 * SearchModifyBar - Compact bar showing current search criteria with modify option
 * Displayed at top of browse cars page
 *
 * Uses a viewport-bounded dialog with an independent scroll area so the form
 * and confirmation action remain reachable on every screen size.
 */
import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Edit, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RentalSearchCard } from "@/components/rental/RentalSearchCard";
import { useRentalBooking } from "@/contexts/RentalBookingContext";
import { cn } from "@/lib/utils";

interface SearchModifyBarProps {
  className?: string;
}

export function SearchModifyBar({ className }: SearchModifyBarProps) {
  const { searchData, setDeliveryMode } = useRentalBooking();
  const [showModifyDialog, setShowModifyDialog] = useState(false);

  const isDelivery = searchData.deliveryMode === "delivery";

  const branchDisplay = searchData.pickupLocationAddress || searchData.pickupLocationName;
  const locationDisplay = isDelivery ? searchData.deliveryAddress : branchDisplay;
  const returnLocationDisplay = branchDisplay;

  const pickupDateDisplay = searchData.pickupDate
    ? format(searchData.pickupDate, "d MMMM")
    : null;

  const returnDateDisplay = searchData.returnDate
    ? format(searchData.returnDate, "d MMMM")
    : null;

  // Closing without a delivery address would leave the page in an incomplete
  // delivery state, so fall back to pick-up in that case.
  const handleClose = () => {
    setShowModifyDialog(false);
    if (
      searchData.deliveryMode === "delivery" &&
      (!searchData.deliveryAddress || searchData.deliveryLat == null)
    ) {
      setDeliveryMode("pickup");
    }
  };

  // Switching to delivery needs an address, so select the mode AND open the panel.
  const handleSelectDelivery = () => {
    setDeliveryMode("delivery");
    setShowModifyDialog(true);
  };

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
              {/* Pick-up / Delivery switch — display only, dates & times untouched.
                  Switching to delivery opens the search panel because an address
                  is required; switching back to pick-up is instant. */}
              <div className="col-span-2 sm:col-span-1 flex flex-col w-full sm:w-auto">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  How you get the car
                </span>
                <div className="grid grid-cols-2 sm:inline-flex rounded-md border-2 border-foreground overflow-hidden w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => isDelivery && setDeliveryMode("pickup")}
                    aria-pressed={!isDelivery}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors",
                      !isDelivery
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    <MapPin className="w-4 h-4" />
                    Pick-up
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectDelivery}
                    aria-pressed={isDelivery}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors border-l-2 border-foreground",
                      isDelivery
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    <Truck className="w-4 h-4" />
                    Deliver to me
                  </button>
                </div>
              </div>

              {/* Pick-up / delivery location */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {isDelivery ? "Delivery to" : "Pick-up"}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[150px]">
                  {locationDisplay || "Not set"}
                </span>
              </div>

              {/* Drop-off */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {isDelivery ? "Return to" : "Drop-off"}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[150px]">
                  {returnLocationDisplay || "Not set"}
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

      <Dialog
        open={showModifyDialog}
        onOpenChange={(open) => {
          if (open) setShowModifyDialog(true);
          else handleClose();
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[90dvh]">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 sm:px-5">
            <DialogTitle>Modify Your Search</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 [-webkit-overflow-scrolling:touch]">
            <RentalSearchCard
              className="rounded-md p-3 shadow-none sm:p-4"
              onSearchComplete={handleClose}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
