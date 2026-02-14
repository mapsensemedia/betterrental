import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DamageReportDialog } from "@/components/admin/DamageReportDialog";
import { calculateFuelShortage, TANK_SIZES, getFuelLevelLabel } from "@/lib/fuel-pricing";
import { 
  DollarSign, 
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Plus,
  Fuel,
  AlertTriangle,
} from "lucide-react";

interface StepReturnFeesProps {
  bookingId: string;
  vehicleId: string;
  completion: {
    reviewed: boolean;
    damagesRecorded: boolean;
  };
  onMarkReviewed: () => void;
  isMarking: boolean;
}

export function StepReturnFees({ 
  bookingId, 
  vehicleId, 
  completion, 
  onMarkReviewed, 
  isMarking 
}: StepReturnFeesProps) {
  const [acknowledged, setAcknowledged] = useState(completion.reviewed);
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);

  // Fetch vehicle info for damage dialog
  // vehicle_id on bookings points to vehicle_categories, not vehicles
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-category", vehicleId],
    queryFn: async () => {
      // Try vehicle_categories first (booking.vehicle_id points here)
      const { data: cat } = await supabase
        .from("vehicle_categories")
        .select("id, name, image_url")
        .eq("id", vehicleId)
        .maybeSingle();
      if (cat) {
        return { make: cat.name, model: "", year: new Date().getFullYear(), category: cat.name };
      }
      // Fallback to vehicles table
      const { data, error } = await supabase
        .from("vehicles")
        .select("make, model, year, category")
        .eq("id", vehicleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Fetch booking for code and assigned unit
  const { data: booking } = useQuery({
    queryKey: ["booking-for-fees", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_code, assigned_unit_id, late_return_fee")
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingId,
  });

  // Fetch vehicle unit for tank capacity
  const { data: vehicleUnit } = useQuery({
    queryKey: ["vehicle-unit-tank", booking?.assigned_unit_id],
    queryFn: async () => {
      if (!booking?.assigned_unit_id) return null;
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("tank_capacity_liters")
        .eq("id", booking.assigned_unit_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!booking?.assigned_unit_id,
  });

  // Fetch inspection metrics (pickup & return fuel levels)
  const { data: inspectionMetrics } = useQuery({
    queryKey: ["inspection-metrics-fuel", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_metrics")
        .select("phase, fuel_level")
        .eq("booking_id", bookingId)
        .in("phase", ["pickup", "return"]);
      
      if (error) throw error;
      
      const pickup = data?.find(m => m.phase === "pickup");
      const returnMetrics = data?.find(m => m.phase === "return");
      
      return {
        pickupFuel: pickup?.fuel_level ?? null,
        returnFuel: returnMetrics?.fuel_level ?? null,
      };
    },
    enabled: !!bookingId,
  });

  // Fetch damage reports for this booking
  const { data: damages, isLoading: loadingDamages, refetch: refetchDamages } = useQuery({
    queryKey: ["booking-damages", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_reports")
        .select("*")
        .eq("booking_id", bookingId);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate fuel shortage
  const tankCapacity = vehicleUnit?.tank_capacity_liters || 
    (vehicle?.category ? TANK_SIZES[vehicle.category.toLowerCase()] : null) || 
    TANK_SIZES.default;
  
  const fuelShortage = calculateFuelShortage(
    inspectionMetrics?.pickupFuel ?? null,
    inspectionMetrics?.returnFuel ?? null,
    tankCapacity
  );

  const hasDamages = damages && damages.length > 0;
  const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;
  const lateReturnFee = booking?.late_return_fee || 0;
  const fuelCharge = fuelShortage?.chargeAmount || 0;
  
  // Total additional fees
  const totalFees = totalDamageCost + lateReturnFee + fuelCharge;
  const hasFees = totalFees > 0;

  const vehicleName = vehicle 
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` 
    : "Vehicle";

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={completion.reviewed 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : hasFees 
          ? "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
          : "border-muted"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            completion.reviewed ? "text-emerald-600" : hasFees ? "text-amber-600" : "text-muted-foreground"
          }`}>
            {completion.reviewed ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Fees reviewed</span>
              </>
            ) : hasFees ? (
              <>
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  ${totalFees.toFixed(2)} in additional charges
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">No additional fees</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fuel Shortage Card */}
      {inspectionMetrics && (
        <Card className={fuelShortage?.hasShortage ? "border-amber-500/50" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Fuel Status
            </CardTitle>
            <CardDescription>
              Compare fuel levels at pickup and return
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inspectionMetrics.pickupFuel !== null && inspectionMetrics.returnFuel !== null ? (
              <div className="space-y-4">
                {/* Fuel comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">At Pickup</p>
                    <p className="text-lg font-semibold">{getFuelLevelLabel(inspectionMetrics.pickupFuel)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">At Return</p>
                    <p className="text-lg font-semibold">{getFuelLevelLabel(inspectionMetrics.returnFuel)}</p>
                  </div>
                </div>

                {/* Fuel shortage alert */}
                {fuelShortage?.hasShortage ? (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Fuel shortage detected</p>
                          <p className="text-sm mt-1">
                            {fuelShortage.shortageLiters}L missing ({fuelShortage.shortagePercent}% of tank)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${fuelShortage.chargeAmount.toFixed(2)}</p>
                          <p className="text-xs">fuel charge</p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-emerald-700 dark:text-emerald-300">
                      Fuel returned at or above pickup level
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                <p className="text-sm">Fuel readings not recorded</p>
                <p className="text-xs mt-1">Complete intake step to record fuel levels</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Damage Button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Report Damage
          </CardTitle>
          <CardDescription>
            Document any new damage found during the return inspection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => setDamageDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Report New Damage
          </Button>
        </CardContent>
      </Card>

      {/* Damages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Damage Reports
          </CardTitle>
          <CardDescription>
            Review any damage reports for this rental
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDamages ? (
            <div className="py-6 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading damage reports...
            </div>
          ) : hasDamages ? (
            <div className="space-y-4">
              {damages.map((damage) => (
                <div 
                  key={damage.id} 
                  className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          damage.severity === "severe" ? "destructive" :
                          damage.severity === "moderate" ? "secondary" : "outline"
                        }>
                          {damage.severity}
                        </Badge>
                        <span className="text-sm font-medium">{damage.location_on_vehicle}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {damage.description}
                      </p>
                    </div>
                    {damage.estimated_cost && (
                      <span className="text-destructive font-medium">
                        ${damage.estimated_cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Total */}
              <div className="pt-4 border-t flex items-center justify-between">
                <span className="font-medium">Total Damage Estimate</span>
                <span className="text-lg font-semibold text-destructive">
                  ${totalDamageCost.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
              <p className="font-medium text-emerald-600">No damages reported</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vehicle returned in good condition
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Fees Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Additional Fees Summary
          </CardTitle>
          <CardDescription>
            All additional charges for this rental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Fuel charge */}
            {fuelCharge > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-amber-600" />
                  <span>Fuel shortage</span>
                </div>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  ${fuelCharge.toFixed(2)}
                </span>
              </div>
            )}
            
            {/* Late return fee */}
            {lateReturnFee > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Late return fee</span>
                </div>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  ${lateReturnFee.toFixed(2)}
                </span>
              </div>
            )}
            
            {/* Damage charges */}
            {totalDamageCost > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <span>Damage charges</span>
                </div>
                <span className="font-medium text-destructive">
                  ${totalDamageCost.toFixed(2)}
                </span>
              </div>
            )}
            
            {/* No fees */}
            {!hasFees && (
              <div className="py-4 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm">No additional fees</p>
              </div>
            )}
            
            {/* Total */}
            {hasFees && (
              <div className="pt-4 border-t flex items-center justify-between">
                <span className="font-semibold">Total Additional Fees</span>
                <span className="text-xl font-bold">
                  ${totalFees.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Button */}
      {!completion.reviewed && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox 
              id="acknowledge-fees" 
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <label htmlFor="acknowledge-fees" className="text-sm cursor-pointer">
              I have reviewed all damages and fees for this return
            </label>
          </div>
          
          <Button
            onClick={onMarkReviewed}
            disabled={!acknowledged || isMarking}
            className="w-full"
          >
            {isMarking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Confirm Fees Reviewed"
            )}
          </Button>
        </div>
      )}

      {/* Damage Report Dialog */}
      <DamageReportDialog
        open={damageDialogOpen}
        onOpenChange={(open) => {
          setDamageDialogOpen(open);
          if (!open) refetchDamages();
        }}
        vehicleId={vehicleId}
        vehicleName={vehicleName}
        bookingId={bookingId}
        bookingCode={booking?.booking_code}
      />
    </div>
  );
}
