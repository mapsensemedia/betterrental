import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  Download,
  Eye,
  Ban,
  PenLine,
  FileDown,
} from "lucide-react";
import {
  useRentalAgreement,
  useGenerateAgreement,
  useConfirmAgreement,
  useVoidAgreement,
} from "@/hooks/use-rental-agreement";
import { useSaveSignature } from "@/hooks/use-signature-capture";
import { SignatureCapturePanel } from "./signature/SignatureCapturePanel";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface RentalAgreementPanelProps {
  bookingId: string;
  customerName?: string;
}

export function RentalAgreementPanel({ bookingId, customerName }: RentalAgreementPanelProps) {
  const { data: agreement, isLoading } = useRentalAgreement(bookingId);
  const generateAgreement = useGenerateAgreement();
  const confirmAgreement = useConfirmAgreement();
  const voidAgreement = useVoidAgreement();
  const saveSignature = useSaveSignature();

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [signerName, setSignerName] = useState(customerName || "");
  const [showSignatureCapture, setShowSignatureCapture] = useState(false);

  const handleGenerate = () => {
    generateAgreement.mutate(bookingId);
  };

  const handleConfirm = () => {
    if (!agreement) return;
    confirmAgreement.mutate(agreement.id, {
      onSuccess: () => setConfirmDialogOpen(false),
    });
  };

  const handleVoid = () => {
    if (!agreement) return;
    voidAgreement.mutate(agreement.id, {
      onSuccess: () => setVoidDialogOpen(false),
    });
  };

  const handleSignatureCapture = useCallback(
    async (signatureData: Parameters<typeof saveSignature.mutate>[0]["signatureData"]) => {
      if (!agreement) return;
      
      await saveSignature.mutateAsync({
        agreementId: agreement.id,
        bookingId,
        customerName: signerName || customerName || "Customer",
        signatureData,
      });
      
      setShowSignatureCapture(false);
    },
    [agreement, bookingId, signerName, customerName, saveSignature]
  );

  // Generate PDF from agreement content
  const handleDownloadPdf = () => {
    if (!agreement) return;
    
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      // Set up fonts
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPos = margin;

      // Helper to add new page if needed
      const checkPageBreak = (lineHeight: number = 10) => {
        if (yPos + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
        }
      };

      // Title - C2C Car Rental
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("C2C CAR RENTAL", pageWidth / 2, yPos, { align: "center" });
      yPos += 12;

      // Subtitle
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("VEHICLE LEGAL AGREEMENT", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Divider line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Parse and render the text content
      const lines = agreement.agreement_content.split('\n');
      
      for (const line of lines) {
        checkPageBreak(6);
        
        // Skip ASCII art decoration
        if (line.includes('▓') || line.includes('═══') || line.includes('───')) {
          yPos += 2;
          continue;
        }

        // Section headers (boxed sections)
        if (line.includes('┌') || line.includes('└') || line.includes('│')) {
          if (line.includes('│') && line.trim().length > 2) {
            const headerText = line.replace(/[┌┐└┘│─]/g, '').trim();
            if (headerText) {
              pdf.setFontSize(11);
              pdf.setFont("helvetica", "bold");
              pdf.text(headerText, pageWidth / 2, yPos, { align: "center" });
              yPos += 8;
            }
          }
          continue;
        }

        // Regular text
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          yPos += 3;
          continue;
        }

        // Check for labels (key: value pattern)
        if (trimmedLine.includes(':')) {
          const [label, ...valueParts] = trimmedLine.split(':');
          const value = valueParts.join(':').trim();
          
          if (label && value) {
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.text(label + ":", margin, yPos);
            pdf.setFont("helvetica", "normal");
            
            // Wrap value text if too long
            const labelWidth = pdf.getTextWidth(label + ": ");
            const valueLines = pdf.splitTextToSize(value, contentWidth - labelWidth - 5);
            pdf.text(valueLines, margin + labelWidth, yPos);
            yPos += Math.max(5, valueLines.length * 4);
            continue;
          }
        }

        // Checkbox items
        if (trimmedLine.startsWith('☐')) {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.rect(margin, yPos - 3, 3, 3);
          const checkboxText = trimmedLine.replace('☐', '').trim();
          const wrappedText = pdf.splitTextToSize(checkboxText, contentWidth - 8);
          pdf.text(wrappedText, margin + 5, yPos);
          yPos += Math.max(6, wrappedText.length * 4);
          continue;
        }

        // Numbered items or bullets
        if (/^[1-9]\./.test(trimmedLine) || trimmedLine.startsWith('•')) {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          const wrappedText = pdf.splitTextToSize(trimmedLine, contentWidth);
          pdf.text(wrappedText, margin, yPos);
          yPos += Math.max(5, wrappedText.length * 4);
          continue;
        }

        // Indented text
        if (line.startsWith('   ')) {
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          const wrappedText = pdf.splitTextToSize(trimmedLine, contentWidth - 10);
          pdf.text(wrappedText, margin + 8, yPos);
          yPos += Math.max(5, wrappedText.length * 4);
          continue;
        }

        // Default text
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        const wrappedText = pdf.splitTextToSize(trimmedLine, contentWidth);
        pdf.text(wrappedText, margin, yPos);
        yPos += Math.max(5, wrappedText.length * 4);
      }

      // Add signature info if signed
      if (agreement.customer_signature) {
        checkPageBreak(20);
        yPos += 5;
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("SIGNED BY: " + agreement.customer_signature, margin, yPos);
        yPos += 6;
        pdf.setFont("helvetica", "normal");
        pdf.text("Date: " + format(new Date(agreement.customer_signed_at!), "PPpp"), margin, yPos);
        yPos += 5;
        pdf.text("Status: " + agreement.status.toUpperCase(), margin, yPos);
      }

      // Save PDF
      pdf.save(`C2C-Rental-Agreement-${bookingId.slice(0, 8)}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Fallback text download
  const handleDownloadTxt = () => {
    if (!agreement) return;
    const content = agreement.customer_signature
      ? `${agreement.agreement_content}\n\n══════════════════════════════════════════════════════════════════\n\nSIGNED BY: ${agreement.customer_signature}\nDATE: ${format(new Date(agreement.customer_signed_at!), "PPpp")}${agreement.signed_manually ? "\nMETHOD: Manual / In-Person" : "\nMETHOD: Digital"}\nSTATUS: ${agreement.status.toUpperCase()}`
      : agreement.agreement_content;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rental-agreement-${bookingId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = () => {
    if (!agreement) return null;

    switch (agreement.status) {
      case "confirmed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            {agreement.signed_manually ? "Signed In Person" : "Confirmed"}
          </Badge>
        );
      case "signed":
        return (
          <Badge variant="secondary">
            <PenLine className="h-3 w-3 mr-1" />
            Signed - Needs Confirmation
          </Badge>
        );
      case "voided":
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Voided
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending Signature
          </Badge>
        );
    }
  };

  // Check if we have captured signature PNG
  const hasSignaturePng = !!(agreement as any)?.signature_png_url;
  const signatureMethod = (agreement as any)?.signature_method;
  const isAgreementSigned = agreement?.status === "signed" || agreement?.status === "confirmed";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rental Agreement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!agreement ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No agreement generated yet. Generate one for the customer to review and sign.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generateAgreement.isPending}
                className="w-full gap-2"
              >
                {generateAgreement.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate Agreement
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge()}
              </div>

              {/* Signature Info */}
              {agreement.customer_signature && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signed by</span>
                    <span className="font-medium">{agreement.customer_signature}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Signed at</span>
                    <span>{format(new Date(agreement.customer_signed_at!), "PPp")}</span>
                  </div>
                  {signatureMethod && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <Badge variant="outline" className="text-xs">
                        {signatureMethod === "webhid_pad"
                          ? "Signature Pad"
                          : signatureMethod === "onscreen_pen_touch"
                          ? "Apple Pencil / Touch"
                          : signatureMethod === "onscreen_mouse"
                          ? "On-Screen"
                          : "Digital"}
                      </Badge>
                    </div>
                  )}
                  {/* Show signature image if available */}
                  {hasSignaturePng && (
                    <div className="mt-2 pt-2 border-t">
                      <img
                        src={(agreement as any).signature_png_url}
                        alt="Customer signature"
                        className="max-h-16 w-auto bg-white rounded border p-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewDialogOpen(true)}
                  className="gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="gap-1"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadTxt}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  TXT
                </Button>

                {agreement.status === "signed" && (
                  <Button
                    size="sm"
                    onClick={() => setConfirmDialogOpen(true)}
                    className="gap-1"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Confirm Signature
                  </Button>
                )}

                {/* Capture Signature Button - only show if pending */}
                {agreement.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSignerName(customerName || "");
                      setShowSignatureCapture(true);
                    }}
                    className="gap-1"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Capture Signature
                  </Button>
                )}

                {agreement.status !== "voided" && agreement.status !== "confirmed" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setVoidDialogOpen(true)}
                    className="gap-1"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Void
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Agreement Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Rental Agreement</DialogTitle>
            <DialogDescription>
              Full agreement content {agreement?.customer_signature && `(Signed by ${agreement.customer_signature})`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] border rounded-lg p-4 bg-muted/30">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {agreement?.agreement_content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Signature Capture Dialog */}
      <Dialog open={showSignatureCapture} onOpenChange={setShowSignatureCapture}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Customer Signature</DialogTitle>
            <DialogDescription>
              Enter the customer's name and capture their signature using a pad or on-screen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">Customer Name (as it appears on ID)</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter customer's full name"
              />
            </div>
            
            {signerName.trim() && (
              <SignatureCapturePanel
                onCapture={handleSignatureCapture}
                existingSignature={
                  hasSignaturePng
                    ? {
                        pngUrl: (agreement as any).signature_png_url,
                        signedAt: agreement!.customer_signed_at!,
                        method: signatureMethod || "unknown",
                      }
                    : null
                }
                disabled={saveSignature.isPending}
              />
            )}
            
            {!signerName.trim() && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Enter the customer's name above to begin signature capture
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Signature</AlertDialogTitle>
            <AlertDialogDescription>
              This will confirm that the customer's signature "{agreement?.customer_signature}" is
              valid. This action finalizes the rental agreement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={confirmAgreement.isPending}>
              {confirmAgreement.isPending ? "Confirming..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void Dialog */}
      <AlertDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              This will void the current agreement. A new one will need to be generated if required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={voidAgreement.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidAgreement.isPending ? "Voiding..." : "Void Agreement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
