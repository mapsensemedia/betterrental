import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckInSection } from "@/components/admin/CheckInSection";
import { CheckCircle2, XCircle, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StepCheckinProps {
  booking: any;
  completion: {
    govIdVerified: boolean;
    licenseOnFile: boolean;
    nameMatches: boolean;
    licenseNotExpired: boolean;
    ageVerified: boolean;
  };
}

export function StepCheckin({ booking, completion }: StepCheckinProps) {
  // Fetch profile-level license status
  const { data: profile } = useQuery({
    queryKey: ["profile-license", booking.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("driver_license_status, driver_license_expiry")
        .eq("id", booking.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!booking.user_id,
  });
  
  const licenseOnFile = profile?.driver_license_status === "on_file";
  const licenseExpiry = profile?.driver_license_expiry;
  
  const isComplete = 
    completion.govIdVerified &&
    completion.licenseOnFile &&
    completion.nameMatches &&
    completion.licenseNotExpired &&
    completion.ageVerified;
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Customer Check-In</CardTitle>
            </div>
            <StatusIndicator complete={isComplete} />
          </div>
          <CardDescription>
            Verify Government ID, driver's license on file, name, expiry, and age (21+)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckInSection
            bookingId={booking.id}
            bookingStartAt={booking.start_at}
            customerName={booking.profiles?.full_name || null}
            licenseOnFile={licenseOnFile}
            licenseExpiryFromProfile={licenseExpiry}
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
