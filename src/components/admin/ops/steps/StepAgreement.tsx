import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RentalAgreementPanel } from "@/components/admin/RentalAgreementPanel";
import { CheckCircle2, XCircle, FileText } from "lucide-react";

interface StepAgreementProps {
  bookingId: string;
  customerName?: string;
  completion: {
    agreementSigned: boolean;
  };
}

export function StepAgreement({ bookingId, customerName, completion }: StepAgreementProps) {
  return (
    <div className="space-y-4">
      {/* Rental Agreement Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Rental Agreement</CardTitle>
            </div>
            <StatusIndicator complete={completion.agreementSigned} />
          </div>
          <CardDescription>
            Generate agreement and obtain customer signature (in person or digital)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RentalAgreementPanel bookingId={bookingId} customerName={customerName} />
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
        Signed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <XCircle className="w-3 h-3 mr-1" />
      Awaiting Signature
    </Badge>
  );
}
