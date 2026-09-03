/**
 * All additional documents on file for a customer, across their bookings.
 * Read-only: uploads and deletions happen from the booking that owns the file.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { useCustomerDocuments } from "@/hooks/use-booking-documents";
import { DocumentRow } from "./BookingDocumentsCard";

export function CustomerDocumentsSection({ customerUserId }: { customerUserId: string | null }) {
  const { data: documents, isLoading } = useCustomerDocuments(customerUserId || "");

  if (!customerUserId) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        Documents on file
      </p>
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : !documents?.length ? (
        <p className="text-sm text-muted-foreground">No documents uploaded for this customer yet.</p>
      ) : (
        <div>
          {documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              bookingCode={(doc as any).bookings?.booking_code ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
