import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import { format } from "date-fns";

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

export function StepReturnIntake({ bookingId, completion, onComplete, isLocked, isComplete }: StepReturnIntakeProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState([50]);
  const [notes, setNotes] = useState("");

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
      if (existingMetrics.fuel_level) setFuelLevel([existingMetrics.fuel_level]);
      if (existingMetrics.exterior_notes) setNotes(existingMetrics.exterior_notes);
    }
  }, [existingMetrics]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!odometer) throw new Error("Odometer reading is required");
      
      const metricsData = {
        booking_id: bookingId,
        phase: "return",
        odometer: parseInt(odometer),
        fuel_level: fuelLevel[0],
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
          .update({ current_mileage: parseInt(odometer) })
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
      toast.error(error.message || "Failed to save intake");
      console.error(error);
    },
  });

  const handleSaveAndComplete = async () => {
    try {
      // Save metrics first
      await saveMutation.mutateAsync();
      
      // Now complete the step - metrics are guaranteed to be saved
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      // Error already handled in mutation
    }
  };
  
  // Allow saving without completing step
  const handleSaveOnly = async () => {
    try {
      await saveMutation.mutateAsync();
      toast.success("Return intake saved" + (booking?.assigned_unit_id && odometer ? " (mileage updated)" : ""));
    } catch (error) {
      // Error already handled in mutation
    }
  };

  // Use isComplete (from state machine) as primary, fall back to completion tracking
  const stepIsComplete = isComplete;
  const hasMetricsRecorded = completion.odometerRecorded && completion.fuelRecorded;

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Odometer Reading
          </CardTitle>
          <CardDescription>
            Enter the current odometer reading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Enter mileage"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                disabled={isLocked}
              />
            </div>
            <span className="text-muted-foreground">miles</span>
          </div>
        </CardContent>
      </Card>

      {/* Fuel Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Fuel Level
          </CardTitle>
          <CardDescription>
            Set the approximate fuel level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Empty</span>
            <span className="font-medium">{fuelLevel[0]}%</span>
            <span>Full</span>
          </div>
          <Slider
            value={fuelLevel}
            onValueChange={setFuelLevel}
            max={100}
            step={5}
            className="w-full"
            disabled={isLocked}
          />
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
          {/* If metrics already recorded, show just continue button */}
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
                disabled={saveMutation.isPending || !odometer}
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
              
              {/* Save only button - for partial saves */}
              <Button
                variant="outline"
                onClick={handleSaveOnly}
                disabled={saveMutation.isPending || !odometer}
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
