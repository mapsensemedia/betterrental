/**
 * Public customer-facing walkaround acknowledgement page
 * Customer accesses via SMS/email link or QR code
 */
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
  PenLine,
  Car,
  Fuel,
  Gauge,
  Calendar,
  MapPin,
} from "lucide-react";
import { useWalkaroundInspection, useCustomerAcknowledge } from "@/hooks/use-walkaround";
import { useBookingById } from "@/hooks/use-bookings";
import { useBookingConditionPhotos, PHOTO_LABELS, type PhotoType } from "@/hooks/use-condition-photos";
import { SignedStorageImage } from "@/components/shared/SignedStorageImage";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function WalkaroundSign() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  
  const { data: booking, isLoading: loadingBooking } = useBookingById(bookingId || null);
  const { data: inspection, isLoading: loadingInspection } = useWalkaroundInspection(bookingId || null);
  const { data: photos, isLoading: loadingPhotos } = useBookingConditionPhotos(bookingId || "");
  const acknowledge = useCustomerAcknowledge();

  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  const isLoading = loadingBooking || loadingInspection || loadingPhotos;
  const pickupPhotos = photos?.pickup || [];

  const handleAcknowledge = () => {
    if (!inspection || !signature.trim() || !agreed) return;
    acknowledge.mutate({
      inspectionId: inspection.id,
      signature: signature.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground">
              This link may have expired or the booking does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Walkaround Not Started</h2>
            <p className="text-muted-foreground">
              The staff has not started the vehicle walkaround inspection yet.
              Please wait for them to begin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAcknowledged = inspection.customer_acknowledged;
  const vehicleName = booking.vehicles 
    ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
    : "Vehicle";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold">Vehicle Condition Review</h1>
          <p className="text-muted-foreground mt-1">
            Review and acknowledge the vehicle condition before pickup
          </p>
        </div>

        {/* Booking Info Card */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{vehicleName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Pickup</p>
                  <p className="font-medium">{format(new Date(booking.start_at), "PP")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Condition Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Condition Report</CardTitle>
              {isAcknowledged && (
                <Badge className="bg-emerald-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Acknowledged
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Readings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Gauge className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Odometer</p>
                <p className="font-semibold">
                  {inspection.odometer_reading?.toLocaleString() || "N/A"} mi
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Fuel className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Fuel Level</p>
                <p className="font-semibold">{inspection.fuel_level || "N/A"}%</p>
              </div>
            </div>

            <Separator />

            {/* Interior */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Interior Condition</p>
              <p className="font-medium capitalize">
                {inspection.interior_condition?.replace("_", " ") || "Not recorded"}
              </p>
            </div>

            {/* Existing Damage */}
            {inspection.scratches_dents.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Existing Damage Noted
                  </p>
                  <div className="space-y-2">
                    {inspection.scratches_dents.map((d) => (
                      <div
                        key={d.id}
                        className="text-sm bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-800"
                      >
                        <span className="font-medium">{d.location}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-2 text-xs",
                            d.severity === "major" && "border-red-500 text-red-600",
                            d.severity === "moderate" && "border-amber-500 text-amber-600",
                            d.severity === "minor" && "border-gray-400 text-gray-600"
                          )}
                        >
                          {d.severity}
                        </Badge>
                        <p className="text-muted-foreground mt-0.5">{d.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {inspection.exterior_notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Additional Notes</p>
                  <p className="text-sm">{inspection.exterior_notes}</p>
                </div>
              </>
            )}

            {/* Photos Toggle */}
            {pickupPhotos.length > 0 && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPhotos(!showPhotos)}
                >
                  {showPhotos ? "Hide" : "View"} Condition Photos ({pickupPhotos.length})
                </Button>
                
                {showPhotos && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {pickupPhotos.map((photo) => (
                      <div key={photo.id} className="space-y-1">
                        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <SignedStorageImage
                            bucket="condition-photos"
                            path={photo.photo_url}
                            alt={PHOTO_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          {PHOTO_LABELS[photo.photo_type as PhotoType] || photo.photo_type}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Acknowledgement Section */}
        <Card>
          <CardContent className="p-4">
            {isAcknowledged ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">
                      Condition Acknowledged
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Signed by {inspection.customer_signature} on{" "}
                      {format(new Date(inspection.customer_acknowledged_at!), "PPpp")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    By signing below, you confirm you have inspected the vehicle with staff
                    and agree this report accurately reflects any pre-existing damage.
                    You will be responsible for any new damage during your rental.
                  </AlertDescription>
                </Alert>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree-condition"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                  />
                  <Label htmlFor="agree-condition" className="text-sm leading-relaxed cursor-pointer">
                    I confirm the condition report is accurate and understand my responsibilities.
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signature">Your Full Name</Label>
                  <Input
                    id="signature"
                    placeholder="Type your full name to sign"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    disabled={acknowledge.isPending}
                    className="text-lg"
                  />
                </div>

                <Button
                  onClick={handleAcknowledge}
                  disabled={!agreed || !signature.trim() || acknowledge.isPending}
                  className="w-full gap-2"
                  size="lg"
                >
                  {acknowledge.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <PenLine className="h-4 w-4" />
                      Sign & Acknowledge
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Booking #{booking.booking_code}
        </p>
      </div>
    </div>
  );
}
