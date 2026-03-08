/**
 * ForceCloseDialog - Admin panel to force-close overdue bookings
 * bypassing the standard ops return workflow.
 */
import { useState, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Upload, AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FUEL_LEVELS } from "@/lib/fuel-pricing";

interface ForceCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
  scheduledReturn: string; // ISO string
}

export function ForceCloseDialog({
  open,
  onOpenChange,
  bookingId,
  bookingCode,
  scheduledReturn,
}: ForceCloseDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [returnDate, setReturnDate] = useState(
    format(new Date(scheduledReturn), "yyyy-MM-dd")
  );
  const [returnTime, setReturnTime] = useState(
    format(new Date(scheduledReturn), "HH:mm")
  );
  const [fuelLevel, setFuelLevel] = useState<string>("");
  const [odometer, setOdometer] = useState("");
  const [adminNote, setAdminNote] = useState(
    "Manually closed by admin — return processed outside standard flow."
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!returnDate || !returnTime) {
      toast.error("Return date and time are required");
      return;
    }

    if (odometer && (isNaN(Number(odometer)) || Number(odometer) <= 0)) {
      toast.error("Odometer must be a positive number");
      return;
    }

    setSubmitting(true);

    try {
      // Upload closing image if provided
      let closingImageUrl: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `return/${bookingId}/closing-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("condition-photos")
          .upload(path, imageFile, { upsert: true });

        if (uploadError) {
          console.error("Image upload failed:", uploadError);
          toast.error("Failed to upload closing image");
          setSubmitting(false);
          return;
        }
        closingImageUrl = path;
      }

      // Build return timestamp
      const actualReturnAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();

      // Call edge function
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await supabase.functions.invoke("force-close-booking", {
        body: {
          bookingId,
          actualReturnAt,
          returnFuelLevel: fuelLevel ? Number(fuelLevel) : undefined,
          returnOdometer: odometer ? Number(odometer) : undefined,
          closingImageUrl,
          adminNote: adminNote || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to force-close booking");
      }

      toast.success(`Booking ${bookingCode} marked as closed.`);
      queryClient.invalidateQueries({ queryKey: ["booking"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["ops-booking"] });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Force close error:", err);
      toast.error(err.message || "Failed to close booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Force Close Booking
          </DialogTitle>
          <DialogDescription>
            Close booking <span className="font-mono font-semibold">{bookingCode}</span> without
            running the standard return workflow. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Return Date/Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fc-return-date">Return Date</Label>
              <Input
                id="fc-return-date"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-return-time">Return Time</Label>
              <Input
                id="fc-return-time"
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
              />
            </div>
          </div>

          {/* Fuel Level */}
          <div className="space-y-1.5">
            <Label>Fuel Level at Return</Label>
            <Select value={fuelLevel} onValueChange={setFuelLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select fuel level" />
              </SelectTrigger>
              <SelectContent>
                {FUEL_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={String(level.value)}>
                    {level.label} ({level.value}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Odometer */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-odometer">Odometer (km)</Label>
            <Input
              id="fc-odometer"
              type="number"
              placeholder="e.g. 46940"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>

          {/* Closing Image */}
          <div className="space-y-1.5">
            <Label>Closing Image</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Closing"
                  className="w-full h-40 object-cover rounded-md border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={clearImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-md p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Click to upload closing photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Admin Note */}
          <div className="space-y-1.5">
            <Label htmlFor="fc-note">Admin Note</Label>
            <Textarea
              id="fc-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              placeholder="Reason for force-closing..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Closing...
              </>
            ) : (
              "Force Close"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
