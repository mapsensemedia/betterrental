import { useState, useEffect } from "react";
import { Loader2, Phone, Check, RefreshCw } from "lucide-react";
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
  userPhone: string;
  onVerified: () => void;
  onBack: () => void;
}

export function OtpVerification({
  bookingId,
  bookingCode,
  userPhone,
  onVerified,
  onBack,
}: OtpVerificationProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  // Auto-send OTP on mount
  useEffect(() => {
    if (!otpSent && userPhone) {
      handleSendOtp();
    }
  }, []);

  const handleSendOtp = async () => {
    if (!userPhone) {
      toast({ 
        title: "Phone number required", 
        description: "Please provide a phone number in the details step", 
        variant: "destructive" 
      });
      onBack();
      return;
    }

    setIsSending(true);

    try {
      const response = await supabase.functions.invoke("send-booking-otp", {
        body: { bookingId, channel: "sms" },
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
      setSentTo(result.sentTo || `***${userPhone.slice(-4)}`);
      toast({ 
        title: "Verification code sent", 
        description: "Check your phone for the SMS code" 
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
    setOtp("");
    setRemainingAttempts(5);
    handleSendOtp();
  };

  // Sending screen
  if (!otpSent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="heading-3 mb-2">Verify your booking</h2>
          <p className="text-muted-foreground">
            Sending verification code to <span className="font-medium">***{userPhone.slice(-4)}</span>
          </p>
        </div>

        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            {isSending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending SMS...</span>
              </div>
            )}
          </div>
        </div>

        <Button variant="outline" size="lg" onClick={onBack} className="w-full">
          Cancel
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
          <Button variant="outline" size="lg" className="flex-1" onClick={handleResend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Resend Code
          </Button>
          <Button variant="ghost" size="lg" onClick={onBack}>
            Cancel
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Code expires in 10 minutes. Didn't receive it? Check your phone and try resending.
      </p>
    </div>
  );
}
