import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Gauge, 
  Fuel, 
  Clock, 
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { format } from "date-fns";

// Fuel level options - granular 8-step dropdown
const FUEL_LEVELS = [
  { value: 0, label: "Empty" },
  { value: 12, label: "1/8" },
  { value: 25, label: "1/4" },
  { value: 37, label: "3/8" },
  { value: 50, label: "1/2" },
  { value: 62, label: "5/8" },
  { value: 75, label: "3/4" },
  { value: 87, label: "7/8" },
  { value: 100, label: "Full" },
];

interface StepReturnIntakeProps {
  bookingId: string;
  completion: {
    timeRecorded: boolean;
    odometerRecorded: boolean;
    fuelRecorded: boolean;
  };
  onComplete?: () => void;
  isLocked?: boolean;
  isComplete?: boolean;
}

interface OdometerValidation {
  valid: boolean;
  error?: string;
  warning?: string;
}

function validateReturnOdometer(returnReading: number, pickupReading: number | null): OdometerValidation {
  if (!pickupReading) {
    return { valid: true }; // No pickup data to compare
  }
  
  if (returnReading < pickupReading) {
    return { 
      valid: false, 
      error: `Return odometer (${returnReading.toLocaleString()} km) cannot be less than pickup (${pickupReading.toLocaleString()} km)` 
    };
  }
  
  const difference = returnReading - pickupReading;
  if (difference > 5000) {
    return { 
      valid: true, 
      warning: `Unusual mileage: ${difference.toLocaleString()} km driven. Please verify this is correct.` 
    };
  }
  
  return { valid: true };
}

export function StepReturnIntake({ bookingId, completion, onComplete, isLocked, isComplete }: StepReturnIntakeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState<number>(50);
  const [notes, setNotes] = useState("");
  const [odometerWarningConfirmed, setOdometerWarningConfirmed] = useState(false);

  // Fetch existing return inspection metrics
  const { data: existingMetrics } = useQuery({
    queryKey: ["return-inspection-metrics", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_metrics")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("phase", "return")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch pickup inspection metrics for comparison
  const { data: pickupMetrics } = useQuery({
    queryKey: ["pickup-inspection-metrics", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_metrics")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("phase", "pickup")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch booking to get assigned unit ID
  const { data: booking } = useQuery({
    queryKey: ["booking-for-return", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("assigned_unit_id")
        .eq("id", bookingId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Pre-fill form with existing data
  useEffect(() => {
    if (existingMetrics) {
      if (existingMetrics.odometer) setOdometer(existingMetrics.odometer.toString());
      if (existingMetrics.fuel_level != null) setFuelLevel(existingMetrics.fuel_level);
      if (existingMetrics.exterior_notes) setNotes(existingMetrics.exterior_notes);
    }
  }, [existingMetrics]);

  // Calculate odometer validation
  const pickupOdometer = pickupMetrics?.odometer || null;
  const odometerValue = odometer ? parseInt(odometer) : null;
  const odometerValidation = odometerValue ? validateReturnOdometer(odometerValue, pickupOdometer) : { valid: true };

  // Find the nearest fuel level option
  const findNearestFuelOption = (value: number): number => {
    const closest = FUEL_LEVELS.reduce((prev, curr) => 
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
    return closest.value;
  };

  // Calculate fuel difference
  const pickupFuel = pickupMetrics?.fuel_level || null;
  const fuelDifference = pickupFuel !== null ? fuelLevel - pickupFuel : null;
  const fuelIsLower = fuelDifference !== null && fuelDifference < 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!odometer) throw new Error("Odometer reading is required");
      
      const odometerNum = parseInt(odometer);
      const validation = validateReturnOdometer(odometerNum, pickupOdometer);
      
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      if (validation.warning && !odometerWarningConfirmed) {
        throw new Error("NEEDS_CONFIRMATION");
      }
      
      const metricsData = {
        booking_id: bookingId,
        phase: "return",
        odometer: odometerNum,
        fuel_level: fuelLevel,
        exterior_notes: notes || null,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
      };

      if (existingMetrics) {
        const { error } = await supabase
          .from("inspection_metrics")
          .update(metricsData)
          .eq("id", existingMetrics.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inspection_metrics")
          .insert(metricsData);
        if (error) throw error;
      }

      // Auto-update vehicle unit mileage if assigned
      if (booking?.assigned_unit_id && odometer) {
        const { error: unitError } = await supabase
          .from("vehicle_units")
          .update({ current_mileage: odometerNum })
          .eq("id", booking.assigned_unit_id);
        
        if (unitError) {
          console.error("Failed to update unit mileage:", unitError);
        }
      }

      return { odometerRecorded: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-inspection-metrics", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-unit"] });
    },
    onError: (error: Error) => {
      if (error.message === "NEEDS_CONFIRMATION") {
        // Don't show error, handled by UI
        return;
      }
      toast.error(error.message || "Failed to save intake");
      console.error(error);
    },
  });

  const handleSaveAndComplete = async () => {
    try {
      // Check if confirmation needed
      if (odometerValidation.warning && !odometerWarningConfirmed) {
        toast.error("Please confirm the unusual mileage before proceeding");
        return;
      }
      
      await saveMutation.mutateAsync();
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      // Error already handled in mutation
    }
  };
  
  const handleSaveOnly = async () => {
    try {
      if (odometerValidation.warning && !odometerWarningConfirmed) {
        toast.error("Please confirm the unusual mileage before saving");
        return;
      }
      
      await saveMutation.mutateAsync();
      const mileageNote = booking?.assigned_unit_id && odometer 
        ? ` - Vehicle mileage updated to ${parseInt(odometer).toLocaleString()} km`
        : "";
      toast.success(`Return intake saved${mileageNote}`);
    } catch (error) {
      // Error already handled in mutation
    }
  };

  const stepIsComplete = isComplete;
  const hasMetricsRecorded = completion.odometerRecorded && completion.fuelRecorded;

  // Can proceed if odometer is valid (or warning confirmed)
  const canProceed = odometer && (odometerValidation.valid && (!odometerValidation.warning || odometerWarningConfirmed));

  return (
    <div className="space-y-6">
      {/* Locked Warning */}
      {isLocked && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-600">
            Complete previous steps to unlock this step.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      {stepIsComplete && (
        <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Return intake complete</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Return Time
          </CardTitle>
          <CardDescription>
            Record when the vehicle was returned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {format(new Date(), "PPpp")}
            </Badge>
            <span className="text-muted-foreground text-sm">(Current time will be used)</span>
          </div>
        </CardContent>
      </Card>

      {/* Odometer Reading */}
      <Card className={!odometerValidation.valid ? "border-destructive" : odometerValidation.warning && !odometerWarningConfirmed ? "border-amber-500" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Odometer Reading
          </CardTitle>
          <CardDescription>
            Enter the current odometer reading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup reference */}
          {pickupOdometer && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Pickup odometer:</strong> {pickupOdometer.toLocaleString()} km
                {odometerValue && pickupOdometer && (
                  <span className="ml-2 text-muted-foreground">
                    • Driven: {(odometerValue - pickupOdometer).toLocaleString()} km
                  </span>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Enter mileage"
                value={odometer}
                onChange={(e) => {
                  setOdometer(e.target.value);
                  setOdometerWarningConfirmed(false); // Reset confirmation on change
                }}
                disabled={isLocked}
                className={!odometerValidation.valid ? "border-destructive" : ""}
              />
            </div>
            <span className="text-muted-foreground">km</span>
          </div>

          {/* Validation error */}
          {!odometerValidation.valid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{odometerValidation.error}</AlertDescription>
            </Alert>
          )}

          {/* Warning with confirmation */}
          {odometerValidation.warning && odometerValidation.valid && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600">
                <p>{odometerValidation.warning}</p>
                <label className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={odometerWarningConfirmed}
                    onChange={(e) => setOdometerWarningConfirmed(e.target.checked)}
                    className="rounded border-amber-400"
                  />
                  <span className="text-sm">I confirm this reading is correct</span>
                </label>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fuel Level */}
      <Card className={fuelIsLower ? "border-amber-500" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Fuel Level
          </CardTitle>
          <CardDescription>
            Select the fuel gauge reading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup reference */}
          {pickupFuel !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Pickup fuel:</strong> {FUEL_LEVELS.find(f => f.value === findNearestFuelOption(pickupFuel))?.label || `${pickupFuel}%`}
                {fuelDifference !== null && (
                  <span className={`ml-2 ${fuelIsLower ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                    • {fuelIsLower ? "⚠ Lower than pickup" : "Same or higher"}
                  </span>
                )}
              </span>
            </div>
          )}

          <Select
            value={fuelLevel.toString()}
            onValueChange={(val) => setFuelLevel(parseInt(val))}
            disabled={isLocked}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fuel level" />
            </SelectTrigger>
            <SelectContent>
              {FUEL_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value.toString()}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {fuelIsLower && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600">
                Fuel level is lower than at pickup. A fuel gauge photo is required in the Evidence step.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none"
            placeholder="Any notes about the return condition..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLocked}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isComplete && !isLocked && (
        <div className="space-y-2">
          {hasMetricsRecorded && existingMetrics?.odometer ? (
            <Button
              onClick={onComplete}
              disabled={saveMutation.isPending}
              className="w-full"
              size="lg"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Continue to Next Step
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSaveAndComplete}
                disabled={saveMutation.isPending || !canProceed}
                className="w-full"
                size="lg"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Continue to Next Step
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveOnly}
                disabled={saveMutation.isPending || !canProceed}
                className="w-full"
              >
                Save Progress Only
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
