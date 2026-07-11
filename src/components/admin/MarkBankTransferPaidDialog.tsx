/**
 * MarkBankTransferPaidDialog
 *
 * Two-step dialog for ops/admin to mark a booking as paid via bank transfer.
 * Requires an OTP sent to the admin phone before applying the flag.
 * Does NOT create a payments row — these bookings are excluded from
 * Worldline revenue totals by design.
 */
import { useState } from "react";
import { Loader2, Landmark, ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  bookingId: string;
  amount: number;
  disabled?: boolean;
  onCompleted?: () => void;
  trigger?: React.ReactNode;
}

export function MarkBankTransferPaidDialog({
  bookingId,
  amount,
  disabled,
  onCompleted,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "sent">("idle");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [reference, setReference] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("idle");
    setCode("");
    setReference("");
    setSentTo(null);
    setError(null);
    setSending(false);
    setConfirming(false);
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) reset();
  };

  const sendOtp = async () => {
    setSending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "send-bank-transfer-otp",
        { body: { bookingId } },
      );
      if (fnErr) throw new Error(fnErr.message || "Failed to send OTP");
      if (data?.error) throw new Error(data.error);
      setSentTo(data?.sentTo || "admin");
      setStep("sent");
      toast.success("OTP sent to admin phone");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the SMS");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "confirm-bank-transfer-paid",
        { body: { bookingId, code, reference: reference.trim() || undefined } },
      );
      if (fnErr) throw new Error(fnErr.message || "Failed to confirm");
      if (data?.error) {
        const remaining = data?.remainingAttempts;
        throw new Error(
          remaining !== undefined
            ? `${data.error} — ${remaining} attempts left`
            : data.error,
        );
      }
      toast.success("Booking marked as paid (bank transfer)");
      onCompleted?.();
      handleOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to confirm");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" disabled={disabled}>
            <Landmark className="h-4 w-4 mr-2" />
            Mark as Paid (Bank Transfer)
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as Paid — Bank Transfer</DialogTitle>
          <DialogDescription>
            Marks this booking as paid by direct bank transfer for ${amount.toFixed(2)}.
            An OTP will be sent to the admin phone for verification. This does not
            create a Worldline payment record.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {step === "idle" && (
          <div className="text-sm text-muted-foreground">
            Click "Send OTP" to text a 6-digit code to the admin phone.
          </div>
        )}

        {step === "sent" && (
          <div className="space-y-3">
            <Alert>
              <AlertDescription className="text-sm">
                Code sent to <span className="font-mono">{sentTo}</span>. Expires in 10 min.
              </AlertDescription>
            </Alert>
            <div className="space-y-1.5">
              <Label htmlFor="otp-code">6-digit code</Label>
              <Input
                id="otp-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="font-mono text-lg tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-note">Reference / note (optional)</Label>
              <Textarea
                id="ref-note"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. e-Transfer ref #ABC123, sender name…"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sending || confirming}>
            Cancel
          </Button>
          {step === "idle" ? (
            <Button onClick={sendOtp} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send OTP
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={sendOtp} disabled={sending || confirming}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Resend
              </Button>
              <Button onClick={confirm} disabled={confirming || code.length !== 6}>
                {confirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Confirm Paid
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
