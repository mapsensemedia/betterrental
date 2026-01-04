import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckInSection } from "@/components/admin/CheckInSection";
import { CheckCircle2, XCircle, UserCheck } from "lucide-react";

interface StepCheckinProps {
  booking: any;
  completion: {
    identityVerified: boolean;
    timingConfirmed: boolean;
  };
  verifications?: any[];
}

export function StepCheckin({ booking, completion, verifications = [] }: StepCheckinProps) {
  const licenseVerifications = verifications.filter(
    (v: any) =>
      v.document_type === "drivers_license_front" ||
      v.document_type === "drivers_license_back"
  );
  
  const hasLicenseUploaded = licenseVerifications.length > 0;
  
  const licenseVerified = licenseVerifications.length >= 2 && 
    licenseVerifications.every((v: any) => v.status === "verified");
  
  return (
    <div className="space-y-4">
      {/* Check-In Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Customer Check-In</CardTitle>
            </div>
            <StatusIndicator complete={completion.identityVerified} />
          </div>
          <CardDescription>
            Verify customer identity and confirm arrival time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckInSection
            bookingId={booking.id}
            bookingStartAt={booking.start_at}
            customerName={booking.profiles?.full_name || null}
            hasLicenseUploaded={hasLicenseUploaded}
            licenseVerified={licenseVerified}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
}
