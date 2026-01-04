import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VehicleAssignment } from "@/components/admin/VehicleAssignment";
import { LicenseReviewCard } from "../LicenseReviewCard";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  Car,
  CreditCard as IdCard,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIntakeProps {
  booking: any;
  completion: {
    vehicleAssigned: boolean;
    licenseUploaded: boolean;
    licenseApproved: boolean;
  };
  verifications: any[];
}

export function StepIntake({ booking, completion, verifications }: StepIntakeProps) {
  const licenseVerifications = verifications.filter(v => 
    v.document_type === 'drivers_license_front' || v.document_type === 'drivers_license_back'
  );
  
  return (
    <div className="space-y-4">
      {/* Booking Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Booking Details</CardTitle>
          <CardDescription>Review booking information before proceeding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Customer</span>
              <p className="font-medium">{booking.profiles?.full_name || "Unknown"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium truncate">{booking.profiles?.email || "N/A"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="font-medium">{booking.profiles?.phone || "N/A"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">{booking.total_days} days</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Vehicle Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vehicle Assignment</CardTitle>
            </div>
            <StatusIndicator complete={completion.vehicleAssigned} />
          </div>
        </CardHeader>
        <CardContent>
          <VehicleAssignment
            bookingId={booking.id}
            currentVehicleId={booking.vehicle_id}
            currentVehicle={booking.vehicles}
            locationId={booking.location_id}
            startAt={booking.start_at}
            endAt={booking.end_at}
          />
        </CardContent>
      </Card>
      
      {/* Driver's License Review */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IdCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Driver's License</CardTitle>
            </div>
            <StatusIndicator 
              complete={completion.licenseApproved} 
              pending={completion.licenseUploaded && !completion.licenseApproved}
            />
          </div>
          <CardDescription>
            Customer must upload a valid driver's license for approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {licenseVerifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="font-medium">No license uploaded</p>
              <p className="text-sm">Customer needs to upload their driver's license</p>
            </div>
          ) : (
            <div className="space-y-3">
              {licenseVerifications.map((verification) => (
                <LicenseReviewCard key={verification.id} verification={verification} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({ complete, pending }: { complete: boolean; pending?: boolean }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete
      </Badge>
    );
  }
  if (pending) {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
        <Clock className="w-3 h-3 mr-1" />
        Pending Review
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      Incomplete
    </Badge>
  );
}
