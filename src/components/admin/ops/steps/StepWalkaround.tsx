import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WalkaroundInspection } from "@/components/admin/WalkaroundInspection";
import { WalkaroundSendDialog } from "@/components/admin/ops/WalkaroundSendDialog";
import { CheckCircle2, XCircle, Eye, Send } from "lucide-react";
import { useBookingById } from "@/hooks/use-bookings";

interface StepWalkaroundProps {
  bookingId: string;
  completion: {
    inspectionComplete: boolean;
    customerAcknowledged: boolean;
  };
}

export function StepWalkaround({ bookingId, completion }: StepWalkaroundProps) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const { data: booking } = useBookingById(bookingId);
  
  return (
    <div className="space-y-4">
      {/* Send to Customer Card */}
      {!completion.customerAcknowledged && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Get Customer Signature</p>
                <p className="text-sm text-muted-foreground">
                  Send the walkaround link via SMS, email, or show QR code
                </p>
              </div>
              <Button onClick={() => setShowSendDialog(true)} className="gap-2 shrink-0">
                <Send className="h-4 w-4" />
                Send to Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
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
      
      {/* Send Dialog */}
      <WalkaroundSendDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        bookingId={bookingId}
        customerPhone={booking?.profiles?.phone}
        customerEmail={booking?.profiles?.email}
        customerName={booking?.profiles?.full_name}
      />
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
