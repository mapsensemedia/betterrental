import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Car, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  categoryId: string;
  locationId: string;
}

interface UnitOption {
  id: string;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  current_mileage: number | null;
  status: string;
  vehicles: { make: string | null; model: string | null; year: number | null } | null;
}

/**
 * Renders only when an active booking has no assigned_unit_id.
 * Lets staff pick a matching vehicle unit and attach it; auto-regenerates
 * the rental agreement so the VIN/plate appear in the customer's PDF.
 */
export function ActiveRentalUnitAssignCard({ bookingId, categoryId, locationId }: Props) {
  const queryClient = useQueryClient();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const { data: units, isLoading } = useQuery({
    queryKey: ["assignable-units", categoryId, locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_units")
        .select("id, vin, license_plate, color, current_mileage, status, vehicles(make, model, year)")
        .eq("category_id", categoryId)
        .eq("location_id", locationId)
        .in("status", ["available", "on_rent"])
        .order("vin", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as UnitOption[];
    },
    enabled: !!categoryId && !!locationId,
  });

  const assign = useMutation({
    mutationFn: async (unitId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "assign-unit-to-active-booking",
        { body: { bookingId, unitId } },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Vehicle attached${data?.vin ? ` (VIN ${data.vin})` : ""}`,
      );
      if (data?.agreementRegenerated) {
        toast.success("Rental agreement regenerated");
      } else {
        toast.message("Agreement will regenerate on next view");
      }
      queryClient.invalidateQueries({ queryKey: ["active-rental-detail", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["rental-agreement", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-units"] });
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["assignable-units", categoryId, locationId] });
      queryClient.invalidateQueries({ queryKey: ["booking-activity-timeline", bookingId] });
      setSelectedUnitId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to attach vehicle");
    },
  });

  return (
    <Card className="border-warning/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-5 w-5 text-warning" />
          No Vehicle Attached
        </CardTitle>
        <CardDescription>
          This active rental has no specific VIN assigned. Pick a unit so the rental
          agreement shows the correct vehicle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading units…
          </div>
        )}

        {!isLoading && (!units || units.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No units in this category at the pickup location.
          </p>
        )}

        {units && units.length > 0 && (
          <div className="space-y-2">
            {units.map((u) => {
              const label = [u.vehicles?.year, u.vehicles?.make, u.vehicles?.model]
                .filter(Boolean)
                .join(" ");
              const selected = selectedUnitId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUnitId(u.id)}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <Car className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{label || "Vehicle"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          VIN {u.vin ?? "—"} · Plate {u.license_plate ?? "—"}
                          {u.color ? ` · ${u.color}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <Badge
                        variant={u.status === "available" ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {u.status}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            disabled={!selectedUnitId || assign.isPending}
            onClick={() => selectedUnitId && assign.mutate(selectedUnitId)}
          >
            {assign.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Attaching…
              </>
            ) : (
              "Attach vehicle & regenerate agreement"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
