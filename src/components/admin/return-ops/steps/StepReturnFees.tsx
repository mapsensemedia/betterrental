import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
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
  // Fetch damage reports for this booking
  const { data: damages, isLoading: loadingDamages } = useQuery({
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

  const hasDamages = damages && damages.length > 0;
  const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={completion.reviewed 
        ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20" 
        : hasDamages 
          ? "border-destructive/50 bg-destructive/5"
          : "border-muted"
      }>
        <CardContent className="py-4">
          <div className={`flex items-center gap-2 ${
            completion.reviewed ? "text-emerald-600" : hasDamages ? "text-destructive" : "text-muted-foreground"
          }`}>
            {completion.reviewed ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Fees reviewed</span>
              </>
            ) : hasDamages ? (
              <>
                <ShieldAlert className="h-5 w-5" />
                <span className="font-medium">{damages.length} damage report{damages.length !== 1 ? "s" : ""} found</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">No additional fees or damages</span>
              </>
            )}
          </div>
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

      {/* Additional Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Additional Fees
          </CardTitle>
          <CardDescription>
            Any additional charges for this rental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-sm">No additional fees applied</p>
            <p className="text-xs mt-1">Late fees and other charges can be added through Billing</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Button */}
      {!completion.reviewed && (
        <Button
          onClick={onMarkReviewed}
          disabled={isMarking}
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
      )}
    </div>
  );
}
