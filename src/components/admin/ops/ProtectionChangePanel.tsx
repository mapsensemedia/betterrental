/**
 * ProtectionChangePanel - Change or remove the protection plan at the counter
 * during customer check-in, with automatic pricing recalculation.
 *
 * All financial writes go through reprice-booking edge function.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Shield, ShieldCheck, ShieldX, Loader2, Check, Star, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useProtectionPackages } from "@/hooks/use-protection-settings";
import { calculateBookingPricing, type DriverAgeBand } from "@/lib/pricing";
import { extractEdgeFunctionError } from "@/lib/edge-function-error";
import { cn } from "@/lib/utils";

interface ProtectionChangePanelProps {
  bookingId: string;
  booking: {
    protection_plan: string | null;
    daily_rate: number;
    total_days: number;
    subtotal: number;
    tax_amount: number | null;
    total_amount: number;
    driver_age_band: string | null;
    start_at: string;
    young_driver_fee: number | null;
  };
  /** Vehicle category name for group-based protection pricing */
  categoryName?: string | null;
}

function useChangeProtection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      newPlan,
      oldPlan,
    }: {
      bookingId: string;
      newPlan: string;
      oldPlan: string | null;
    }) => {
      const { data, error } = await supabase.functions.invoke("reprice-booking", {
        body: {
          bookingId,
          operation: "change_protection",
          newProtectionPlan: newPlan,
        },
      });

      if (error || data?.error) {
        const msg = await extractEdgeFunctionError(data, error);
        throw new Error(msg);
      }

      return { bookingId, oldPlan, newPlan };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["booking", result.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", result.bookingId] });

      const planLabel = result.newPlan === "none" ? "No Protection" : result.newPlan;
      toast.success(`Protection changed to ${planLabel}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update protection plan");
    },
  });
}

export function ProtectionChangePanel({ bookingId, booking, categoryName }: ProtectionChangePanelProps) {
  const currentPlan = booking.protection_plan || "none";
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [showPicker, setShowPicker] = useState(false);

  const { packages, rates, isLoading: packagesLoading } = useProtectionPackages(categoryName);
  const changeMutation = useChangeProtection();

  const currentPkg = packages.find(p => p.id === currentPlan);
  const selectedPkg = packages.find(p => p.id === selectedPlan);
  const hasChanged = selectedPlan !== currentPlan;

  // Calculate pricing impact (client-side preview only)
  const getNewPricing = (planId: string) => {
    const pkg = packages.find(p => p.id === planId);
    const protectionDailyRate = pkg?.dailyRate || 0;

    const ageBand = booking.driver_age_band === "20_24" ? ("20_24" as DriverAgeBand) : null;

    return calculateBookingPricing({
      vehicleDailyRate: booking.daily_rate,
      rentalDays: booking.total_days,
      protectionDailyRate,
      driverAgeBand: ageBand,
      pickupDate: new Date(booking.start_at),
    });
  };

  const handleConfirm = () => {
    if (!hasChanged) return;
    changeMutation.mutate(
      {
        bookingId,
        newPlan: selectedPlan,
        oldPlan: currentPlan,
      },
      {
        onSuccess: () => {
          setShowPicker(false);
        },
      }
    );
  };

  const priceDiff = hasChanged
    ? getNewPricing(selectedPlan).total - getNewPricing(currentPlan).total
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Protection Plan
        </CardTitle>
        <CardDescription>
          Change or remove the customer's protection plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Protection Display */}
        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border">
          <div className="flex items-center gap-3">
            {currentPlan === "none" ? (
              <ShieldX className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            <div>
              <p className="text-sm font-medium">
                {currentPkg?.name || "No Protection"}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentPlan !== "none" && currentPkg
                  ? `$${currentPkg.dailyRate.toFixed(2)}/day × ${booking.total_days}d = $${(currentPkg.dailyRate * booking.total_days).toFixed(2)}`
                  : "No coverage selected"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPlan(currentPlan);
              setShowPicker(!showPicker);
            }}
          >
            {showPicker ? "Cancel" : "Change"}
          </Button>
        </div>

        {/* Protection Picker */}
        {showPicker && (
          <div className="space-y-3">
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Protection
            </p>

            {packagesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <RadioGroup
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                className="space-y-2"
              >
                {packages.map((pkg) => {
                  const isSelected = selectedPlan === pkg.id;
                  const isCurrent = currentPlan === pkg.id;
                  const totalForPlan = pkg.dailyRate * booking.total_days;

                  return (
                    <label
                      key={pkg.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <RadioGroupItem value={pkg.id} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{pkg.name}</span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Current
                            </Badge>
                          )}
                          {pkg.isRecommended && (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
                              <Star className="w-2.5 h-2.5 mr-0.5" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pkg.deductible}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {pkg.features.map((f) => (
                            <span
                              key={f.name}
                              className={cn(
                                "text-[11px]",
                                f.included
                                  ? "text-emerald-600"
                                  : "text-muted-foreground line-through"
                              )}
                            >
                              {f.included && <Check className="w-2.5 h-2.5 inline mr-0.5" />}
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {pkg.dailyRate > 0 ? (
                          <>
                            <p className="text-sm font-semibold">
                              ${pkg.dailyRate.toFixed(2)}
                              <span className="text-xs font-normal text-muted-foreground">/day</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${totalForPlan.toFixed(2)} total
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Free</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            )}

            {/* Price Impact */}
            {hasChanged && (
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Price Impact
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {currentPkg?.name || "No extra protection"}
                    <ArrowRight className="w-3 h-3 inline mx-1.5 text-muted-foreground" />
                    {selectedPkg?.name || "None"}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      priceDiff > 0
                        ? "text-destructive"
                        : priceDiff < 0
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {priceDiff > 0 ? "+" : ""}${priceDiff.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Confirm Button */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPlan(currentPlan);
                  setShowPicker(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!hasChanged || changeMutation.isPending}
                onClick={handleConfirm}
              >
                {changeMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                Confirm Change
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
