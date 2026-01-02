import { useState } from "react";
import { Loader2, Mail, Phone, ArrowLeft, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OtpVerificationProps {
  bookingId: string;
  bookingCode: string;
  userEmail?: string;
  userPhone?: string;
  onVerified: () => void;
  onBack: () => void;
}

export function OtpVerification({
  bookingId,
  bookingCode,
  userEmail,
  userPhone,
  onVerified,
  onBack,
}: OtpVerificationProps) {
  const [channel, setChannel] = useState<"email" | "sms" | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const handleSendOtp = async (selectedChannel: "email" | "sms") => {
    setIsSending(true);
    setChannel(selectedChannel);

    try {
      const response = await supabase.functions.invoke("send-booking-otp", {
        body: { bookingId, channel: selectedChannel },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.error) {
        toast({ 
          title: "Failed to send code", 
          description: result.error, 
          variant: "destructive" 
        });
        return;
      }

      setOtpSent(true);
      setSentTo(result.sentTo || "");
      setExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null);
      toast({ 
        title: "Verification code sent", 
        description: `Check your ${selectedChannel === "email" ? "email" : "phone"} for the code` 
      });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast({ 
        title: "Error sending code", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: "Enter complete code", variant: "destructive" });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await supabase.functions.invoke("verify-booking-otp", {
        body: { bookingId, otp },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;

      if (result.error) {
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
        toast({ 
          title: "Invalid code", 
          description: result.error, 
          variant: "destructive" 
        });
        setOtp("");
        return;
      }

      toast({ title: "Booking verified!", description: "Your booking is now confirmed" });
      onVerified();
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      toast({ 
        title: "Verification failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    setOtpSent(false);
    setOtp("");
    setRemainingAttempts(5);
  };

  // Channel selection screen
  if (!otpSent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="heading-3 mb-2">Verify your booking</h2>
          <p className="text-muted-foreground">
            We'll send a verification code to confirm booking <span className="font-mono font-medium">{bookingCode}</span>
          </p>
        </div>

        <div className="space-y-4">
          {userEmail && (
            <button
              onClick={() => handleSendOtp("email")}
              disabled={isSending}
              className="w-full p-4 rounded-2xl border border-border hover:border-primary/50 transition-all flex items-center gap-4 text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Send to Email</p>
                <p className="text-sm text-muted-foreground">
                  {userEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
                </p>
              </div>
              {isSending && channel === "email" && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </button>
          )}

          {userPhone && (
            <button
              onClick={() => handleSendOtp("sms")}
              disabled={isSending}
              className="w-full p-4 rounded-2xl border border-border hover:border-primary/50 transition-all flex items-center gap-4 text-left disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Send to Phone</p>
                <p className="text-sm text-muted-foreground">
                  ***{userPhone.slice(-4)}
                </p>
              </div>
              {isSending && channel === "sms" && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </button>
          )}

          {!userEmail && !userPhone && (
            <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
              No email or phone number on file. Please update your profile.
            </div>
          )}
        </div>

        <Button variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  // OTP entry screen
  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-3 mb-2">Enter verification code</h2>
        <p className="text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium">{sentTo}</span>
        </p>
      </div>

      <div className="flex justify-center py-6">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {remainingAttempts < 5 && (
        <p className="text-center text-sm text-muted-foreground">
          {remainingAttempts} attempts remaining
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={handleVerifyOtp}
          disabled={isVerifying || otp.length !== 6}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Verify & Confirm Booking
            </>
          )}
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={handleResend}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Send New Code
          </Button>
          <Button variant="ghost" size="lg" onClick={onBack}>
            Cancel
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Code expires in 10 minutes. Didn't receive it? Check spam folder or try sending to a different method.
      </p>
    </div>
  );
}
