import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";

interface StepReturnIntakeProps {
  bookingId: string;
  completion: {
    timeRecorded: boolean;
    odometerRecorded: boolean;
    fuelRecorded: boolean;
  };
}

export function StepReturnIntake({ bookingId, completion }: StepReturnIntakeProps) {
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
      
      const metricsData = {
        booking_id: bookingId,
        phase: "return",
        odometer: odometer ? parseInt(odometer) : null,
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-inspection-metrics", bookingId] });
      toast.success("Return intake saved");
    },
    onError: (error) => {
      toast.error("Failed to save intake");
      console.error(error);
    },
  });

  const isComplete = completion.odometerRecorded && completion.fuelRecorded;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      {isComplete && (
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
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !odometer}
        className="w-full"
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Return Intake
          </>
        )}
      </Button>
    </div>
  );
}
