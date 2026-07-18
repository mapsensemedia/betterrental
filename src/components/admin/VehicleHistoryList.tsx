import { format, parseISO } from "date-fns";
import { History, Car, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVehicleSwapHistory } from "@/hooks/use-vehicle-swap-history";

interface Props {
  bookingId: string;
}

const reasonLabels: Record<string, string> = {
  customer_request: "Customer request",
  breakdown: "Breakdown",
  upgrade: "Upgrade",
  accident: "Accident",
  other: "Other",
};

export function VehicleHistoryList({ bookingId }: Props) {
  const { data, isLoading } = useVehicleSwapHistory(bookingId);

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Vehicle History ({data.length} swap{data.length === 1 ? "" : "s"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((row) => (
          <div key={row.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {format(parseISO(row.swap_effective_at), "PPp")}
              </span>
              {row.reason && (
                <Badge variant="outline" className="text-xs">
                  {reasonLabels[row.reason] ?? row.reason}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-muted/30 p-2">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Car className="h-3 w-3" /> Previous
                </div>
                <p className="font-mono">
                  VIN {row.old_vin ?? "—"}
                </p>
                <p className="font-mono">
                  Plate {row.old_license_plate ?? "—"}
                </p>
                {row.old_end_mileage != null && (
                  <p className="text-muted-foreground mt-1">Ended at {row.old_end_mileage} km</p>
                )}
              </div>
              <div className="rounded bg-muted/30 p-2">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Car className="h-3 w-3" /> New
                </div>
                <p className="font-mono">VIN {row.new_vin ?? "—"}</p>
                <p className="font-mono">Plate {row.new_license_plate ?? "—"}</p>
                <p className="text-muted-foreground mt-1">Started at {row.new_start_mileage} km</p>
              </div>
            </div>
            {row.notes && <p className="text-xs text-muted-foreground italic">{row.notes}</p>}
            {(row.old_agreement_id || row.new_agreement_id) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                <FileText className="h-3 w-3" />
                {row.old_agreement_id && <span>Previous agreement voided</span>}
                {row.new_agreement_id && <span>· New agreement generated</span>}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
