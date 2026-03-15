import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RentalAgreementPanel } from "@/components/admin/RentalAgreementPanel";
import { useRentalAgreement } from "@/hooks/use-rental-agreement";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, Loader2, Send } from "lucide-react";

interface StepAgreementProps {
  bookingId: string;
  customerName?: string;
  completion: {
    agreementSigned: boolean;
  };
}

export function StepAgreement({ bookingId, customerName, completion }: StepAgreementProps) {
  const { data: agreement } = useRentalAgreement(bookingId);
  const [isSending, setIsSending] = useState(false);

  const handleResend = async () => {
    setIsSending(true);
    try {
      await supabase.functions.invoke("send-booking-notification", {
        body: { bookingId, stage: "agreement_generated" },
      });
      toast.success("Signing link resent to customer");
    } catch (e) {
      console.error("Failed to resend signing link:", e);
      toast.error("Failed to resend signing link");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Rental Agreement</CardTitle>
            </div>
            {completion.agreementSigned ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Signed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-warning">
                <XCircle className="w-3 h-3 mr-1" />
                Awaiting Signature
              </Badge>
            )}
          </div>
          <CardDescription>
            {completion.agreementSigned
              ? "Agreement confirmed — ready to proceed to Handover Photos"
              : "Generate the agreement below, then have the customer sign in person or digitally"}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Agreement Panel */}
      <RentalAgreementPanel bookingId={bookingId} customerName={customerName} />

      {/* Resend signing link */}
      {agreement && agreement.status === "pending" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isSending}
          className="text-muted-foreground"
        >
          {isSending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Send className="w-3 h-3 mr-1" />
          )}
          Resend signing link →
        </Button>
      )}
    </div>
  );
}
