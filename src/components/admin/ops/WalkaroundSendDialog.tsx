/**
 * Dialog to send walkaround acknowledgement link to customer
 * Options: SMS, Email, or show QR code for in-person
 */
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare,
  Mail,
  QrCode,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  customerPhone,
  customerEmail,
  customerName,
}: WalkaroundSendDialogProps) {
  const [activeTab, setActiveTab] = useState<"qr" | "sms" | "email">("qr");
  const [phone, setPhone] = useState(customerPhone || "");
  const [email, setEmail] = useState(customerEmail || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // Generate the walkaround URL
  const baseUrl = window.location.origin;
  const walkaroundUrl = `${baseUrl}/walkaround/${bookingId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(walkaroundUrl);
    toast.success("Link copied to clipboard");
  };

  const handleOpenLink = () => {
    window.open(walkaroundUrl, "_blank");
  };

  const handleSendSms = async () => {
    if (!phone.trim()) {
      toast.error("Enter a phone number");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-booking-sms", {
        body: {
          phone: phone.trim(),
          message: `Hi ${customerName || "there"}, please review and sign your vehicle walkaround: ${walkaroundUrl}`,
          type: "walkaround_link",
        },
      });

      if (error) throw error;
      setSent("sms");
      toast.success("SMS sent successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-booking-email", {
        body: {
          email: email.trim(),
          subject: "Please Sign Your Vehicle Walkaround",
          template: "walkaround_link",
          data: {
            customerName: customerName || "Customer",
            walkaroundUrl,
            bookingId,
          },
        },
      });

      if (error) throw error;
      setSent("email");
      toast.success("Email sent successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Walkaround to Customer</DialogTitle>
          <DialogDescription>
            Get customer signature for the vehicle condition review
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qr" className="gap-1">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="mt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white rounded-xl">
                <QRCodeSVG
                  value={walkaroundUrl}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
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
          </TabsContent>

          <TabsContent value="sms" className="mt-4 space-y-4">
            {sent === "sms" ? (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  SMS sent to {phone}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSendSms}
                  disabled={!phone.trim() || sending}
                  className="w-full gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send SMS Link
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="email" className="mt-4 space-y-4">
            {sent === "email" ? (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  Email sent to {email}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSendEmail}
                  disabled={!email.trim() || sending}
                  className="w-full gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Email Link
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
