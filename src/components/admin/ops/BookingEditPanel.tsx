/**
 * BookingEditPanel - Contact details and notes only.
 *
 * Dates, duration, daily rate, location, vehicle, protection and extras all
 * live in ModifyRentalPanel ("Modify Rental") so every priced change goes
 * through the server-side reprice/extension path and gets recorded. Editing a
 * return date here used to skip the price preview, the customer's agreement and
 * the extension record — hence the split.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Lock, StickyNote, Loader2, User, Info } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BookingEditPanelProps {
  booking: {
    id: string;
    start_at: string;
    end_at: string;
    daily_rate: number;
    total_days: number;
    total_amount: number;
    subtotal: number;
    tax_amount: number | null;
    driver_age_band: string | null;
    protection_plan: string | null;
    young_driver_fee: number | null;
    status: string;
    location_id: string;
    locations?: { name: string } | null;
    notes?: string | null;
    special_instructions?: string | null;
    pickup_contact_name?: string | null;
    pickup_contact_phone?: string | null;
  };
}

export function BookingEditPanel({ booking }: BookingEditPanelProps) {
  const isEditable = !["completed", "cancelled"].includes(booking.status);

  const [contactName, setContactName] = useState(booking.pickup_contact_name || "");
  const [contactPhone, setContactPhone] = useState(booking.pickup_contact_phone || "");
  const [notes, setNotes] = useState(booking.notes || "");
  const [specialInstructions, setSpecialInstructions] = useState(booking.special_instructions || "");
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const hasChanges =
    contactName !== (booking.pickup_contact_name || "") ||
    contactPhone !== (booking.pickup_contact_phone || "") ||
    notes !== (booking.notes || "") ||
    specialInstructions !== (booking.special_instructions || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          pickup_contact_name: contactName || null,
          pickup_contact_phone: contactPhone || null,
          notes: notes || null,
          special_instructions: specialInstructions || null,
        })
        .eq("id", booking.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Contact details and notes saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditable) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Booking Details
            <Badge variant="outline" className="text-xs">Read-Only</Badge>
          </CardTitle>
          <CardDescription>
            Booking details cannot be edited after completion or cancellation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Pickup</span>
              <p className="font-medium">{format(new Date(booking.start_at), "MMM d, yyyy h:mm a")}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Return</span>
              <p className="font-medium">{format(new Date(booking.end_at), "MMM d, yyyy h:mm a")}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Duration</span>
              <p className="font-medium">{booking.total_days} day{booking.total_days !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Location</span>
              <p className="font-medium">{booking.locations?.name || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Total</span>
              <p className="font-semibold text-lg">${booking.total_amount.toFixed(2)} CAD</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Contact Details & Notes
        </CardTitle>
        <CardDescription>
          Non-financial details only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            To change dates, duration, rate, location, vehicle, protection or extras, use
            {" "}<strong>Modify Rental</strong> — it prices the change, updates the agreement and records it.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Pickup Contact
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-contact-name" className="text-xs text-muted-foreground">Contact Name</Label>
              <Input
                id="edit-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-contact-phone" className="text-xs text-muted-foreground">Contact Phone</Label>
              <Input
                id="edit-contact-phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (604) 763-4242"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <StickyNote className="w-4 h-4" />
            Notes & Instructions
          </h4>
          <div>
            <Label htmlFor="edit-notes" className="text-xs text-muted-foreground">Internal Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="Internal staff notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-instructions" className="text-xs text-muted-foreground">Special Instructions</Label>
            <Textarea
              id="edit-instructions"
              placeholder="Customer-facing special instructions..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <Button className="w-full" disabled={!hasChanges || saving} onClick={handleSave}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {saving ? "Saving..." : "Save Contact & Notes"}
        </Button>
      </CardContent>
    </Card>
  );
}
