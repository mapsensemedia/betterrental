import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateVerificationStatus } from "@/hooks/use-verification";
import { useSignedStorageUrl } from "@/hooks/use-signed-storage-url";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
} from "lucide-react";

interface LicenseReviewCardProps {
  verification: any;
}

export function LicenseReviewCard({ verification }: LicenseReviewCardProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notes, setNotes] = useState(verification.reviewer_notes || "");
  const updateVerification = useUpdateVerificationStatus();

  const { data: signedUrl } = useSignedStorageUrl({
    bucket: "verification-documents",
    path: verification?.document_url ?? null,
    expiresIn: 60 * 30,
  });

  const imageSrc = signedUrl || "/placeholder.svg";

  const getDocLabel = (type: string) => {
    if (type === "drivers_license_front") return "Front";
    if (type === "drivers_license_back") return "Back";
    return type;
  };

  const handleUpdateStatus = (status: "verified" | "rejected") => {
    updateVerification.mutate(
      {
        requestId: verification.id,
        status,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setReviewOpen(false);
        },
      }
    );
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Thumbnail */}
            <div
              className="w-16 h-12 rounded bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => setReviewOpen(true)}
            >
              <img
                src={imageSrc}
                alt="Driver's license thumbnail"
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  Driver's License ({getDocLabel(verification.document_type)})
                </span>
                <StatusBadge status={verification.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploaded {format(new Date(verification.created_at), "PP")}
              </p>
            </div>
            
            {/* Actions */}
            <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
              <Eye className="w-4 h-4 mr-1" />
              Review
            </Button>
          </div>
          
          {verification.reviewer_notes && (
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <span className="text-muted-foreground">Notes: </span>
              {verification.reviewer_notes}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Driver's License</DialogTitle>
            <DialogDescription>
              Verify the document is valid and matches customer information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Document Image */}
            <div className="border rounded-lg overflow-hidden">
              <img
                src={imageSrc}
                alt="Driver's license document"
                loading="lazy"
                className="w-full max-h-[300px] object-contain bg-muted"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>

            {/* Download Link */}
            {signedUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Open Full Size
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Download className="w-4 h-4 mr-2" />
                Open Full Size
              </Button>
            )}
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Review Notes (optional)</Label>
              <Textarea
                placeholder="Add notes about this verification..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleUpdateStatus('rejected')}
              disabled={updateVerification.isPending}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button 
              onClick={() => handleUpdateStatus('verified')}
              disabled={updateVerification.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}
