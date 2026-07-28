/**
 * Dialog to show the walkaround acknowledgement QR code for in-person signing.
 * The walkaround link is never sent to customers by SMS or email.
 */
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface WalkaroundSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerName?: string;
}

export function WalkaroundSendDialog({
  open,
  onOpenChange,
  bookingId,
}: WalkaroundSendDialogProps) {
  const baseUrl = window.location.origin;
  const walkaroundUrl = `${baseUrl}/walkaround/${bookingId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(walkaroundUrl);
    toast.success("Link copied to clipboard");
  };

  const handleOpenLink = () => {
    window.open(walkaroundUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Walkaround Signature</DialogTitle>
          <DialogDescription>
            Have the customer scan this code in person to review and sign the vehicle condition report.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="p-4 bg-white rounded-xl">
            <QRCodeSVG value={walkaroundUrl} size={180} level="M" includeMargin={false} />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Customer scans this code with their phone camera
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenLink}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
