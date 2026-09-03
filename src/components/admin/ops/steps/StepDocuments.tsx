/**
 * StepDocuments — "Additional Documents" handover step.
 *
 * Staff upload any extra paperwork the customer provided or the company requires
 * before the vehicle is released. At least one document is required before the
 * rental can be activated.
 */
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { BookingDocumentsCard } from "@/components/admin/BookingDocumentsCard";

interface StepDocumentsProps {
  bookingId: string;
  completion: { documentsUploaded: boolean };
}

export function StepDocuments({ bookingId, completion }: StepDocumentsProps) {
  return (
    <div className="space-y-4">
      {completion.documentsUploaded ? (
        <Alert className="border-emerald-500/40 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Documents are on file for this rental. You can add more at any time.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            At least one document must be uploaded before the rental can be activated.
          </AlertDescription>
        </Alert>
      )}

      <BookingDocumentsCard bookingId={bookingId} />
    </div>
  );
}
