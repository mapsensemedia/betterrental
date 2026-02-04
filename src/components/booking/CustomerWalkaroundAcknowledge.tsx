import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  PenLine,
  Eye,
} from "lucide-react";
import { useWalkaroundInspection, useCustomerAcknowledge } from "@/hooks/use-walkaround";
import { format } from "date-fns";

interface CustomerWalkaroundAcknowledgeProps {
  bookingId: string;
}

export function CustomerWalkaroundAcknowledge({ bookingId }: CustomerWalkaroundAcknowledgeProps) {
  const { data: inspection, isLoading } = useWalkaroundInspection(bookingId);
  const acknowledge = useCustomerAcknowledge();

  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleAcknowledge = () => {
    if (!inspection || !signature.trim() || !agreed) return;
    acknowledge.mutate({
      inspectionId: inspection.id,
      signature: signature.trim(),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!inspection) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Vehicle walkaround will be conducted by staff at pickup.</p>
        </CardContent>
      </Card>
    );
  }

  const isAcknowledged = inspection.customer_acknowledged;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Vehicle Condition</CardTitle>
              <CardDescription>
                {isAcknowledged
                  ? `Acknowledged on ${format(new Date(inspection.customer_acknowledged_at!), "PPp")}`
                  : "Review and acknowledge vehicle condition"}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={isAcknowledged ? "default" : "outline"}
          >
            {isAcknowledged ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Acknowledged
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pending
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Condition Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Odometer</span>
              <p className="font-medium">{inspection.odometer_reading?.toLocaleString() || "N/A"} km</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fuel Level</span>
              <p className="font-medium">{inspection.fuel_level || "N/A"}%</p>
            </div>
          </div>

          <Separator />

          <div>
            <span className="text-sm text-muted-foreground">Interior Condition</span>
            <p className="font-medium capitalize">
              {inspection.interior_condition?.replace("_", " ") || "Not recorded"}
            </p>
          </div>

          {inspection.scratches_dents.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Existing Damage Noted</span>
                <ul className="mt-1 space-y-1">
                  {inspection.scratches_dents.map((d) => (
                    <li key={d.id} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>
                        <span className="font-medium">{d.location}</span>: {d.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {inspection.exterior_notes && (
            <>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Exterior Notes</span>
                <p className="text-sm">{inspection.exterior_notes}</p>
              </div>
            </>
          )}
        </div>

        {/* Acknowledgement Section */}
        {isAcknowledged ? (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Signed by: {inspection.customer_signature}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(inspection.customer_acknowledged_at!), "PPpp")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree-condition"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                />
                <Label htmlFor="agree-condition" className="text-sm leading-relaxed cursor-pointer">
                  I have inspected the vehicle with staff and confirm that the condition report above
                  accurately reflects any pre-existing damage. I understand that I am responsible for
                  any new damage during the rental period.
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Your Full Name (as acknowledgement)</Label>
                <Input
                  id="signature"
                  placeholder="Type your full name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  disabled={acknowledge.isPending}
                />
              </div>

              <Button
                onClick={handleAcknowledge}
                disabled={!agreed || !signature.trim() || acknowledge.isPending}
                className="w-full gap-2"
              >
                {acknowledge.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <PenLine className="h-4 w-4" />
                    Acknowledge Condition
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
