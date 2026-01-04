import { useState } from "react";
import { Loader2, AlertTriangle, Clock, Wrench, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateTicket } from "@/hooks/use-tickets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type IssueCategory = "general" | "late" | "breakdown";

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingCode: string;
}

const ISSUE_CATEGORIES = [
  {
    value: "general" as IssueCategory,
    label: "General Issue",
    description: "Questions, feedback, or minor issues",
    icon: MessageCircle,
    priority: "normal",
  },
  {
    value: "late" as IssueCategory,
    label: "Running Late",
    description: "Will return the vehicle later than scheduled",
    icon: Clock,
    priority: "high",
  },
  {
    value: "breakdown" as IssueCategory,
    label: "Breakdown / Emergency",
    description: "Vehicle issue, accident, or roadside emergency",
    icon: AlertTriangle,
    priority: "urgent",
  },
];

export function ReportIssueDialog({ 
  open, 
  onOpenChange, 
  bookingId, 
  bookingCode 
}: ReportIssueDialogProps) {
  const [category, setCategory] = useState<IssueCategory>("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const createTicket = useCreateTicket();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setSubmitting(true);
    const selectedCategory = ISSUE_CATEGORIES.find(c => c.value === category);
    const subject = `[${selectedCategory?.label}] Booking ${bookingCode}`;

    try {
      // Create the ticket
      await createTicket.mutateAsync({
        subject,
        message,
        bookingId,
      });

      // Create an alert for ops/admin
      const alertType = category === "breakdown" ? "emergency" : "customer_issue";
      const { error: alertError } = await supabase
        .from("admin_alerts")
        .insert({
          alert_type: alertType,
          title: `Customer Issue: ${selectedCategory?.label}`,
          message: `Booking ${bookingCode}: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`,
          booking_id: bookingId,
          status: "pending",
        });

      if (alertError) {
        console.error("Failed to create alert:", alertError);
      }

      // Log the event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          action: "customer_issue_reported",
          entity_type: "booking",
          entity_id: bookingId,
          user_id: user.id,
          new_data: { category, message: message.substring(0, 500) },
        });
      }

      toast.success("Issue reported successfully. Our team will contact you shortly.");
      setMessage("");
      setCategory("general");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to report issue:", error);
      toast.error("Failed to submit issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Report an Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Issue Category */}
          <div className="space-y-3">
            <Label>What type of issue are you experiencing?</Label>
            <RadioGroup value={category} onValueChange={(v) => setCategory(v as IssueCategory)}>
              {ISSUE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${category === cat.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                      }
                      ${cat.value === "breakdown" ? "border-destructive/30" : ""}
                    `}
                  >
                    <RadioGroupItem value={cat.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${cat.value === "breakdown" ? "text-destructive" : "text-muted-foreground"}`} />
                        <span className="font-medium">{cat.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cat.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Describe the issue</Label>
            <Textarea
              placeholder={
                category === "breakdown"
                  ? "Describe the emergency. Include your current location if needed..."
                  : category === "late"
                  ? "Let us know your estimated new return time..."
                  : "Describe your issue or question..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          {/* Emergency callout */}
          {category === "breakdown" && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
              <p className="text-sm text-destructive font-medium">
                For immediate roadside assistance:
              </p>
              <a 
                href="tel:+18005551234" 
                className="flex items-center gap-2 text-destructive font-bold text-lg hover:underline"
              >
                📞 +1 (800) 555-1234
              </a>
              <p className="text-xs text-destructive/80">Available 24/7</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className={category === "breakdown" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            {category === "breakdown" ? "Report Emergency" : "Submit Issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
