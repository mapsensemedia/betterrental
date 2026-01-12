import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DamageReportDialog } from "@/components/admin/DamageReportDialog";
import { 
  DollarSign, 
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Plus,
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
  const { data: vehicle } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("make, model, year")
        .eq("id", vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // Fetch booking for code
  const { data: booking } = useQuery({
    queryKey: ["booking-code", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_code")
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
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

  const hasDamages = damages && damages.length > 0;
  const totalDamageCost = damages?.reduce((sum, d) => sum + (d.estimated_cost || 0), 0) || 0;

  const vehicleName = vehicle 
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` 
    : "Vehicle";

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
