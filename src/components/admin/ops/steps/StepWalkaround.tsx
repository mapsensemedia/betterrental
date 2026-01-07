import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalkaroundInspection } from "@/components/admin/WalkaroundInspection";
import { CheckCircle2, XCircle, Eye } from "lucide-react";

interface StepWalkaroundProps {
  bookingId: string;
  completion: {
    inspectionComplete: boolean;
    customerAcknowledged: boolean;
  };
}

export function StepWalkaround({ bookingId, completion }: StepWalkaroundProps) {
  return (
    <div className="space-y-4">
      {/* Walkaround Inspection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Vehicle Walkaround</CardTitle>
            </div>
            <StatusIndicator 
              inspectionComplete={completion.inspectionComplete}
              customerAcknowledged={completion.customerAcknowledged}
            />
          </div>
          <CardDescription>
            Joint inspection with customer and acknowledgement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalkaroundInspection bookingId={bookingId} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIndicator({ 
  inspectionComplete, 
  customerAcknowledged 
}: { 
  inspectionComplete: boolean; 
  customerAcknowledged: boolean;
}) {
  // Inspection complete is the primary requirement
  if (inspectionComplete) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Complete{customerAcknowledged ? " & Acknowledged" : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      Not Started
    </Badge>
  );
}
