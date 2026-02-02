/**
 * SignatureCapturePanel - Complete signature capture UI with method selection
 * Supports WebHID pads, iPad/touch signing, and fallback
 */
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Usb,
  Tablet,
  MousePointer2,
  Check,
  AlertCircle,
  Loader2,
  WifiOff,
  PenLine,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { SignatureCanvas, type SignatureStroke } from "./SignatureCanvas";
import { useWebHIDSignature } from "@/hooks/use-webhid-signature";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SignatureMethod = "webhid_pad" | "onscreen";

interface SignatureCaptureData {
  pngDataUrl: string;
  vectorJson: SignatureStroke[];
  method: SignatureMethod | "onscreen_pen_touch" | "onscreen_mouse";
  deviceInfo: {
    userAgent: string;
    platform: string;
    deviceName?: string;
  };
  workstationId: string;
  capturedAt: string;
}

interface SignatureCapturePanelProps {
  onCapture: (data: SignatureCaptureData) => Promise<void>;
  existingSignature?: {
    pngUrl: string;
    signedAt: string;
    method: string;
  } | null;
  disabled?: boolean;
  isAdmin?: boolean;
}

// Get or create a persistent workstation ID
function getWorkstationId(): string {
  const key = "signature_workstation_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function SignatureCapturePanel({
  onCapture,
  existingSignature,
  disabled = false,
  isAdmin = true,
}: SignatureCapturePanelProps) {
  const [method, setMethod] = useState<SignatureMethod>("onscreen");
  const [showCanvas, setShowCanvas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecaptureConfirm, setShowRecaptureConfirm] = useState(false);
  const [capturedPointerType, setCapturedPointerType] = useState<string | null>(null);

  const webhid = useWebHIDSignature();

  // Auto-detect best method
  useEffect(() => {
    if (webhid.isSupported && !webhid.isConnected) {
      // On desktop with WebHID support, suggest external pad
      const isDesktop = !(/iPad|iPhone|Android/i.test(navigator.userAgent));
      if (isDesktop) {
        setMethod("webhid_pad");
      }
    }
  }, [webhid.isSupported, webhid.isConnected]);

  // Handle WebHID connection
  const handleConnectPad = useCallback(async () => {
    const success = await webhid.connect();
    if (success) {
      setShowCanvas(true);
    }
  }, [webhid]);

  // Handle start on-screen signing
  const handleStartOnScreen = useCallback(() => {
    setShowCanvas(true);
  }, []);

  // Handle signature save from canvas
  const handleCanvasSave = useCallback(
    async (pngDataUrl: string, strokes: SignatureStroke[]) => {
      setIsSaving(true);

      try {
        // Determine actual method used
        let actualMethod: SignatureCaptureData["method"] = method;
        if (method === "onscreen") {
          // Check if any stroke used pen input
          const usedPen = strokes.some((s) =>
            s.points.some((p) => p.pointerType === "pen")
          );
          actualMethod = usedPen ? "onscreen_pen_touch" : "onscreen_mouse";
        }

        const data: SignatureCaptureData = {
          pngDataUrl,
          vectorJson: strokes,
          method: actualMethod,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            deviceName: webhid.deviceName || undefined,
          },
          workstationId: getWorkstationId(),
          capturedAt: new Date().toISOString(),
        };

        await onCapture(data);
        setShowCanvas(false);
      } catch (error) {
        console.error("Failed to save signature:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [method, webhid.deviceName, onCapture]
  );

  // Handle recapture request
  const handleRecaptureRequest = useCallback(() => {
    if (isAdmin) {
      setShowRecaptureConfirm(true);
    }
  }, [isAdmin]);

  const handleConfirmRecapture = useCallback(() => {
    setShowRecaptureConfirm(false);
    setShowCanvas(true);
  }, []);

  // Render existing signature preview
  if (existingSignature && !showCanvas) {
    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base">Signature Captured</CardTitle>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Signed
              </Badge>
            </div>
            <CardDescription>
              Captured on {format(new Date(existingSignature.signedAt), "PPp")} via{" "}
              {existingSignature.method === "webhid_pad"
                ? "Signature Pad"
                : existingSignature.method === "onscreen_pen_touch"
                ? "Apple Pencil / Touch"
                : "On-Screen"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signature preview */}
            <div className="border rounded-lg p-2 bg-white">
              <img
                src={existingSignature.pngUrl}
                alt="Captured signature"
                className="w-full h-auto max-h-32 object-contain"
              />
            </div>

            {/* Recapture button (admin only) */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecaptureRequest}
                className="gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-capture Signature
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recapture confirmation */}
        <AlertDialog open={showRecaptureConfirm} onOpenChange={setShowRecaptureConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Re-capture Signature?</AlertDialogTitle>
              <AlertDialogDescription>
                This will replace the existing signature. This action will be logged for
                audit purposes. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRecapture}>
                Proceed
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Capture Signature</CardTitle>
          </div>
          <CardDescription>
            Select a method to capture the customer's signature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Method selector */}
          <RadioGroup
            value={method}
            onValueChange={(v) => setMethod(v as SignatureMethod)}
            className="grid gap-3"
          >
            {/* External Signature Pad */}
            <Label
              htmlFor="method-webhid"
              className={cn(
                "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                method === "webhid_pad" && "border-primary bg-primary/5",
                !webhid.isSupported && "opacity-50 cursor-not-allowed"
              )}
            >
              <RadioGroupItem
                value="webhid_pad"
                id="method-webhid"
                disabled={!webhid.isSupported}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Usb className="h-4 w-4" />
                  <span className="font-medium">External Signature Pad</span>
                  <Badge variant="secondary" className="text-xs">
                    Desktop
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect a USB signature pad for professional-quality signatures
                </p>
                {!webhid.isSupported && (
                  <p className="text-xs text-destructive">
                    WebHID not supported. Use Chrome or Edge.
                  </p>
                )}
              </div>
            </Label>

            {/* On-Screen Signing */}
            <Label
              htmlFor="method-onscreen"
              className={cn(
                "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                method === "onscreen" && "border-primary bg-primary/5"
              )}
            >
              <RadioGroupItem value="onscreen" id="method-onscreen" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Tablet className="h-4 w-4" />
                  <span className="font-medium">Sign on Screen</span>
                  <Badge variant="secondary" className="text-xs">
                    iPad / Touch / Mouse
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Draw signature directly on screen using Apple Pencil, finger, or mouse
                </p>
              </div>
            </Label>
          </RadioGroup>

          {/* Action button */}
          {method === "webhid_pad" ? (
            webhid.isConnected ? (
              <div className="space-y-3">
                <Alert className="border-emerald-500/30 bg-emerald-500/5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                    Connected to {webhid.deviceName}
                  </AlertDescription>
                </Alert>
                <Button onClick={handleStartOnScreen} size="lg" className="w-full gap-2">
                  <PenLine className="h-4 w-4" />
                  Start Signing
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhid.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{webhid.error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  onClick={handleConnectPad}
                  disabled={webhid.isConnecting || disabled}
                  size="lg"
                  className="w-full gap-2"
                >
                  {webhid.isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Usb className="h-4 w-4" />
                      Connect Signature Pad
                    </>
                  )}
                </Button>
              </div>
            )
          ) : (
            <Button
              onClick={handleStartOnScreen}
              disabled={disabled}
              size="lg"
              className="w-full gap-2"
            >
              <PenLine className="h-4 w-4" />
              Start Signature
            </Button>
          )}

          {/* Fallback note */}
          {method === "webhid_pad" && !webhid.isSupported && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                Signature pad not available. Please{" "}
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => setMethod("onscreen")}
                >
                  sign on screen
                </button>{" "}
                instead.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Signature Canvas Dialog */}
      <Dialog open={showCanvas} onOpenChange={setShowCanvas}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sign Agreement</DialogTitle>
            <DialogDescription>
              {method === "webhid_pad" && webhid.isConnected
                ? `Draw your signature using the connected ${webhid.deviceName}`
                : "Draw your signature using your finger, Apple Pencil, or mouse"}
            </DialogDescription>
          </DialogHeader>

          <SignatureCanvas
            onSave={handleCanvasSave}
            disabled={isSaving}
            width={560}
            height={180}
          />

          {isSaving && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Saving signature...</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
